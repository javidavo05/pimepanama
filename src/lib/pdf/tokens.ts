import { StyleSheet } from "@react-pdf/renderer";
import { registerPdfFonts } from "./fonts";

registerPdfFonts();

// Brand tokens ported 1:1 from design-system/PROMPT_CLAUDE_CODE.md §1.
// Do not invent new colors here — anything outside this palette breaks the shared visual system.
export const COLORS = {
  blue: "#0586FE",
  purple: "#552EFF",
  ink: "#0B0D14",
  inkSoft: "#1B1F2B",
  slate: "#4B5468",
  slateLight: "#8A93A6",
  line: "#E7E9EF",
  paper: "#FCFCFD",
  panel: "#F5F6F9",
  white: "#FFFFFF",
};

export const GRADIENT_STOPS: [string, string] = [COLORS.blue, COLORS.purple];

// react-pdf resolves weight via the `fontWeight` style prop against the registered family
// (see fonts.ts) — components set `fontFamily: FONTS.body, fontWeight: 600` etc, no per-weight family names needed.
export const FONTS = {
  body: "Inter",
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
