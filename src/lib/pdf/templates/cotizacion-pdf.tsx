import { Document, Page, View, StyleSheet } from "@react-pdf/renderer";
import { pageStyles, COLORS, FONTS, SPACING } from "../tokens";
import { t, fmtDate, documentStatusLabel, documentStatusVariant, type PdfLang } from "../translations";
import { DocumentHeader } from "../components/document-header";
import { ClientBlock } from "../components/client-block";
import { LineItemsTable } from "../components/line-items-table";
import { NotesBlock } from "../components/notes-block";
import { PaymentInfoBlock } from "../components/payment-info-block";
import { SignatureBlock } from "../components/signature-block";
import { DocumentFooter } from "../components/document-footer";
import type { Document as PrismaDocument, CompanyConfig, PaymentMethod } from "@prisma/client";
import { buildPdfPaymentMethods } from "../payment-methods";

const s = StyleSheet.create({
  // LAW: size must be LETTER (8.5" × 11"). NEVER A4.
  page: {
    ...pageStyles.page,
    fontFamily: FONTS.body,
    backgroundColor: COLORS.white,
    color: COLORS.ink,
    paddingBottom: 70,
  },
  body: {
    paddingHorizontal: SPACING.page,
    paddingTop: SPACING.lg,
    flex: 1,
    flexDirection: "column",
  },
  spacer: { flexGrow: 1 },
});

interface CotizacionPdfProps {
  doc: PrismaDocument;
  company: Partial<CompanyConfig> | null;
  logoSrc: string;
  paymentMethods?: PaymentMethod[];
}

export function CotizacionPdf({ doc, company, logoSrc, paymentMethods = [] }: CotizacionPdfProps) {
  const lang = (doc.language as PdfLang) ?? "es";
  const tr = t(lang);
  const content = doc.content as Record<string, unknown>;
  const lineItems = (content?.lineItems as never[]) ?? [];
  const notes = content?.notes as string | undefined;
  const terms = content?.terms as string | undefined;
  const currency = (doc.currency as string) ?? "USD";
  const pdfPaymentMethods = buildPdfPaymentMethods(paymentMethods);

  return (
    <Document
      title={`${tr.quote} ${doc.number ?? ""}`}
      author={company?.name ?? "PIME PANAMA"}
      creator="Pime Communications Suite"
    >
      <Page size="LETTER" style={s.page}>
        <DocumentHeader
          config={company}
          docLabel={tr.quote}
          docNumber={doc.number}
          logoSrc={logoSrc}
          statusLabel={documentStatusLabel(doc.status, lang)}
          statusVariant={documentStatusVariant(doc.status)}
        />
        <View style={s.body}>
          <ClientBlock
            tr={tr}
            billToLabel={tr.quoteTo}
            clientName={doc.clientName}
            clientCompany={doc.clientCompany}
            clientAddress={doc.clientAddress}
            clientEmail={doc.clientEmail}
            clientRuc={doc.clientRuc}
            issueDate={fmtDate(doc.issueDate, lang)}
            secondDateLabel={doc.validUntil ? tr.validUntil : undefined}
            secondDate={doc.validUntil ? fmtDate(doc.validUntil, lang) : undefined}
          />
          <LineItemsTable
            tr={tr}
            lang={lang}
            items={lineItems}
            currency={currency}
          />
          <NotesBlock label={tr.notes} text={notes} />
          <NotesBlock label={tr.terms} text={terms} />
          <View style={s.spacer} />
          <PaymentInfoBlock tr={tr} methods={pdfPaymentMethods} />
          <SignatureBlock
            tr={tr}
            showAcceptance
            acceptanceText={tr.acceptanceText}
          />
        </View>
        <DocumentFooter tr={tr} config={company} />
      </Page>
    </Document>
  );
}
