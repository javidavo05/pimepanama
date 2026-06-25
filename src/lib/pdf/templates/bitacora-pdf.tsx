import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { pageStyles, COLORS, FONTS, SPACING } from "../tokens";
import { t, fmtDate, type PdfLang } from "../translations";
import { DocumentHeader } from "../components/document-header";
import { DocumentFooter } from "../components/document-footer";
import { NotesBlock } from "../components/notes-block";
import type { Document as PrismaDocument, CompanyConfig } from "@prisma/client";

const s = StyleSheet.create({
  page: {
    ...pageStyles.page,
    fontFamily: FONTS.regular,
    backgroundColor: COLORS.bg,
    color: COLORS.text,
    paddingBottom: 70,
  },
  metaRow: { flexDirection: "row", gap: SPACING.lg, marginBottom: SPACING.lg },
  metaCard: { flex: 1, backgroundColor: COLORS.bgCard, borderRadius: 4, padding: SPACING.md },
  metaLabel: { fontFamily: FONTS.bold, fontSize: 6.5, color: COLORS.goldDim, letterSpacing: 1.5, marginBottom: 3 },
  metaValue: { fontSize: 9, color: COLORS.text },
  attendeeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: SPACING.lg },
  chip: { backgroundColor: COLORS.bgCard, borderRadius: 3, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { fontSize: 8, color: COLORS.textMuted },
  attendeeLabel: { fontFamily: FONTS.bold, fontSize: 7, color: COLORS.gold, letterSpacing: 2, marginBottom: 6 },
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
      author={company?.name ?? "Pime Panamá"}
      creator="Pime Communications Suite"
    >
      <Page size="LETTER" style={s.page}>
        <DocumentHeader
          config={company}
          docLabel={tr.log}
          docNumber={doc.number}
        />

        {/* Meeting meta */}
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

        {/* Attendees */}
        {attendees.length > 0 && (
          <View style={{ marginBottom: SPACING.lg }} wrap={false}>
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

        <DocumentFooter tr={tr} config={company} />
      </Page>
    </Document>
  );
}
