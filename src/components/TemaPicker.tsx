import { PALETAS, type ColorTema, type ModoTema, type Tema } from "@/lib/tema";

/**
 * Selector de tema: una fila "Colores" con las 4 paletas y una fila "Temas"
 * con Claro / Oscuro. La combinación color + modo se aplica al instante.
 */
export function TemaPicker({ tema, setTema }: { tema: Tema; setTema: (t: Tema) => void }) {
  const elegirColor = (color: ColorTema) => setTema({ ...tema, color });
  const elegirModo = (modo: ModoTema) => setTema({ ...tema, modo });

  return (
    <section className="card team" aria-label="Tema del salón">
      <h3>Tema</h3>
      <p className="tema-ayuda">Elige un color y un tema; todo el sistema cambia al instante.</p>

      <p className="side-label tema-label">Colores</p>
      <div className="tema-pills" role="group" aria-label="Paletas de color">
        {PALETAS.map((p) => {
          const activa = tema.color === p.id;
          return (
            <button
              key={p.id}
              type="button"
              className={"tema-pill" + (activa ? " on" : "")}
              aria-pressed={activa}
              onClick={() => elegirColor(p.id)}
            >
              <span className="sws" aria-hidden="true">
                {p.swatches.map((s, i) => (
                  <i key={i} style={{ background: s }} />
                ))}
              </span>
              {p.nombre}
            </button>
          );
        })}
      </div>

      <p className="side-label tema-label">Temas</p>
      <div className="tema-pills" role="group" aria-label="Modo del tema">
        {(
          [
            { id: "claro", nombre: "Claro", icono: "☀" },
            { id: "oscuro", nombre: "Oscuro", icono: "☾" },
          ] as { id: ModoTema; nombre: string; icono: string }[]
        ).map((m) => {
          const activa = tema.modo === m.id;
          return (
            <button
              key={m.id}
              type="button"
              className={"tema-pill" + (activa ? " on" : "")}
              aria-pressed={activa}
              onClick={() => elegirModo(m.id)}
            >
              <span className="tema-ico" aria-hidden="true">
                {m.icono}
              </span>
              {m.nombre}
            </button>
          );
        })}
      </div>
    </section>
  );
}
