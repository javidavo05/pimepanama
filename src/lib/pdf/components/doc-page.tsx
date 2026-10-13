import { Page } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { MARGEN, paginaBase } from "../tokens";
import { porTema, type PdfTheme } from "../tema";

const estilos = porTema((t) => ({
  // LEY: tamaño LETTER (8.5" × 11"). NUNCA A4. Arriba queda el espacio del encabezado corrido de las
  // páginas 2+; en la primera, DocumentHeader sube con margen negativo hasta el borde.
  page: { ...paginaBase(t), paddingTop: MARGEN.arriba, paddingBottom: MARGEN.abajo, paddingHorizontal: MARGEN.lado },
}));

/** Página de los documentos de la suite (factura, cotización, recibo, contrato, bitácora, correo). */
export function DocPage({ t, children }: { t: PdfTheme; children: ReactNode }) {
  return (
    <Page size="LETTER" style={estilos(t).page}>
      {children}
    </Page>
  );
}
