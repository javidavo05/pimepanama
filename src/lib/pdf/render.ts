import { renderToStream, type DocumentProps } from "@react-pdf/renderer";
import type { Document as PrismaDocument, CompanyConfig } from "@prisma/client";
import type { ReactElement, JSXElementConstructor } from "react";
import { getLogoForPdf } from "./logo-loader";

type PdfElement = ReactElement<DocumentProps, string | JSXElementConstructor<unknown>>;

export async function renderDocumentPdf(
  doc: PrismaDocument,
  company: Partial<CompanyConfig> | null
): Promise<NodeJS.ReadableStream> {
  const logoSrc = await getLogoForPdf(company);
  let element: PdfElement;

  if (doc.type === "FACTURA") {
    const { FacturaPdf } = await import("./templates/factura-pdf");
    element = FacturaPdf({ doc, company, logoSrc }) as PdfElement;
  } else if (doc.type === "COTIZACION") {
    const { CotizacionPdf } = await import("./templates/cotizacion-pdf");
    element = CotizacionPdf({ doc, company, logoSrc }) as PdfElement;
  } else if (doc.type === "BITACORA") {
    const { BitacoraPdf } = await import("./templates/bitacora-pdf");
    element = BitacoraPdf({ doc, company, logoSrc }) as PdfElement;
  } else {
    const { CorreoPdf } = await import("./templates/correo-pdf");
    element = CorreoPdf({ doc, company, logoSrc }) as PdfElement;
  }

  return renderToStream(element);
}
