import { registerPdfFonts } from "./fonts";
import type { PdfTheme } from "./linea";

registerPdfFonts();

// Los colores viven en linea.ts (una paleta por línea de marca) y llegan a cada componente como prop `t`. Aquí solo
// queda lo que no cambia entre líneas.

// react-pdf resuelve el peso con `fontWeight` contra la familia registrada en fonts.ts.
export const FONTS = {
  body: "Manrope", // una sola familia (manual de marca)
  heading: "Manrope",
};

// design-system §3: 10 px tarjetas, 12 px bloques destacados, 20 px pills.
export const RADIUS = {
  card: 8,
  block: 10,
  pill: 20,
  chip: 6,
};

// LETTER en pt (8.5 in × 11 in a 72 dpi). Para elementos a sangre (bandas, portada, cierre).
export const PAGE = { width: 612, height: 792 };

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 22,
  xl: 32,
  page: 40,
};

/** Márgenes de los documentos de una o varias páginas (factura, cotización, recibo…): 18 mm a los lados. */
export const MARGEN = {
  lado: 51,
  /** Alto reservado arriba en las páginas 2+ para el encabezado corrido. */
  arriba: 62,
  /** Alto reservado abajo para el pie. */
  abajo: 66,
};

// LEY: el tamaño siempre es LETTER (8.5" × 11"). NUNCA A4.
export function paginaBase(t: PdfTheme) {
  return {
    backgroundColor: t.paper,
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
    fontFamily: FONTS.body,
    color: t.ink,
  };
}
