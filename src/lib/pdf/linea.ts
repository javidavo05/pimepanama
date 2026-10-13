/**
 * Línea de marca de un PDF. Sale de la categoría del cliente (Client.brandLine), nunca del gusto del
 * documento: todo lo que recibe un cliente premium va en negro y oro; el resto, en azul tinta.
 * Módulo puro (sin react-pdf) para poder probarlo sin cargar fuentes.
 */

export type PdfLinea = "normal" | "premium";

type ConLinea = { brandLine?: string | null } | null | undefined;

/** Línea de un cliente. Sin cliente o con un valor desconocido: normal. */
export function lineaDe(cliente: ConLinea): PdfLinea {
  return cliente?.brandLine === "premium" ? "premium" : "normal";
}

/** Línea de un documento con varios clientes (un proyecto compartido): si uno es premium, premium. */
export function lineaDeClientes(clientes: ConLinea[]): PdfLinea {
  return clientes.some((c) => lineaDe(c) === "premium") ? "premium" : "normal";
}

/**
 * Colores de cada línea, tal cual design-system/assets/style.css (`[data-linea]`). No inventar colores:
 * si cambia la marca, se cambia allá y se copia aquí. Los tonos «sobre oscuro» se derivan del blanco
 * mezclado con `dark`, igual que los rgba(255,255,255,x) de build_template.py, pero sólidos: react-pdf
 * pinta mal los rgba() en bordes.
 */
const BASE = {
  normal: {
    ink: "#0B1D3A",
    inkSoft: "#1C2B48",
    slate: "#4A5A78",
    slateLight: "#8792A8",
    line: "#E4E8F0",
    panel: "#F4F6FA",
    paper: "#FFFFFF",
    white: "#FFFFFF",
    dark: "#0B1D3A",
    accent: "#1F5BFF",
    accent2: "#6FA8FF",
    accentText: "#1F5BFF",
    accentOnDark: "#6FA8FF",
  },
  premium: {
    ink: "#0A0A0A",
    inkSoft: "#1F1D1A",
    slate: "#57524A",
    slateLight: "#948C80",
    line: "#ECE7DE",
    panel: "#F8F6F1",
    paper: "#FFFFFF",
    white: "#FFFFFF",
    dark: "#0A0A0A",
    accent: "#B8892E",
    accent2: "#E3C27A",
    accentText: "#8A6420",
    accentOnDark: "#E3C27A",
  },
} as const;

/** Mezcla `color` sobre `fondo` con opacidad `a` (0–1) y devuelve el hex sólido. */
export function mezclar(color: string, fondo: string, a: number): string {
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [c, f] = [rgb(color), rgb(fondo)];
  return `#${c.map((v, i) => Math.round(v * a + f[i] * (1 - a)).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

function tema(linea: PdfLinea) {
  const b = BASE[linea];
  return {
    linea,
    ...b,
    /** Texto secundario, metadatos y filetes sobre `dark` (rgba blanco 0.62 / 0.5 / 0.14 del template). */
    onDarkSoft: mezclar(b.white, b.dark, 0.62),
    onDarkMuted: mezclar(b.white, b.dark, 0.5),
    onDarkLine: mezclar(b.white, b.dark, 0.14),
    /** Pill destacada (`.pill.accent`): azul señal con texto blanco; en premium, oro claro con texto negro. */
    pillAccentBg: linea === "premium" ? b.accent2 : b.accent,
    pillAccentText: linea === "premium" ? b.ink : b.white,
    /** Banda superior: tres capas del logo en normal; filete de oro en premium (manual, portada). */
    banda: linea === "premium" ? [b.accent] : [b.ink, b.accent, b.accent2],
    /** Logos PNG en public/brand (react-pdf no lee SVG en <Image>). */
    logoColor: `pime-${linea}-horizontal-color.png`,
    logoInvertido: `pime-${linea}-horizontal-invertido.png`,
  };
}

export type PdfTheme = ReturnType<typeof tema>;

export const TEMAS: Record<PdfLinea, PdfTheme> = { normal: tema("normal"), premium: tema("premium") };

export function temaDe(linea: PdfLinea | null | undefined): PdfTheme {
  return TEMAS[linea === "premium" ? "premium" : "normal"];
}
