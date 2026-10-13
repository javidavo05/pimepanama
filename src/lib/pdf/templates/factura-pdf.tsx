import { Document, View } from "@react-pdf/renderer";
import { t as traducir, fmtDate, fmtCurrency, documentStatusLabel, documentStatusVariant, type PdfLang } from "../translations";
import { temaDe, type PdfLinea } from "../tema";
import { DocPage } from "../components/doc-page";
import { DocumentHeader, type MetaDato } from "../components/document-header";
import { ClientBlock } from "../components/client-block";
import { LineItemsTable, TotalsBlock, calcularTotales, type LineItem } from "../components/line-items-table";
import { AbonosTable, type AbonoPdf } from "../components/abonos-table";
import { NotesBlock } from "../components/notes-block";
import { PaymentInfoBlock } from "../components/payment-info-block";
import { SignatureBlock } from "../components/signature-block";
import { DocumentFooter } from "../components/document-footer";
import type { Document as PrismaDocument, CompanyConfig, PaymentMethod } from "@prisma/client";
import { buildPdfPaymentMethods } from "../payment-methods";

interface FacturaPdfProps {
  doc: PrismaDocument;
  company: Partial<CompanyConfig> | null;
  paymentMethods?: PaymentMethod[];
  /** Línea de marca del cliente de la factura (lineaDe(cliente)). */
  linea: PdfLinea;
  /** Abonos confirmados a la factura. Si hay, salen en su tabla y el destacado pasa a ser el saldo. */
  abonos?: AbonoPdf[];
}

export function FacturaPdf({ doc, company, paymentMethods = [], linea, abonos = [] }: FacturaPdfProps) {
  const t = temaDe(linea);
  const lang = (doc.language as PdfLang) ?? "es";
  const tr = traducir(lang);
  const content = doc.content as Record<string, unknown>;
  const lineItems = (content?.lineItems as LineItem[]) ?? [];
  const notes = content?.notes as string | undefined;
  const currency = (doc.currency as string) ?? "USD";
  const { total } = calcularTotales(lineItems);
  // Lo pagado: los abonos confirmados si los hay; si no, lo que la factura ya tiene conciliado.
  const pagado = abonos.length > 0 ? abonos.reduce((a, b) => a + b.monto, 0) : Number(doc.amountPaid ?? 0);
  const saldo = Math.max(0, Math.round((total - pagado) * 100) / 100);

  const meta: MetaDato[] = [
    { label: tr.issueDate, value: fmtDate(doc.issueDate, lang) },
    ...(doc.dueDate ? [{ label: tr.dueDate, value: fmtDate(doc.dueDate, lang) }] : []),
    { label: tr.total, value: fmtCurrency(total, lang, currency), strong: pagado <= 0.004 },
    ...(pagado > 0.004 ? [{ label: tr.balanceDue, value: fmtCurrency(saldo, lang, currency), strong: true }] : []),
  ];

  return (
    <Document title={`${tr.invoice} ${doc.number ?? ""}`} author={company?.name ?? "PIME PANAMA"} creator="Pime Communications Suite">
        <DocPage t={t}>
          <DocumentHeader t={t}
            docLabel={tr.invoice}
            docNumber={doc.number}
            statusLabel={documentStatusLabel(doc.status, lang)}
            statusVariant={documentStatusVariant(doc.status)}
            meta={meta}
          />
          <ClientBlock t={t}
            tr={tr}
            client={{ name: doc.clientName, company: doc.clientCompany, ruc: doc.clientRuc, address: doc.clientAddress, email: doc.clientEmail }}
            company={company}
          />
          <LineItemsTable t={t} tr={tr} lang={lang} items={lineItems} currency={currency} />
          <TotalsBlock t={t} tr={tr} lang={lang} items={lineItems} currency={currency} paid={pagado} />
          <AbonosTable t={t} tr={tr} lang={lang} abonos={abonos} currency={currency} />
          <NotesBlock t={t} label={tr.notes} text={notes} />
          {/* Formas de pago y firmas van juntas: las firmas nunca quedan solas en una página. */}
          <View wrap={false}>
            <PaymentInfoBlock t={t} tr={tr} methods={buildPdfPaymentMethods(paymentMethods)} />
            <SignatureBlock t={t} tr={tr} />
          </View>
          <DocumentFooter t={t} tr={tr} config={company} />
        </DocPage>
    </Document>
  );
}
