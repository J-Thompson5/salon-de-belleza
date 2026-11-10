// Excel report generator, ported 1:1 from the original salon app (browser only).
import { PAGO, type Cita, type Miembro, type Modo } from "./agenda";

const AZUL = "FF2563EB";
const TOTAL = "FFBFDBFE";
const SUB = "FFDBEAFE";

export async function descargarReporte(opts: {
  citas: Cita[];
  miembros: Miembro[];
  modo: Modo;
  desde: string;
  hasta: string;
}) {
  const { citas, miembros, modo, desde, hasta } = opts;
  const at = citas.filter((c) => c.estado === "atendida");
  if (!at.length) {
    alert("No hay citas atendidas en " + (modo === "semana" ? "esta semana." : "este día."));
    return;
  }
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pinta = (row: any, color: string, fuente: any) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    row.eachCell({ includeEmpty: true }, (c: any) => {
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
      c.font = fuente;
    });
  const head = { bold: true, color: { argb: "FFFFFFFF" } };
  const nombreDe = (id: string | null) =>
    id ? (miembros.find((m) => m.id === id)?.nombre ?? "Sin asignar") : "Sin asignar";

  // Sheet 1: payment summary
  const wR = wb.addWorksheet("Resumen de Pagos");
  wR.columns = [{ width: 24 }, { width: 14 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }];
  wR.addRow([
    modo === "semana"
      ? "Resumen por método de pago: " + desde + " al " + hasta
      : "Resumen por método de pago: " + desde,
  ]).font = { bold: true, size: 14 };
  wR.addRow([]);
  wR.addRow(["1. TOTALES GENERALES POR MÉTODO DE PAGO"]).font = { bold: true, size: 12 };
  pinta(wR.addRow(["Método de pago", "Citas", "Valor cobrado", "Ganancia"]), AZUL, head);
  let nc = 0,
    nv = 0,
    ng = 0;
  const metodos = ["sinpe", "efectivo", "tarjeta"].concat(at.some((c) => !c.metodo_pago) ? [""] : []);
  metodos.forEach((k) => {
    const l = at.filter((c) => (c.metodo_pago || "") === k);
    if (!l.length && k === "") return;
    const v = l.reduce((x, c) => x + +c.valor, 0),
      g = l.reduce((x, c) => x + +(c.ganancia ?? 0), 0);
    wR.addRow([PAGO[k] || "Sin definir", l.length, v, g]);
    nc += l.length;
    nv += v;
    ng += g;
  });
  pinta(wR.addRow(["TOTAL GENERAL", nc, nv, ng]), TOTAL, { bold: true });

  const bloque = (subtitulo: string, campo: "valor" | "ganancia") => {
    wR.addRow([]);
    wR.addRow([subtitulo]).font = { bold: true, size: 12 };
    pinta(wR.addRow(["Estilista", ...metodos.map((k) => PAGO[k] || "Sin definir"), "Total"]), AZUL, head);
    const tot = metodos.map(() => 0);
    [...miembros.map((m) => m.id as string | null), null].forEach((id) => {
      const l = at.filter((c) => (c.miembro_id || null) === id);
      if (!l.length && id === null) return;
      const fila = metodos.map((k) =>
        l.filter((c) => (c.metodo_pago || "") === k).reduce((x, c) => x + +(c[campo] ?? 0), 0),
      );
      fila.forEach((v, i) => {
        tot[i] = (tot[i] ?? 0) + v;
      });
      wR.addRow([nombreDe(id), ...fila, fila.reduce((x, v) => x + v, 0)]);
    });
    pinta(wR.addRow(["TOTAL GENERAL", ...tot, tot.reduce((x, v) => x + v, 0)]), TOTAL, { bold: true });
  };
  bloque("2. VALOR TOTAL COBRADO POR ESTILISTA Y MÉTODO DE PAGO", "valor");
  bloque("3. GANANCIA POR ESTILISTA Y MÉTODO DE PAGO", "ganancia");

  wR.addRow([]);
  wR.addRow(["4. GANANCIA POR % DE GANANCIA Y MÉTODO DE PAGO"]).font = { bold: true, size: 12 };
  pinta(wR.addRow(["% Ganancia", ...metodos.map((k) => PAGO[k] || "Sin definir"), "Total"]), AZUL, head);
  const porcentajes = [...new Set(at.map((c) => +c.porcentaje || 0))].sort((a, b) => a - b);
  const totPorc = metodos.map(() => 0);
  porcentajes.forEach((pct) => {
    const l = at.filter((c) => (+c.porcentaje || 0) === pct);
    const fila = metodos.map((k) =>
      l.filter((c) => (c.metodo_pago || "") === k).reduce((x, c) => x + +(c.ganancia ?? 0), 0),
    );
    fila.forEach((v, i) => {
      totPorc[i] = (totPorc[i] ?? 0) + v;
    });
    wR.addRow([pct + "%", ...fila, fila.reduce((x, v) => x + v, 0)]);
  });
  pinta(wR.addRow(["TOTAL GENERAL", ...totPorc, totPorc.reduce((x, v) => x + v, 0)]), TOTAL, { bold: true });
  wR.eachRow((r, i) => {
    if (i > 3)
      r.eachCell((c, ci) => {
        if (typeof c.value === "number") c.numFmt = ci === 2 && i <= 3 + metodos.length + 2 ? "#,##0" : "#,##0.00";
      });
  });

  // Sheet 2: detail
  const ws = wb.addWorksheet("Detalle de Citas");
  ws.columns = [{ width: 22 }, { width: 12 }, { width: 8 }, { width: 24 }, { width: 24 }, { width: 18 }, { width: 12 }, { width: 14 }, { width: 14 }, { width: 16 }];
  ws.addRow([modo === "semana" ? "Detalle semanal: " + desde + " al " + hasta : "Detalle del día: " + desde]).font = {
    bold: true,
    size: 14,
  };
  ws.addRow([]);
  pinta(
    ws.addRow(["Estilista", "Fecha", "Hora", "Persona atendida", "Servicio", "Valor del servicio", "% ganancia", "Producto", "Ganancia", "Método de pago"]),
    AZUL,
    head,
  );
  ws.views = [{ state: "frozen", ySplit: 3 }];
  let tv = 0,
    tp = 0,
    tg = 0;
  [...miembros.map((m) => m.id as string | null), null].forEach((id) => {
    const l = at.filter((c) => (c.miembro_id || null) === id);
    if (!l.length) return;
    const nombre = nombreDe(id);
    let sv = 0,
      sp = 0,
      sg = 0;
    l.forEach((c) => {
      sv += +c.valor;
      sp += +c.producto;
      sg += +(c.ganancia ?? 0);
      ws.addRow([nombre, c.fecha, c.hora.slice(0, 5), c.clienta || "Sin nombre", c.servicio, +c.valor, +c.porcentaje, +c.producto, +(c.ganancia ?? 0), PAGO[c.metodo_pago ?? ""] || ""]);
    });
    pinta(ws.addRow(["Total " + nombre, "", "", "", "", sv, "", sp, sg, ""]), SUB, { bold: true });
    tv += sv;
    tp += sp;
    tg += sg;
  });
  pinta(ws.addRow(["TOTAL GENERAL", "", "", "", "", tv, "", tp, tg, ""]), TOTAL, { bold: true });
  ws.eachRow((r, i) => {
    if (i > 3) [6, 8, 9].forEach((n) => (r.getCell(n).numFmt = "#,##0.00"));
  });

  const buf = await wb.xlsx.writeBuffer();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
  );
  a.download = (modo === "semana" ? "reporte-semana-" : "reporte-") + desde + ".xlsx";
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
