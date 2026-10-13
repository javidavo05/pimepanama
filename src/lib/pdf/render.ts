import { renderToStream, type DocumentProps } from "@react-pdf/renderer";
import type { Document as PrismaDocument, CompanyConfig, Contract, Client, Project, PaymentMethod } from "@prisma/client";
import type { ReactElement, JSXElementConstructor } from "react";
import type { ProposalContent } from "./proposal-content";
import { lineaDe, type PdfLinea } from "./linea";
import type { AbonoPdf } from "./components/abonos-table";

type PdfElement = ReactElement<DocumentProps, string | JSXElementConstructor<unknown>>;

export interface OpcionesPdf {
  /** Línea de marca del cliente del documento (datos-linea.ts). Sin ella, normal. */
  linea?: PdfLinea;
  /** Abonos confirmados (solo facturas). */
  abonos?: AbonoPdf[];
}

/**
 * PDF de un Document. La línea de marca NO se adivina aquí: quien llama la resuelve con
 * opcionesPdfDocumento(doc) (o lineaDeClienteId en las vistas previas) y la pasa.
 */
export async function renderDocumentPdf(
  doc: PrismaDocument,
  company: Partial<CompanyConfig> | null,
  paymentMethods: PaymentMethod[] = [],
  opciones: OpcionesPdf = {}
): Promise<NodeJS.ReadableStream> {
  const linea = opciones.linea ?? "normal";
  let element: PdfElement;

  if (doc.type === "FACTURA") {
    const { FacturaPdf } = await import("./templates/factura-pdf");
    element = FacturaPdf({ doc, company, paymentMethods, linea, abonos: opciones.abonos }) as PdfElement;
  } else if (doc.type === "COTIZACION") {
    const { CotizacionPdf } = await import("./templates/cotizacion-pdf");
    element = CotizacionPdf({ doc, company, paymentMethods, linea }) as PdfElement;
  } else if (doc.type === "BITACORA") {
    const { BitacoraPdf } = await import("./templates/bitacora-pdf");
    element = BitacoraPdf({ doc, company, linea }) as PdfElement;
  } else {
    const { CorreoPdf } = await import("./templates/correo-pdf");
    element = CorreoPdf({ doc, company, linea }) as PdfElement;
  }

  return renderToStream(element);
}

// Contracts and Projects aren't stored as `Document` rows (no CONTRATO/PROYECTO DocumentType — adding
// one would mean persisting a Document that's never actually queried as such). These render straight
// from their own models instead of going through renderDocumentPdf's type dispatch.

/** `linea`: la del contrato y su proyecto (lineaDeProyecto). Si no se pasa, la del cliente del contrato. */
export async function renderContractPdf(
  contract: Contract,
  client: Client | null,
  company: Partial<CompanyConfig> | null,
  linea: PdfLinea = lineaDe(client)
): Promise<NodeJS.ReadableStream> {
  const { ContratoPdf } = await import("./templates/contrato-pdf");
  const element = ContratoPdf({ contract, client, company, linea }) as PdfElement;
  return renderToStream(element);
}

export async function renderProjectProposalPdf(
  project: Project,
  client: Client | null,
  company: Partial<CompanyConfig> | null,
  content: ProposalContent,
  linea: PdfLinea = lineaDe(client)
): Promise<NodeJS.ReadableStream> {
  const { ProyectoPropuestaPdf } = await import("./templates/proyecto-propuesta-pdf");
  const element = ProyectoPropuestaPdf({ project, client, company, content, linea }) as PdfElement;
  return renderToStream(element);
}
