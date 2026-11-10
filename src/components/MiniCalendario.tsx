import { useEffect, useState } from "react";
import { hoy, iso, rango, type Modo } from "@/lib/agenda";

const WD = ["L", "M", "M", "J", "V", "S", "D"];

export function MiniCalendario({ dia, modo, onPick }: { dia: string; modo: Modo; onPick: (d: string) => void }) {
  const [mes, setMes] = useState(dia.slice(0, 7));
  useEffect(() => setMes(dia.slice(0, 7)), [dia]);

  const first = new Date(mes + "-01T00:00");
  const start = new Date(first);
  start.setDate(1 - ((first.getDay() + 6) % 7));
  const celdas: string[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    celdas.push(iso(d));
  }
  const { desde, hasta } = rango(dia, "semana");
  const shift = (n: number) => {
    const d = new Date(first);
    d.setMonth(d.getMonth() + n);
    setMes(iso(d).slice(0, 7));
  };
  const t = hoy();

  return (
    <div className="mini">
      <div className="mini-hd">
        <button type="button" aria-label="Mes anterior" onClick={() => shift(-1)}>‹</button>
        <span>{first.toLocaleDateString("es", { month: "long", year: "numeric" })}</span>
        <button type="button" aria-label="Mes siguiente" onClick={() => shift(1)}>›</button>
      </div>
      <div className="mini-grid">
        {WD.map((w, i) => (
          <span key={i} className="wd">{w}</span>
        ))}
        {celdas.map((c) => {
          const cls = [
            c.slice(0, 7) !== mes && "out",
            modo === "semana" && c >= desde && c <= hasta && "wk",
            c === t && "today",
            c === dia && "sel",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button key={c} type="button" className={cls} onClick={() => onPick(c)} aria-label={c}>
              {+c.slice(8)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
