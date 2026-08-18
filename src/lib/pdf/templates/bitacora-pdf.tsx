import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { pageStyles, COLORS, FONTS, SPACING, RADIUS } from "../tokens";
import { t, fmtDate, type PdfLang } from "../translations";
import { DocumentHeader } from "../components/document-header";
import { DocumentFooter } from "../components/document-footer";
import { NotesBlock } from "../components/notes-block";
import { parseAttendeeList } from "@/lib/bitacora-attendees";
import type { Document as PrismaDocument, CompanyConfig } from "@prisma/client";

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
  },
  metaRow: { flexDirection: "row", gap: SPACING.md, marginBottom: SPACING.lg },
  metaCard: {
    flex: 1,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: RADIUS.card,
    padding: SPACING.md,
  },
  metaLabel: {
    fontFamily: FONTS.body,
    fontWeight: 700,
    fontSize: 6.6,
    color: COLORS.blue,
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  metaValue: { fontFamily: FONTS.body, fontWeight: 600, fontSize: 9, color: COLORS.ink },
  attendeeSection: { marginBottom: SPACING.lg },
  attendeeLabel: {
    fontFamily: FONTS.body,
    fontWeight: 700,
    fontSize: 7,
    color: COLORS.blue,
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  attendeeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 9,
    paddingVertical: 3.5,
  },
  chipText: { fontFamily: FONTS.body, fontWeight: 500, fontSize: 8, color: COLORS.inkSoft },
});

interface BitacoraPdfProps {
  doc: PrismaDocument;
  company: Partial<CompanyConfig> | null;
  logoSrc: string;
}

export function BitacoraPdf({ doc, company, logoSrc }: BitacoraPdfProps) {
  const lang = (doc.language as PdfLang) ?? "es";
  const tr = t(lang);
  const content = doc.content as Record<string, string>;

  const clientAttendees = parseAttendeeList(content?.attendees);
  const pimeAttendees = parseAttendeeList(content?.pimeAttendees);

  function AttendeeSection({ label, names }: { label: string; names: string[] }) {
    if (names.length === 0) return null;
    return (
      <View style={s.attendeeSection} wrap={false}>
        <Text style={s.attendeeLabel}>{label}</Text>
        <View style={s.attendeeRow}>
          {names.map((a, i) => (
            <View key={i} style={s.chip}>
              <Text style={s.chipText}>{a}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

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
          logoSrc={logoSrc}
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

          <AttendeeSection label={tr.clientAttendees} names={clientAttendees} />
          <AttendeeSection label={tr.pimeAttendees} names={pimeAttendees} />

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
