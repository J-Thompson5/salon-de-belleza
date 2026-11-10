// Weekly metrics: same calculations as the Excel report, computed live from attended appointments.
import { PAGO, type Cita, type Miembro } from "./agenda";

export type MetodoKey = "sinpe" | "efectivo" | "tarjeta" | "";
export const METODOS: MetodoKey[] = ["sinpe", "efectivo", "tarjeta", ""];
export const etiquetaMetodo = (k: string) => PAGO[k] || "Sin definir";

const suma = (l: Cita[], campo: "valor" | "ganancia" | "producto") => l.reduce((x, c) => x + +(c[campo] ?? 0), 0);
const porMetodo = (l: Cita[], campo: "valor" | "ganancia") =>
  METODOS.map((k) => suma(l.filter((c) => (c.metodo_pago || "") === k), campo));

export function calcularMetricas(citas: Cita[], miembros: Miembro[], dias: string[]) {
  const at = citas.filter((c) => c.estado === "atendida");
  const totalValor = suma(at, "valor");
  const totalGanancia = suma(at, "ganancia");
  const totalProducto = suma(at, "producto");

  const metodos = METODOS.map((k) => {
    const l = at.filter((c) => (c.metodo_pago || "") === k);
    return { key: k, label: etiquetaMetodo(k), citas: l.length, valor: suma(l, "valor"), ganancia: suma(l, "ganancia") };
  }).filter((m) => m.key !== "" || m.citas > 0);

  const ids: (string | null)[] = [...miembros.map((m) => m.id), null];
  const estilistas = ids
    .map((id) => {
      const l = at.filter((c) => (c.miembro_id || null) === id);
      return {
        id,
        nombre: id ? (miembros.find((m) => m.id === id)?.nombre ?? "Sin asignar") : "Sin asignar",
        citas: l.length,
        valor: suma(l, "valor"),
        ganancia: suma(l, "ganancia"),
        valorPorMetodo: porMetodo(l, "valor"),
        gananciaPorMetodo: porMetodo(l, "ganancia"),
      };
    })
    .filter((e) => e.id !== null || e.citas > 0);

  const pcts = [...new Set(at.map((c) => +c.porcentaje || 0))].sort((a, b) => a - b);
  const porcentajes = pcts.map((pct) => {
    const l = at.filter((c) => (+c.porcentaje || 0) === pct);
    return { pct, gananciaPorMetodo: porMetodo(l, "ganancia"), total: suma(l, "ganancia") };
  });

  const porDia = dias.map((fecha) => {
    const l = at.filter((c) => c.fecha === fecha);
    return { fecha, valor: suma(l, "valor"), ganancia: suma(l, "ganancia"), citas: l.length };
  });

  return {
    atendidas: at.length,
    pendientes: citas.filter((c) => (c.estado || "pendiente") === "pendiente").length,
    canceladas: citas.filter((c) => c.estado === "cancelada").length,
    totalValor,
    totalGanancia,
    totalProducto,
    ticketPromedio: at.length ? totalValor / at.length : 0,
    metodos,
    estilistas,
    porcentajes,
    porDia,
  };
}
