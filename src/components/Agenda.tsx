import { useCallback, useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ETQ,
  SLOTS,
  etiqueta,
  fmt,
  gan,
  hh,
  hoy,
  iso,
  limpiarDecimal,
  limpiarPorcentaje,
  mover,
  rango,
  slotDe,
  type Cita,
  type Miembro,
  type Modo,
} from "@/lib/agenda";
import { descargarReporte } from "@/lib/reporte";
import { MiniCalendario } from "./MiniCalendario";
import { Metricas } from "./Metricas";

type Form = {
  fecha: string;
  hora: string;
  miembro: string;
  clienta: string;
  servicio: string;
  valor: string;
  desc: string;
  producto: string;
  pago: string;
  estado: string;
};
const VACIO: Form = {
  fecha: "",
  hora: "",
  miembro: "",
  clienta: "",
  servicio: "",
  valor: "",
  desc: "0",
  producto: "",
  pago: "",
  estado: "pendiente",
};

export function Agenda({ onLogout }: { onLogout: () => void }) {
  const [vista, setVista] = useState<"agenda" | "metricas" | "config">("agenda")
  const [menu, setMenu] = useState(false);
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [dia, setDia] = useState(hoy());
  const [modo, setModo] = useState<Modo>("dia");
  const [aviso, setAviso] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [soloPago, setSoloPago] = useState(false);
  const [puedeBorrar, setPuedeBorrar] = useState(false);
  const [f, setF] = useState<Form>(VACIO);
  const [pmsg, setPmsg] = useState("");
  const [cmsg, setCmsg] = useState("");
  const [nuevo, setNuevo] = useState("");
  const [confirmarAtendida, setConfirmarAtendida] = useState(false);

  const { desde, hasta } = rango(dia, vista === "metricas" ? "semana" : modo);
  const colorDe = (id: string | null) => {
    const i = miembros.findIndex((m) => m.id === id);
    return i < 0 ? "var(--s-mute)" : `var(--staff-${i % 6})`;
  };

  const cargarMiembros = useCallback(async () => {
    const { data, error } = await supabase.from("miembros").select("*").order("created_at");
    if (error) return setAviso("No se pudieron cargar los miembros.");
    setMiembros(data as Miembro[]);
  }, []);
  const cargarCitas = useCallback(async () => {
    const { data, error } = await supabase
      .from("citas")
      .select("*")
      .gte("fecha", desde)
      .lte("fecha", hasta)
      .order("fecha")
      .order("hora");
    if (error) return setAviso("No se pudieron cargar las citas.");
    setAviso("");
    setCitas(data as Cita[]);
  }, [desde, hasta]);

  useEffect(() => {
    cargarMiembros();
  }, [cargarMiembros]);
  useEffect(() => {
    cargarCitas();
  }, [cargarCitas]);
  // Live updates: refetch whenever appointments or team change anywhere.
  useEffect(() => {
    const ch = supabase
      .channel("salon-" + Math.random().toString(36).slice(2))
      .on("postgres_changes", { event: "*", schema: "public", table: "citas" }, () => cargarCitas())
      .on("postgres_changes", { event: "*", schema: "public", table: "miembros" }, () => cargarMiembros())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [cargarCitas, cargarMiembros]);
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 800);
    return () => clearTimeout(t);
  }, [flash, citas]);

  const cerrar = () => {
    setConfirmarAtendida(false);
    setAbierto(false);
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (confirmarAtendida) setConfirmarAtendida(false);
        else cerrar();
      }
    };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [confirmarAtendida]);
  useEffect(() => {
    document.body.style.overflow = abierto ? "hidden" : "";
  }, [abierto]);

  const irA = (d: string) => {
    cerrar();
    setDia(d);
  };
  const cambiarModo = (m: Modo) => {
    cerrar();
    setModo(m);
  };

  function abrir(hora: string, miembroId: string, fecha?: string) {
    setF({ ...VACIO, fecha: fecha || dia, hora, miembro: miembroId });
    setEditId(null);
    setSoloPago(false);
    setPuedeBorrar(false);
    setPmsg("");
    setAbierto(true);
  }
  function ver(c: Cita) {
    setF({
      fecha: c.fecha,
      hora: c.hora.slice(0, 5),
      miembro: c.miembro_id || "",
      clienta: c.clienta,
      servicio: c.servicio,
      valor: String(c.valor),
      desc: String(c.porcentaje),
      producto: c.producto ? String(c.producto) : "",
      pago: c.metodo_pago || "",
      estado: c.estado || "pendiente",
    });
    setEditId(c.id);
    setPuedeBorrar(c.estado !== "atendida");
    setSoloPago(c.estado === "atendida");
    setPmsg("");
    setAbierto(true);
  }

  const valorN = parseFloat(f.valor) || 0;
  const prodN = parseFloat(f.producto) || 0;
  const pctN = parseInt(f.desc, 10) || 0;
  const productoMal = prodN > valorN;
  const total = f.estado === "atendida" ? fmt(gan(valorN, pctN, prodN)) : "—";
  const set = (k: keyof Form, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function ejecutarGuardado(est: string) {
    const row = {
      fecha: f.fecha,
      hora: f.hora,
      miembro_id: f.miembro || null,
      clienta: f.clienta.trim(),
      servicio: f.servicio.trim(),
      valor: valorN,
      porcentaje: pctN,
      producto: prodN,
      estado: est,
      metodo_pago: f.pago || null,
      ganancia: est === "atendida" ? gan(valorN, pctN, prodN) : null,
    };
    const { error } = editId
      ? await supabase.from("citas").update(row).eq("id", editId)
      : await supabase.from("citas").insert(row);
    if (error) return setPmsg("No se pudo guardar: " + error.message);
    setConfirmarAtendida(false);
    cerrar();
    if (est !== "pendiente") setFlash(editId);
    if (row.fecha !== dia) setDia(row.fecha);
    else cargarCitas();
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const est = f.estado;
    if (est === "borrar") {
      if (!confirm("¿Borrar esta cita?")) return;
      const { error } = await supabase.from("citas").delete().eq("id", editId!);
      if (error) return setPmsg("No se pudo borrar: " + error.message);
      cerrar();
      return cargarCitas();
    }
    if (soloPago) {
      const { error } = await supabase.from("citas").update({ metodo_pago: f.pago || null }).eq("id", editId!);
      if (error) return setPmsg("No se pudo guardar: " + error.message);
      cerrar();
      return cargarCitas();
    }
    if (productoMal) return;
    if (est === "atendida") {
      setConfirmarAtendida(true);
      return;
    }
    await ejecutarGuardado(est);
  }

  async function agregarMiembro(e: FormEvent) {
    e.preventDefault();
    const n = nuevo.trim();
    if (!n) return;
    const { error } = await supabase.from("miembros").insert({ nombre: n });
    if (error) return setCmsg("No se pudo añadir: " + error.message);
    setCmsg("");
    setNuevo("");
    cargarMiembros();
  }
  async function borrarMiembro(m: Miembro) {
    if (!confirm("¿Eliminar a " + m.nombre + '? Sus citas quedarán como "Sin asignar".')) return;
    const { error } = await supabase.from("miembros").delete().eq("id", m.id);
    if (error) return setCmsg("No se pudo eliminar: " + error.message);
    setCmsg("");
    await cargarMiembros();
    await cargarCitas();
  }

  async function reporte() {
    try {
      await descargarReporte({ citas, miembros, modo, desde, hasta });
    } catch (err) {
      console.error(err);
      alert("Error al generar el reporte: " + (err as Error).message);
    }
  }

  const evBtn = (x: Cita, sub: string) => (
    <button
      key={x.id}
      type="button"
      className={"ev " + (x.estado || "") + (x.id === flash ? " pop" : "")}
      style={{ ["--c" as string]: colorDe(x.miembro_id) }}
      onClick={() => ver(x)}
    >
      <b>
        {x.clienta || "Sin nombre"}
        {ETQ[x.estado] && <span className="tag">{ETQ[x.estado]}</span>}
      </b>
      <span>
        {x.hora.slice(0, 5)} · {sub}
      </span>
    </button>
  );

  function calendario() {
    if (aviso) return <p className="empty">{aviso}</p>;
    if (!miembros.length)
      return <p className="empty">Agrega al menos un miembro en Equipo para ver el calendario.</p>;
    if (modo === "dia") {
      const cols: { id: string | null; nombre: string }[] = miembros.map((m) => ({ id: m.id, nombre: m.nombre }));
      if (citas.some((c) => !c.miembro_id)) cols.push({ id: null, nombre: "Sin asignar" });
      return (
        <div className="grid" style={{ gridTemplateColumns: `56px repeat(${cols.length},minmax(150px,1fr))` }}>
          <div className="hd corner" />
          {cols.map((c) => (
            <div key={c.id ?? "none"} className="hd">
              <span className="av" style={{ ["--c" as string]: colorDe(c.id) }}>
                {c.nombre.charAt(0).toUpperCase()}
              </span>
              {c.nombre}
            </div>
          ))}
          {SLOTS.map((s) => {
            const hr = s % 60 === 0 ? " hr" : "";
            return [
              <div key={"t" + s} className={"time" + hr}>
                {hr ? hh(s) : ""}
              </div>,
              ...cols.map((c) => {
                const items = citas.filter((x) => (x.miembro_id || null) === c.id && slotDe(x) === s);
                return (
                  <div key={s + "-" + c.id} className={"cell" + hr}>
                    {items.map((x) => evBtn(x, x.servicio))}
                    {c.id && items.every((x) => x.estado === "cancelada") && (
                      <button
                        type="button"
                        className={"add" + (items.length ? " mas" : "")}
                        aria-label={"Agendar a las " + hh(s) + " con " + c.nombre}
                        onClick={() => abrir(hh(s), c.id!)}
                      >
                      </button>
                    )}
                  </div>
                );
              }),
            ];
          })}
        </div>
      );
    }
    const dias: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(desde + "T00:00");
      d.setDate(d.getDate() + i);
      dias.push(iso(d));
    }
    const nom = (id: string | null) => miembros.find((x) => x.id === id)?.nombre ?? "Sin asignar";
    return (
      <div className="grid" style={{ gridTemplateColumns: "56px repeat(7,minmax(130px,1fr))" }}>
        <div className="hd corner" />
        {dias.map((d) => (
          <div key={d} className={"hd" + (d === hoy() ? " hoy" : "")}>
            <button
              type="button"
              className="dia"
              onClick={() => {
                setDia(d);
                cambiarModo("dia");
              }}
            >
              {new Date(d + "T00:00").toLocaleDateString("es", { weekday: "short", day: "numeric" })}
            </button>
          </div>
        ))}
        {SLOTS.map((s) => {
          const hr = s % 60 === 0 ? " hr" : "";
          return [
            <div key={"t" + s} className={"time" + hr}>
              {hr ? hh(s) : ""}
            </div>,
            ...dias.map((d) => {
              const items = citas.filter((x) => x.fecha === d && slotDe(x) === s);
              return (
                <div key={s + d} className={"cell" + hr}>
                  {items.map((x) => evBtn(x, nom(x.miembro_id)))}
                  <button
                    type="button"
                    className={"add" + (items.length ? " mas" : "")}
                    aria-label={"Agendar el " + d + " a las " + hh(s)}
                    onClick={() => abrir(hh(s), miembros[0]!.id, d)}
                  >
                  </button>
                </div>
              );
            }),
          ];
        })}
      </div>
    );
  }

  const guardarTxt = f.estado === "borrar" ? "Borrar cita" : soloPago ? "Guardar método de pago" : "Guardar cita";

  const ir = (v: typeof vista) => {
    cerrar();
    setMenu(false);
    setVista(v);
  };
  const titulo =
    vista === "config" ? "Equipo" : etiqueta(desde, hasta, vista === "metricas" ? "semana" : modo);

  return (
    <>
      <div className="shell">
        <aside className={"side" + (menu ? " open" : "")}>
          <div className="brand">
            <span className="brand-dot">✦</span> Salón
          </div>
          <nav className="side-nav">
            <button type="button" className={vista === "agenda" ? "on" : ""} onClick={() => ir("agenda")}>
              ◷ Agenda
            </button>
            <button type="button" className={vista === "metricas" ? "on" : ""} onClick={() => ir("metricas")}>
              ◔ Métricas
            </button>
            <button type="button" className={vista === "config" ? "on" : ""} onClick={() => ir("config")}>
              ✿ Equipo
            </button>
          </nav>
          {vista !== "config" && (
            <div>
              <p className="side-label">Calendario</p>
              <MiniCalendario
                dia={dia}
                modo={vista === "metricas" ? "semana" : modo}
                onPick={(d) => {
                  irA(d);
                  setMenu(false);
                }}
              />
            </div>
          )}
          {miembros.length > 0 && (
            <div className="legend">
              <p className="side-label">Equipo</p>
              <ul>
                {miembros.map((m) => (
                  <li key={m.id}>
                    <span className="sw" style={{ ["--c" as string]: colorDe(m.id) }} />
                    {m.nombre}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="side-foot side-nav">
            <button type="button" onClick={onLogout}>
              ⎋ Salir
            </button>
          </div>
        </aside>

        <section className="content">
          <div className="topbar" key={vista}>
            <button type="button" className="icon-btn menu-btn" aria-label="Abrir menú" onClick={() => setMenu(true)}>
              ☰
            </button>
            <h1>
              <span className="eyebrow">
                {vista === "agenda" ? "Agenda de citas" : vista === "metricas" ? "Métricas semanales" : "Configuración"}
              </span>
              {titulo}
            </h1>
            {vista !== "config" && (
              <>
                <button type="button" className="icon-btn" aria-label="Anterior" onClick={() => irA(mover(dia, -1, vista === "metricas" ? "semana" : modo))}>
                  ‹
                </button>
                <button type="button" className="icon-btn" aria-label="Siguiente" onClick={() => irA(mover(dia, 1, vista === "metricas" ? "semana" : modo))}>
                  ›
                </button>
              </>
            )}
            {vista === "metricas" && <span className="live">En vivo</span>}
            {vista === "agenda" && (
              <button type="button" className="btn btn-primary" onClick={reporte}>
                ⤓ {modo === "semana" ? "Reporte de la semana" : "Reporte del día"}
              </button>
            )}
          </div>

          {vista === "agenda" && <div className="calwrap">{calendario()}</div>}
          {vista === "metricas" && (
            <Metricas citas={citas} miembros={miembros} dias={semanaDias(desde)} colorDe={colorDe} />
          )}
          {vista === "config" && (
            <form className="card team" onSubmit={agregarMiembro}>
              <h3>Miembros del equipo</h3>
              <div className="inline-form">
                <div style={{ flex: 1 }}>
                  <label htmlFor="nuevoMiembro">Nombre</label>
                  <input id="nuevoMiembro" required value={nuevo} onChange={(e) => setNuevo(e.target.value)} />
                </div>
                <button className="btn btn-primary">Añadir</button>
              </div>
              <p className="msg" role="alert">
                {cmsg}
              </p>
              <ul className="team-list">
                {miembros.map((m) => (
                  <li key={m.id}>
                    <span className="sw" style={{ ["--c" as string]: colorDe(m.id) }} />
                    <span>{m.nombre}</span>
                    <button type="button" className="btn del" onClick={() => borrarMiembro(m)}>
                      Eliminar
                    </button>
                  </li>
                ))}
              </ul>
            </form>
          )}
        </section>
      </div>

      {vista === "agenda" && (
        <div className="fab" role="toolbar" aria-label="Vista del calendario">
          <button type="button" className={modo === "dia" ? "on" : ""} onClick={() => cambiarModo("dia")}>
            Día
          </button>
          <button type="button" className={modo === "semana" ? "on" : ""} onClick={() => cambiarModo("semana")}>
            Semana
          </button>
          <span className="sep" />
          <button type="button" onClick={() => irA(hoy())}>
            Hoy
          </button>
        </div>
      )}
      <div className={"velo" + (abierto || menu ? " open" : "")} onClick={() => { cerrar(); setMenu(false); }} />
      <form className={"panel" + (abierto ? " open" : "")} onSubmit={guardar} aria-hidden={!abierto}>
        <div className="top">
          <h2>{editId ? "Cita" : "Nueva cita"}</h2>
          <button type="button" className="icon-btn" onClick={cerrar} aria-label="Cerrar panel">
            ✕
          </button>
        </div>
        <div className="body">
          <fieldset>
            <div className="row">
              <div>
                <label htmlFor="fecha">Fecha</label>
                <input id="fecha" type="date" required disabled={soloPago} value={f.fecha} onChange={(e) => set("fecha", e.target.value)} />
              </div>
              <div>
                <label htmlFor="hora">Hora</label>
                <input id="hora" type="time" required disabled={soloPago} value={f.hora} onChange={(e) => set("hora", e.target.value)} />
              </div>
            </div>
            <label htmlFor="miembro">Quién atiende</label>
            <select id="miembro" disabled={soloPago} value={f.miembro} onChange={(e) => set("miembro", e.target.value)}>
              {!f.miembro && <option value="">Sin asignar</option>}
              {miembros.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
            <label htmlFor="clienta">Persona a atender (opcional)</label>
            <input id="clienta" disabled={soloPago} value={f.clienta} onChange={(e) => set("clienta", e.target.value)} />
            <label htmlFor="servicio">Servicio</label>
            <input id="servicio" required disabled={soloPago} value={f.servicio} onChange={(e) => set("servicio", e.target.value)} />
            <div className="row">
              <div>
                <label htmlFor="valor">Valor del servicio</label>
                <input id="valor" inputMode="decimal" autoComplete="off" required disabled={soloPago} value={f.valor} onChange={(e) => set("valor", limpiarDecimal(e.target.value))} />
              </div>
              <div>
                <label htmlFor="desc">Porcentaje de ganancia (0 a 100 %)</label>
                <input id="desc" inputMode="numeric" autoComplete="off" disabled={soloPago} value={f.desc} onChange={(e) => set("desc", limpiarPorcentaje(e.target.value))} />
              </div>
            </div>
            <label htmlFor="producto">Producto (opcional, se resta a la ganancia)</label>
            <input id="producto" inputMode="decimal" autoComplete="off" placeholder="0" disabled={soloPago} value={f.producto} onChange={(e) => set("producto", limpiarDecimal(e.target.value))} />
            <label htmlFor="pago">Método de pago</label>
            <select id="pago" required={f.estado === "atendida"} value={f.pago} onChange={(e) => set("pago", e.target.value)}>
              <option value="">Sin definir</option>
              <option value="sinpe">SINPE</option>
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
            </select>
            <label htmlFor="estado">Estado</label>
            <select id="estado" disabled={soloPago} value={f.estado} onChange={(e) => set("estado", e.target.value)}>
              <option value="pendiente">Pendiente</option>
              <option value="atendida">Atendida</option>
              <option value="cancelada">Cancelada</option>
              {puedeBorrar && <option value="borrar">Borrar</option>}
            </select>
          </fieldset>
          <p className="msg" role="alert">
            {productoMal ? "El producto no puede ser mayor que el valor del servicio." : pmsg}
          </p>
        </div>
        <div className="foot">
          <div>
            <small>Ganancia</small>
            <strong>{total}</strong>
          </div>
          <button className="btn btn-primary">{guardarTxt}</button>
        </div>
      </form>

      {confirmarAtendida && (
        <div className="modal-overlay" onClick={() => setConfirmarAtendida(false)} role="dialog" aria-modal="true" aria-labelledby="modal-atendida-title">
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-hd">
              <div className="modal-icon" aria-hidden="true">✓</div>
              <h3 id="modal-atendida-title" className="modal-title">¿Marcar cita como atendida?</h3>
            </div>
            <div className="modal-body">
              <p>
                Estás a punto de completar la cita de {f.clienta ? <strong>{f.clienta}</strong> : "esta clienta"} ({f.servicio}).
              </p>
              <div className="modal-note">
                <strong>Importante:</strong> Una vez marcada como atendida solo podrás actualizar el método de pago; no podrás modificar otros datos ni eliminar la cita.
              </div>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn"
                onClick={() => setConfirmarAtendida(false)}
              >
                Volver
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => ejecutarGuardado("atendida")}
              >
                Confirmar y guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function semanaDias(desde: string) {
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(desde + "T00:00");
    d.setDate(d.getDate() + i);
    out.push(iso(d));
  }
  return out;
}
