import { describe, expect, it } from "vitest";
import { gan, rango, slotDe, limpiarPorcentaje } from "@/lib/agenda";

describe("agenda rules", () => {
  it("ganancia = (valor - producto) * % / 100", () => {
    expect(gan(10000, 40, 2000)).toBe(3200);
  });
  it("week runs Monday to Sunday", () => {
    expect(rango("2026-11-11", "semana")).toEqual({ desde: "2026-11-09", hasta: "2026-11-15" });
  });
  it("appointments outside 7:00-20:00 snap to edge slots", () => {
    expect(slotDe({ hora: "06:10" })).toBe(7 * 60);
    expect(slotDe({ hora: "21:00" })).toBe(19 * 60 + 30);
  });
  it("percentage capped at 100", () => {
    expect(limpiarPorcentaje("250")).toBe("100");
  });
});

import { calcularMetricas } from "@/lib/metricas";
describe("weekly metrics", () => {
  const base = { hora: "10:00", clienta: "", servicio: "x", porcentaje: 50, producto: 0 };
  const citas = [
    { ...base, id: "1", fecha: "2026-11-09", miembro_id: "a", valor: 100, estado: "atendida", metodo_pago: "sinpe", ganancia: 50 },
    { ...base, id: "2", fecha: "2026-11-10", miembro_id: "a", valor: 200, estado: "atendida", metodo_pago: "efectivo", ganancia: 100 },
    { ...base, id: "3", fecha: "2026-11-10", miembro_id: "a", valor: 999, estado: "pendiente", metodo_pago: null, ganancia: null },
  ];
  const m = calcularMetricas(citas, [{ id: "a", nombre: "Ana", created_at: "" }], ["2026-11-09", "2026-11-10"]);
  it("only attended appointments count", () => {
    expect(m.totalValor).toBe(300);
    expect(m.totalGanancia).toBe(150);
    expect(m.pendientes).toBe(1);
  });
  it("splits by payment method", () => {
    expect(m.metodos.find((x) => x.key === "sinpe")?.valor).toBe(100);
  });
});
