import { StyleSheet } from "@react-pdf/renderer";
import { registerPdfFonts } from "./fonts";

registerPdfFonts();

// Marca «Capas abiertas», línea Normal (design-system/brand/manual.html y assets/style.css).
// No inventar colores aquí. `blue` es el azul señal (acento) y `purple` quedó como nombre histórico del azul cielo.
export const COLORS = {
  blue: "#1F5BFF",
  purple: "#6FA8FF",
  ink: "#0B1D3A",
  inkSoft: "#1C2B48",
  slate: "#4A5A78",
  slateLight: "#8792A8",
  line: "#E4E8F0",
  paper: "#FFFFFF",
  panel: "#F4F6FA",
  white: "#FFFFFF",
};

/** Las tres capas del logo, de abajo hacia arriba: base del documento, banda y viñetas. */
export const LAYERS: [string, string, string] = [COLORS.ink, COLORS.blue, COLORS.purple];
export const GRADIENT_STOPS: [string, string] = [COLORS.blue, COLORS.purple];

// react-pdf resolves weight via the `fontWeight` style prop against the registered family
// (see fonts.ts) — components set `fontFamily: FONTS.body, fontWeight: 600` etc, no per-weight family names needed.
export const FONTS = {
  body: "Manrope", // una sola familia (manual de marca)
  heading: "Manrope",
};

export const RADIUS = {
  card: 8,
  block: 10,
  pill: 20,
  chip: 6,
};

// LETTER page in pt (8.5in x 11in @ 72dpi). Used by full-bleed elements (gradient stripes, cover/closing pages).
export const PAGE = { width: 612, height: 792 };

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 22,
  xl: 32,
  page: 40,
};

export const pageStyles = StyleSheet.create({
  // LAW: size must always be LETTER (8.5" × 11"). NEVER A4.
  page: {
    backgroundColor: COLORS.white,
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
    fontFamily: FONTS.body,
    color: COLORS.ink,
  },
});
