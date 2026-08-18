import { renderToStream, type DocumentProps } from "@react-pdf/renderer";
import type { Document as PrismaDocument, CompanyConfig, Contract, Client, Project, PaymentMethod } from "@prisma/client";
import type { ReactElement, JSXElementConstructor } from "react";
import { getLogoForPdf } from "./logo-loader";
import type { ProposalContent } from "./proposal-content";

type PdfElement = ReactElement<DocumentProps, string | JSXElementConstructor<unknown>>;

export async function renderDocumentPdf(
  doc: PrismaDocument,
  company: Partial<CompanyConfig> | null,
  paymentMethods: PaymentMethod[] = []
): Promise<NodeJS.ReadableStream> {
  const logoSrc = await getLogoForPdf(company);
  let element: PdfElement;

  if (doc.type === "FACTURA") {
    const { FacturaPdf } = await import("./templates/factura-pdf");
    element = FacturaPdf({ doc, company, logoSrc, paymentMethods }) as PdfElement;
  } else if (doc.type === "COTIZACION") {
    const { CotizacionPdf } = await import("./templates/cotizacion-pdf");
    element = CotizacionPdf({ doc, company, logoSrc, paymentMethods }) as PdfElement;
  } else if (doc.type === "BITACORA") {
    const { BitacoraPdf } = await import("./templates/bitacora-pdf");
    element = BitacoraPdf({ doc, company, logoSrc }) as PdfElement;
  } else {
    const { CorreoPdf } = await import("./templates/correo-pdf");
    element = CorreoPdf({ doc, company, logoSrc }) as PdfElement;
  }

  return renderToStream(element);
}

// Contracts and Projects aren't stored as `Document` rows (no CONTRATO/PROYECTO DocumentType — adding
// one would mean persisting a Document that's never actually queried as such). These render straight
// from their own models instead of going through renderDocumentPdf's type dispatch.

export async function renderContractPdf(
  contract: Contract,
  client: Client | null,
  company: Partial<CompanyConfig> | null
): Promise<NodeJS.ReadableStream> {
  const logoSrc = await getLogoForPdf(company);
  const { ContratoPdf } = await import("./templates/contrato-pdf");
  const element = ContratoPdf({ contract, client, company, logoSrc }) as PdfElement;
  return renderToStream(element);
}

export async function renderProjectProposalPdf(
  project: Project,
  client: Client | null,
  company: Partial<CompanyConfig> | null,
  content: ProposalContent
): Promise<NodeJS.ReadableStream> {
  const logoSrc = await getLogoForPdf(company);
  const { ProyectoPropuestaPdf } = await import("./templates/proyecto-propuesta-pdf");
  const element = ProyectoPropuestaPdf({ project, client, company, logoSrc, content }) as PdfElement;
  return renderToStream(element);
}
