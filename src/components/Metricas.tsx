import { fmt, type Cita, type Miembro } from "@/lib/agenda";
import { METODOS, calcularMetricas, etiquetaMetodo } from "@/lib/metricas";
import { resumenVentas, type Venta } from "@/lib/ventas";

const COLOR_METODO: Record<string, string> = {
  sinpe: "var(--staff-0)",
  efectivo: "var(--staff-3)",
  tarjeta: "var(--staff-4)",
  "": "var(--s-mute)",
};

export function Metricas({
  citas,
  ventas,
  miembros,
  dias,
  colorDe,
}: {
  citas: Cita[];
  ventas: Venta[];
  miembros: Miembro[];
  dias: string[];
  colorDe: (id: string | null) => string;
}) {
  const m = calcularMetricas(citas, miembros, dias);
  const metodosCols = METODOS.filter((k) => k !== "" || m.metodos.some((x) => x.key === ""));
  const maxDia = Math.max(1, ...m.porDia.map((d) => d.valor));
  const maxMet = Math.max(1, ...m.metodos.map((x) => x.valor));
  const sumCols = (rows: number[][]) => metodosCols.map((_, i) => rows.reduce((x, r) => x + (r[i] ?? 0), 0));
  const idx = (k: string) => METODOS.indexOf(k as never);

  const tabla = (titulo: string, campo: "valorPorMetodo" | "gananciaPorMetodo", delay: number) => {
    const rows = m.estilistas.map((e) => metodosCols.map((k) => e[campo][idx(k)] ?? 0));
    const tot = sumCols(rows);
    return (
      <div className="card" style={{ animationDelay: delay + "ms" }}>
        <h3>{titulo}</h3>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Estilista</th>
                {metodosCols.map((k) => (
                  <th key={k}>{etiquetaMetodo(k)}</th>
                ))}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {m.estilistas.map((e, i) => (
                <tr key={e.id ?? "none"}>
                  <td>
                    <span className="who">
                      <span className="sw" style={{ ["--c" as string]: colorDe(e.id) }} />
                      {e.nombre}
                    </span>
                  </td>
                  {rows[i]!.map((v, j) => (
                    <td key={j}>{fmt(v)}</td>
                  ))}
                  <td>
                    <b>{fmt(rows[i]!.reduce((x, v) => x + v, 0))}</b>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total general</td>
                {tot.map((v, j) => (
                  <td key={j}>{fmt(v)}</td>
                ))}
                <td>{fmt(tot.reduce((x, v) => x + v, 0))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  const pctRows = m.porcentajes.map((p) => metodosCols.map((k) => p.gananciaPorMetodo[idx(k)] ?? 0));
  const pctTot = sumCols(pctRows);

  const rv = resumenVentas(ventas, miembros);
  const totalVenta = rv.reduce((x, r) => x + r.valor, 0);
  const totalComVenta = rv.reduce((x, r) => x + r.comision, 0);
  const colorVendedor = (nombre: string) => {
    const i = miembros.findIndex((x) => x.nombre === nombre);
    return i < 0 ? "var(--s-mute)" : `var(--staff-${i % 6})`;
  };

  return (
    <>
      <div className="kpis">
        <div className="card kpi hero">
          <small>Valor cobrado</small>
          <strong>{fmt(m.totalValor)}</strong>
          <span className="hint">{m.atendidas} citas atendidas</span>
        </div>
        <div className="card kpi dark" style={{ animationDelay: "60ms" }}>
          <small>Ganancia</small>
          <strong>{fmt(m.totalGanancia)}</strong>
          <span className="hint">Producto descontado: {fmt(m.totalProducto)}</span>
        </div>
        <div className="card kpi" style={{ animationDelay: "120ms" }}>
          <small>Ticket promedio</small>
          <strong>{fmt(m.ticketPromedio)}</strong>
          <span className="hint">por cita atendida</span>
        </div>
        <div className="card kpi" style={{ animationDelay: "180ms" }}>
          <small>Agenda de la semana</small>
          <strong>{m.pendientes}</strong>
          <span className="hint">pendientes · {m.canceladas} canceladas</span>
        </div>
      </div>

      <div className="mgrid">
        <div className="card" style={{ animationDelay: "220ms" }}>
          <h3>Valor y ganancia por día</h3>
          <div className="bars">
            {m.porDia.map((d) => (
              <div key={d.fecha} className="bar-col" title={`Valor ${fmt(d.valor)} · Ganancia ${fmt(d.ganancia)}`}>
                <b>{d.valor ? fmt(d.valor) : ""}</b>
                <div className="bar-stack">
                  <div className="bar-v" style={{ height: (d.valor / maxDia) * 100 + "%" }}>
                    <div className="bar-g" style={{ height: d.valor ? (d.ganancia / d.valor) * 100 + "%" : 0 }} />
                  </div>
                </div>
                {new Date(d.fecha + "T00:00").toLocaleDateString("es", { weekday: "short" })}
              </div>
            ))}
          </div>
          <div className="dot-legend">
            <span style={{ ["--c" as string]: "var(--s-soft)" }}>Valor cobrado</span>
            <span style={{ ["--c" as string]: "var(--s-primary)" }}>Ganancia</span>
          </div>
        </div>
        <div className="card" style={{ animationDelay: "260ms" }}>
          <h3>Totales por método de pago</h3>
          <div className="meth">
            {m.metodos.map((x) => (
              <div key={x.key} className="meth-row">
                <div>
                  <span>
                    {x.label} <small style={{ color: "var(--s-mute)" }}>· {x.citas} citas</small>
                  </span>
                  <b>{fmt(x.valor)}</b>
                </div>
                <div className="track">
                  <i style={{ width: (x.valor / maxMet) * 100 + "%", ["--c" as string]: COLOR_METODO[x.key] }} />
                </div>
                <small style={{ color: "var(--s-mute)" }}>Ganancia {fmt(x.ganancia)}</small>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mgrid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {tabla("Valor cobrado por estilista y método", "valorPorMetodo", 300)}
        {tabla("Ganancia por estilista y método", "gananciaPorMetodo", 340)}
      </div>

      <div className="card" style={{ animationDelay: "380ms" }}>
        <h3>Ganancia por % de ganancia y método</h3>
        {m.porcentajes.length ? (
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>% Ganancia</th>
                  {metodosCols.map((k) => (
                    <th key={k}>{etiquetaMetodo(k)}</th>
                  ))}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {m.porcentajes.map((p, i) => (
                  <tr key={p.pct}>
                    <td>{p.pct}%</td>
                    {pctRows[i]!.map((v, j) => (
                      <td key={j}>{fmt(v)}</td>
                    ))}
                    <td>
                      <b>{fmt(p.total)}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total general</td>
                  {pctTot.map((v, j) => (
                    <td key={j}>{fmt(v)}</td>
                  ))}
                  <td>{fmt(pctTot.reduce((x, v) => x + v, 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <p className="empty">Aún no hay citas atendidas esta semana.</p>
        )}
      </div>
      <div className="card" style={{ animationDelay: "420ms" }}>
        <h3>Venta de productos</h3>
        {rv.length ? (
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Vendedor</th>
                  <th>Ventas</th>
                  <th>Valor vendido</th>
                  <th>Comisión</th>
                </tr>
              </thead>
              <tbody>
                {rv.map((r) => (
                  <tr key={r.vendedor}>
                    <td>
                      <span className="who">
                        <span className="sw" style={{ ["--c" as string]: colorVendedor(r.vendedor) }} />
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
                  <td>{fmt(totalVenta)}</td>
                  <td>{fmt(totalComVenta)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <p className="empty">Aún no hay ventas de producto esta semana.</p>
        )}
      </div>
    </>
  );
}
