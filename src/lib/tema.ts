/**
 * Temas del salón (puro, sin React): modo claro/oscuro × 4 paletas de color.
 * La paleta se aplica poniendo clases en <html> (ver styles.css):
 * - `oscuro` cambia los neutros a versión oscura.
 * - `tema-pinoverde` / `tema-lima` / `tema-celeste` cambian los acentos.
 * La paleta `coral` es la original y no necesita clase.
 */
export type ModoTema = "claro" | "oscuro";
export type ColorTema = "coral" | "pinoverde" | "lima" | "celeste";
export type Tema = { modo: ModoTema; color: ColorTema };

export type Paleta = {
  id: ColorTema;
  nombre: string;
  /** Colores para la píldora de la paleta. */
  swatches: string[];
};

export const PALETAS: Paleta[] = [
  {
    id: "coral",
    nombre: "Coral",
    swatches: ["oklch(0.63 0.22 5)", "oklch(0.72 0.17 35)", "oklch(0.82 0.13 80)", "oklch(0.975 0.012 30)"],
  },
  {
    id: "pinoverde",
    nombre: "Pino verde",
    swatches: ["oklch(0.56 0.13 155)", "oklch(0.68 0.13 145)", "oklch(0.8 0.12 110)", "oklch(0.975 0.015 150)"],
  },
  {
    id: "lima",
    nombre: "Lima",
    swatches: ["oklch(0.7 0.17 125)", "oklch(0.78 0.15 115)", "oklch(0.85 0.14 100)", "oklch(0.98 0.02 125)"],
  },
  {
    id: "celeste",
    nombre: "Celeste",
    swatches: ["oklch(0.65 0.13 235)", "oklch(0.72 0.11 250)", "oklch(0.8 0.1 210)", "oklch(0.975 0.015 235)"],
  },
];

const KEY = "salon-tema";

/** Lee el tema guardado en localStorage; cae al coral claro si no es válido. */
export function cargarTema(): Tema {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const t = JSON.parse(raw) as Tema;
      if (
        (t.modo === "claro" || t.modo === "oscuro") &&
        PALETAS.some((p) => p.id === t.color)
      ) {
        return t;
      }
    }
  } catch {
    // localStorage bloqueado o dato corrupto: usar el tema por defecto.
  }
  return { modo: "claro", color: "coral" };
}

/** Guarda el tema en localStorage (ignora errores silenciosamente). */
export function guardarTema(tema: Tema) {
  try {
    localStorage.setItem(KEY, JSON.stringify(tema));
  } catch {
    // Sin persistencia disponible; el tema vive solo en esta sesión.
  }
}

/** Clases que representan el tema en <html>. */
export function clasesDeTema(tema: Tema): string {
  const clases: string[] = [];
  if (tema.modo === "oscuro") clases.push("oscuro");
  if (tema.color !== "coral") clases.push(`tema-${tema.color}`);
  return clases.join(" ");
}
