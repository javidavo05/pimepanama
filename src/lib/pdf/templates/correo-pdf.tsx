import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { pageStyles, COLORS, FONTS, SPACING } from "../tokens";
import { t, fmtDate, type PdfLang } from "../translations";
import { DocumentHeader } from "../components/document-header";
import { DocumentFooter } from "../components/document-footer";
import type { Document as PrismaDocument, CompanyConfig } from "@prisma/client";

const s = StyleSheet.create({
  // LAW: size must be LETTER (8.5" × 11"). NEVER A4.
  page: {
    ...pageStyles.page,
    fontFamily: FONTS.regular,
    backgroundColor: COLORS.bg,
    color: COLORS.text,
    paddingBottom: 70,
  },
  body: {
    paddingHorizontal: SPACING.page,
    paddingTop: SPACING.lg,
  },
  metaCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.purple,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  metaRow: { flexDirection: "row", marginBottom: 5 },
  metaLabel: {
    fontFamily: FONTS.bold,
    fontSize: 7,
    color: COLORS.blueDim,
    width: 50,
    letterSpacing: 1,
  },
  metaValue: { fontSize: 8.5, color: COLORS.text, flex: 1 },
  subjectDivider: {
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
    marginTop: 6,
    paddingTop: 6,
  },
  subjectLabel: {
    fontFamily: FONTS.bold,
    fontSize: 7,
    color: COLORS.blue,
    letterSpacing: 2,
    marginBottom: 4,
  },
  subject: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.text },
  bodyCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 4,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.border,
    padding: SPACING.md,
  },
  bodyLabel: {
    fontFamily: FONTS.bold,
    fontSize: 7,
    color: COLORS.blue,
    letterSpacing: 2,
    marginBottom: SPACING.sm,
  },
  emailBodyText: { fontSize: 9, color: COLORS.textMuted, lineHeight: 1.7 },
});

interface CorreoPdfProps {
  doc: PrismaDocument;
  company: Partial<CompanyConfig> | null;
}

export function CorreoPdf({ doc, company }: CorreoPdfProps) {
  const lang = (doc.language as PdfLang) ?? "es";
  const tr = t(lang);
  const content = doc.content as Record<string, string>;

  return (
    <Document
      title={`${tr.email} — ${content?.subject ?? doc.title}`}
      author={company?.name ?? "PIME PANAMA"}
      creator="Pime Communications Suite"
    >
      <Page size="LETTER" style={s.page}>
        <DocumentHeader
          config={company}
          docLabel={tr.email}
          docNumber={fmtDate(doc.issueDate, lang)}
        />
        <View style={s.body}>
          <View style={s.metaCard} wrap={false}>
            {content?.to && (
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>{tr.to}:</Text>
                <Text style={s.metaValue}>{content.to}</Text>
              </View>
            )}
            {content?.cc && (
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>{tr.cc}:</Text>
                <Text style={s.metaValue}>{content.cc}</Text>
              </View>
            )}
            <View style={s.subjectDivider}>
              <Text style={s.subjectLabel}>{tr.subject}</Text>
              <Text style={s.subject}>{content?.subject ?? "—"}</Text>
            </View>
          </View>

          <View style={s.bodyCard}>
            <Text style={s.bodyLabel}>{tr.emailBody}</Text>
            <Text style={s.emailBodyText}>{content?.body ?? ""}</Text>
          </View>
        </View>
        <DocumentFooter tr={tr} config={company} />
      </Page>
    </Document>
  );
}
