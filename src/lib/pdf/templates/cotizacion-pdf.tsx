import { Document, View } from "@react-pdf/renderer";
import { t as traducir, fmtDate, fmtCurrency, documentStatusLabel, documentStatusVariant, type PdfLang } from "../translations";
import { temaDe, type PdfLinea } from "../tema";
import { DocPage } from "../components/doc-page";
import { DocumentHeader, type MetaDato } from "../components/document-header";
import { ClientBlock } from "../components/client-block";
import { LineItemsTable, TotalsBlock, calcularTotales, type LineItem } from "../components/line-items-table";
import { NotesBlock } from "../components/notes-block";
import { PaymentInfoBlock } from "../components/payment-info-block";
import { SignatureBlock } from "../components/signature-block";
import { DocumentFooter } from "../components/document-footer";
import type { Document as PrismaDocument, CompanyConfig, PaymentMethod } from "@prisma/client";
import { buildPdfPaymentMethods } from "../payment-methods";

interface CotizacionPdfProps {
  doc: PrismaDocument;
  company: Partial<CompanyConfig> | null;
  paymentMethods?: PaymentMethod[];
  /** Línea de marca del cliente de la cotización. */
  linea: PdfLinea;
}

export function CotizacionPdf({ doc, company, paymentMethods = [], linea }: CotizacionPdfProps) {
  const t = temaDe(linea);
  const lang = (doc.language as PdfLang) ?? "es";
  const tr = traducir(lang);
  const content = doc.content as Record<string, unknown>;
  const lineItems = (content?.lineItems as LineItem[]) ?? [];
  const notes = content?.notes as string | undefined;
  const terms = content?.terms as string | undefined;
  const currency = (doc.currency as string) ?? "USD";
  const { total } = calcularTotales(lineItems);

  const meta: MetaDato[] = [
    { label: tr.issueDate, value: fmtDate(doc.issueDate, lang) },
    ...(doc.validUntil ? [{ label: tr.validUntil, value: fmtDate(doc.validUntil, lang) }] : []),
    { label: tr.currency, value: currency },
    { label: tr.total, value: fmtCurrency(total, lang, currency), strong: true },
  ];

  return (
    <Document title={`${tr.quote} ${doc.number ?? ""}`} author={company?.name ?? "PIME PANAMA"} creator="Pime Communications Suite">
        <DocPage t={t}>
          <DocumentHeader t={t}
            docLabel={tr.quote}
            docNumber={doc.number}
            statusLabel={documentStatusLabel(doc.status, lang)}
            statusVariant={documentStatusVariant(doc.status)}
            meta={meta}
          />
          <ClientBlock t={t}
            tr={tr}
            billToLabel={tr.quoteTo}
            client={{ name: doc.clientName, company: doc.clientCompany, ruc: doc.clientRuc, address: doc.clientAddress, email: doc.clientEmail }}
            company={company}
          />
          <LineItemsTable t={t} tr={tr} lang={lang} items={lineItems} currency={currency} />
          <TotalsBlock t={t} tr={tr} lang={lang} items={lineItems} currency={currency} totalLabel={tr.quoteTotal} />
          <NotesBlock t={t} label={tr.notes} text={notes} />
          <NotesBlock t={t} label={tr.terms} text={terms} />
          {/* Formas de pago y aceptación van juntas: las firmas nunca quedan solas en una página. */}
          <View wrap={false}>
            <PaymentInfoBlock t={t} tr={tr} methods={buildPdfPaymentMethods(paymentMethods)} />
            <SignatureBlock t={t} tr={tr} showAcceptance acceptanceText={tr.acceptanceText} />
          </View>
          <DocumentFooter t={t} tr={tr} config={company} />
        </DocPage>
    </Document>
  );
}
