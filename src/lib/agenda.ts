// Pure agenda helpers ported from the original salon app.
export const INICIO = 7;
export const FIN = 20; // visible calendar hours

export type Estado = "pendiente" | "atendida" | "cancelada";
export type Miembro = { id: string; nombre: string; created_at: string };
export type Cita = {
  id: string;
  fecha: string;
  hora: string;
  miembro_id: string | null;
  clienta: string;
  servicio: string;
  valor: number;
  porcentaje: number;
  producto: number;
  estado: string;
  metodo_pago: string | null;
  ganancia: number | null;
};

export const ETQ: Record<string, string> = { atendida: "Atendida", cancelada: "Cancelada" };
export const PAGO: Record<string, string> = { sinpe: "SINPE", efectivo: "Efectivo", tarjeta: "Tarjeta" };

export const iso = (d: Date) => d.toLocaleDateString("en-CA");
export const hoy = () => iso(new Date());
export const hh = (m: number) =>
  String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
export const mins = (t: string) => {
  const [a = "0", b = "0"] = t.split(":");
  return +a * 60 + +b;
};
export const slotDe = (c: Pick<Cita, "hora">) =>
  Math.min(Math.max(Math.floor(mins(c.hora) / 30) * 30, INICIO * 60), FIN * 60 - 30);
export const fmt = (n: number) => n.toLocaleString("es", { maximumFractionDigits: 2 });

/** Ganancia = (valor - producto) * porcentaje / 100, rounded to 2 decimals. */
export const gan = (v: number, p: number, pr = 0) => Math.round((v - pr) * p) / 100;

export const SLOTS: number[] = [];
for (let m = INICIO * 60; m < FIN * 60; m += 30) SLOTS.push(m);

export type Modo = "dia" | "semana";

/** Week runs Monday to Sunday. */
export function rango(dia: string, modo: Modo) {
  if (modo === "dia") return { desde: dia, hasta: dia };
  const d = new Date(dia + "T00:00");
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const desde = iso(d);
  d.setDate(d.getDate() + 6);
  return { desde, hasta: iso(d) };
}

export function etiqueta(a: string, b: string, modo: Modo) {
  const A = new Date(a + "T00:00"),
    B = new Date(b + "T00:00");
  if (modo === "dia") return A.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" });
  const mes = (d: Date) => d.toLocaleDateString("es", { month: "long" });
  return (
    "Semana del " +
    A.getDate() +
    (A.getMonth() !== B.getMonth() ? " de " + mes(A) : "") +
    " al " +
    B.getDate() +
    " de " +
    mes(B)
  );
}

export function mover(dia: string, n: number, modo: Modo) {
  const d = new Date(dia + "T00:00");
  d.setDate(d.getDate() + n * (modo === "semana" ? 7 : 1));
  return iso(d);
}

/** Keeps only digits and one decimal point; comma becomes point. */
export function limpiarDecimal(raw: string) {
  let v = raw.replace(",", ".").replace(/[^\d.]/g, "");
  const p = v.split(".");
  if (p.length > 2) v = p[0] + "." + p.slice(1).join("");
  return v;
}
/** Integer 0..100. */
export function limpiarPorcentaje(raw: string) {
  let v = raw.replace(/\D/g, "").slice(0, 3);
  if (v !== "") v = String(Math.min(+v, 100));
  return v;
}
