import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { pageStyles, COLORS, FONTS, SPACING } from "../tokens";
import { t, fmtDate, type PdfLang } from "../translations";
import { DocumentHeader } from "../components/document-header";
import { DocumentFooter } from "../components/document-footer";
import { NotesBlock } from "../components/notes-block";
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
  metaRow: { flexDirection: "row", gap: SPACING.md, marginBottom: SPACING.lg },
  metaCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.purple,
    padding: SPACING.md,
  },
  metaLabel: {
    fontFamily: FONTS.bold,
    fontSize: 6.5,
    color: COLORS.blueDim,
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  metaValue: { fontSize: 9, color: COLORS.text },
  attendeeSection: { marginBottom: SPACING.lg },
  attendeeLabel: {
    fontFamily: FONTS.bold,
    fontSize: 7,
    color: COLORS.blue,
    letterSpacing: 2,
    marginBottom: 6,
  },
  attendeeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    backgroundColor: COLORS.blueLight,
    borderRadius: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipText: { fontSize: 8, color: COLORS.blueDim },
});

interface BitacoraPdfProps {
  doc: PrismaDocument;
  company: Partial<CompanyConfig> | null;
}

export function BitacoraPdf({ doc, company }: BitacoraPdfProps) {
  const lang = (doc.language as PdfLang) ?? "es";
  const tr = t(lang);
  const content = doc.content as Record<string, string>;

  const attendees = content?.attendees
    ? content.attendees.split(",").map((a: string) => a.trim()).filter(Boolean)
    : [];

  return (
    <Document
      title={`${tr.log} — ${doc.title}`}
      author={company?.name ?? "PIME PANAMA"}
      creator="Pime Communications Suite"
    >
      <Page size="LETTER" style={s.page}>
        <DocumentHeader
          config={company}
          docLabel={tr.log}
          docNumber={doc.number}
        />
        <View style={s.body}>
          <View style={s.metaRow} wrap={false}>
            <View style={s.metaCard}>
              <Text style={s.metaLabel}>{tr.date}</Text>
              <Text style={s.metaValue}>{fmtDate(doc.issueDate, lang)}</Text>
            </View>
            {content?.project && (
              <View style={s.metaCard}>
                <Text style={s.metaLabel}>{tr.project}</Text>
                <Text style={s.metaValue}>{content.project}</Text>
              </View>
            )}
            {doc.clientName && (
              <View style={s.metaCard}>
                <Text style={s.metaLabel}>CLIENTE</Text>
                <Text style={s.metaValue}>{doc.clientName}</Text>
              </View>
            )}
          </View>

          {attendees.length > 0 && (
            <View style={s.attendeeSection} wrap={false}>
              <Text style={s.attendeeLabel}>{tr.attendees}</Text>
              <View style={s.attendeeRow}>
                {attendees.map((a: string, i: number) => (
                  <View key={i} style={s.chip}>
                    <Text style={s.chipText}>{a}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <NotesBlock label={tr.agenda} text={content?.agenda} />
          <NotesBlock label={tr.decisions} text={content?.decisions} />
          <NotesBlock label={tr.actionItems} text={content?.actionItems} />
          <NotesBlock label={tr.nextMeeting} text={content?.nextMeeting} />
        </View>
        <DocumentFooter tr={tr} config={company} />
      </Page>
    </Document>
  );
}
