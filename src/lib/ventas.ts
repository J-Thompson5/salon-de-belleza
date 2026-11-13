// Product sales: pure helpers shared by the ventas view, metrics and the Excel report.
import type { Miembro } from "./agenda";

export type Venta = {
  id: string;
  fecha: string;
  producto: string;
  marca: string;
  vendedor: string;
  valor: number;
  comision_pct: number;
  created_at: string;
};

export const MARCAS = ["Moroccanoil", "TEC ITALY", "Salerm", "Botu-cure"] as const;

/** Comisión = valor * porcentaje / 100, rounded to 2 decimals (same style as gan()). */
export const comision = (v: number, p: number) => Math.round(v * p) / 100;

export function resumenVentas(ventas: Venta[], miembros: Miembro[]) {
  const nombres = [...new Set(ventas.map((v) => v.vendedor).filter(Boolean))];
  // Keep the team's order first, then any seller not on the team.
  const orden = [
    ...miembros.map((m) => m.nombre).filter((n) => nombres.includes(n)),
    ...nombres.filter((n) => !miembros.some((m) => m.nombre === n)),
  ];
  return orden.map((nombre) => {
    const l = ventas.filter((v) => v.vendedor === nombre);
    return {
      vendedor: nombre,
      ventas: l.length,
      valor: l.reduce((x, v) => x + +v.valor, 0),
      comision: l.reduce((x, v) => x + comision(+v.valor, +v.comision_pct || 0), 0),
    };
  });
}
