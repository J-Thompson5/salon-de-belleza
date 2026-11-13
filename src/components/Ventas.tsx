import { useState, useEffect, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fmt, hoy, limpiarDecimal } from "@/lib/agenda";
import { MARCAS, comision, resumenVentas, type Venta } from "@/lib/ventas";
import type { Miembro } from "@/lib/agenda";

type Form = { fecha: string; producto: string; marca: string; vendedor: string; valor: string; pct: string };
const VACIO: Form = { fecha: hoy(), producto: "", marca: "Moroccanoil", vendedor: "", valor: "", pct: "" };

export function Ventas({
  ventas,
  miembros,
  desde,
  hasta,
  onCambiar,
}: {
  ventas: Venta[];
  miembros: Miembro[];
  desde: string;
  hasta: string;
  colorDe: (nombre: string) => string;
  onCambiar: () => void;
}) {
  const [f, setF] = useState<Form>(VACIO);
  const [msg, setMsg] = useState("");
  const [borrarVenta, setBorrarVenta] = useState<Venta | null>(null);

  useEffect(() => {
    if (!borrarVenta) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBorrarVenta(null);
    };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [borrarVenta]);

  const valorN = parseFloat(f.valor) || 0;
  const pctN = parseFloat(f.pct) || 0;
  const color = (nombre: string) => {
    const i = miembros.findIndex((m) => m.nombre === nombre);
    return i < 0 ? "var(--s-mute)" : `var(--staff-${i % 6})`;
  };
  const set = (k: keyof Form, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!f.valor) return setMsg("Escribe el valor del producto.");
    const { error } = await supabase.from("ventas_producto").insert({
      fecha: f.fecha,
      producto: f.producto.trim(),
      marca: f.marca,
      vendedor: f.vendedor,
      valor: valorN,
      comision_pct: pctN,
    });
    if (error) return setMsg("No se pudo guardar: " + error.message);
    setMsg("");
    setF({ ...VACIO, fecha: f.fecha, marca: f.marca, vendedor: f.vendedor });
    onCambiar();
  }

  async function borrar() {
    if (!borrarVenta) return;
    const { error } = await supabase.from("ventas_producto").delete().eq("id", borrarVenta.id);
    setBorrarVenta(null);
    if (error) return setMsg("No se pudo borrar: " + error.message);
    onCambiar();
  }

  const resumen = resumenVentas(ventas, miembros);
  const totalValor = resumen.reduce((x, r) => x + r.valor, 0);
  const totalCom = resumen.reduce((x, r) => x + r.comision, 0);
  const ordenadas = [...ventas].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));

  return (
    <>
      <div className="kpis">
        <div className="card kpi hero">
          <small>Vendido en productos</small>
          <strong>{fmt(totalValor)}</strong>
          <span className="hint">{ventas.length} ventas · {desde} al {hasta}</span>
        </div>
        <div className="card kpi dark" style={{ animationDelay: "60ms" }}>
          <small>Comisiones</small>
          <strong>{fmt(totalCom)}</strong>
          <span className="hint">a pagar por producto vendido</span>
        </div>
      </div>

      <form className="card" onSubmit={guardar}>
        <h3>Registrar venta de producto</h3>
        <div className="row">
          <div>
            <label htmlFor="vFecha">Fecha</label>
            <input id="vFecha" type="date" required value={f.fecha} onChange={(e) => set("fecha", e.target.value)} />
          </div>
          <div>
            <label htmlFor="vMarca">Marca</label>
            <select id="vMarca" value={f.marca} onChange={(e) => set("marca", e.target.value)}>
              {MARCAS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
        <label htmlFor="vProducto">Nombre del producto</label>
        <input id="vProducto" required value={f.producto} onChange={(e) => set("producto", e.target.value)} />
        <label htmlFor="vVendedor">Vendedor</label>
        <select id="vVendedor" required value={f.vendedor} onChange={(e) => set("vendedor", e.target.value)}>
          {!f.vendedor && <option value="">Elegir vendedor</option>}
          {miembros.map((m) => (
            <option key={m.id} value={m.nombre}>
              {m.nombre}
            </option>
          ))}
        </select>
        <div className="row">
          <div>
            <label htmlFor="vValor">Valor del producto</label>
            <input
              id="vValor"
              inputMode="decimal"
              required
              placeholder="0"
              value={f.valor}
              onChange={(e) => set("valor", limpiarDecimal(e.target.value))}
            />
          </div>
          <div>
            <label htmlFor="vPct">% de comisión</label>
            <input
              id="vPct"
              inputMode="decimal"
              placeholder="0"
              value={f.pct}
              onChange={(e) => set("pct", limpiarDecimal(e.target.value))}
            />
          </div>
        </div>
        {f.valor !== "" && (
          <p className="msg" style={{ color: "var(--s-primary)" }}>
            Comisión: {fmt(comision(valorN, pctN))}
          </p>
        )}
        <p className="msg" role="alert">
          {msg}
        </p>
        <button className="btn btn-primary">Guardar venta</button>
      </form>

      {resumen.length > 0 && (
        <div className="card" style={{ animationDelay: "120ms" }}>
          <h3>Ventas por miembro</h3>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Miembro</th>
                  <th>Ventas</th>
                  <th>Valor vendido</th>
                  <th>Comisión</th>
                </tr>
              </thead>
              <tbody>
                {resumen.map((r) => (
                  <tr key={r.vendedor}>
                    <td>
                      <span className="who">
                        <span className="sw" style={{ ["--c" as string]: color(r.vendedor) }} />
                        {r.vendedor}
                      </span>
                    </td>
                    <td>{r.ventas}</td>
                    <td>{fmt(r.valor)}</td>
                    <td>
                      <b>{fmt(r.comision)}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total general</td>
                  <td>{ventas.length}</td>
                  <td>{fmt(totalValor)}</td>
                  <td>{fmt(totalCom)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <div className="card" style={{ animationDelay: "160ms" }}>
        <h3>Ventas de la semana</h3>
        {ordenadas.length ? (
          <ul className="team-list">
            {ordenadas.map((v) => (
              <li key={v.id}>
                <span className="who">
                  <span className="sw" style={{ ["--c" as string]: color(v.vendedor) }} />
                  {v.vendedor}
                </span>
                <small className="venta-producto">{v.producto} · {v.marca} · {v.fecha}</small>
                <span className="venta-valor">{fmt(+v.valor)}</span>
                <button type="button" className="btn del" onClick={() => setBorrarVenta(v)}>
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty">Aún no hay ventas de producto esta semana.</p>
        )}
      </div>

      {borrarVenta && (
        <div className="modal-overlay" onClick={() => setBorrarVenta(null)} role="dialog" aria-modal="true" aria-labelledby="modal-borrar-venta-title">
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-hd">
              <div
                className="modal-icon"
                aria-hidden="true"
                style={{ background: "var(--s-badbg)", color: "var(--s-bad)" }}
              >
                ␡
              </div>
              <h3 id="modal-borrar-venta-title" className="modal-title">
                ¿Borrar esta venta?
              </h3>
            </div>
            <div className="modal-body">
              <p>
                Estás a punto de eliminar la venta de <strong>{borrarVenta.producto}</strong> ({borrarVenta.marca} · {borrarVenta.vendedor}).
              </p>
              <div className="modal-note">
                <strong>Importante:</strong> La venta dejará de contar en las métricas, los totales por vendedor y el reporte de la semana. Esta acción no se puede deshacer.
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setBorrarVenta(null)}>
                Volver
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: "var(--s-bad)" }}
                onClick={borrar}
              >
                Confirmar y borrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
