import { Document, View, Text } from "@react-pdf/renderer";
import { FONTS, RADIUS } from "../tokens";
import { porTema, temaDe, type PdfLinea, type PdfTheme } from "../tema";
import { t as traducir, fmtDate, type PdfLang } from "../translations";
import { DocPage } from "../components/doc-page";
import { DocumentHeader, type MetaDato } from "../components/document-header";
import { DocumentFooter } from "../components/document-footer";
import { NotesBlock } from "../components/notes-block";
import { Eyebrow } from "../components/section-title";
import { parseAttendeeList } from "@/lib/bitacora-attendees";
import type { Document as PrismaDocument, CompanyConfig } from "@prisma/client";

const estilos = porTema((th) => ({
  attendeeSection: { marginBottom: 22 },
  attendeeRow: { flexDirection: "row", flexWrap: "wrap" },
  chip: { backgroundColor: th.panel, borderWidth: 1, borderColor: th.line, borderRadius: RADIUS.pill, paddingHorizontal: 9, paddingVertical: 3.5, marginRight: 6, marginBottom: 6 },
  chipText: { fontFamily: FONTS.body, fontWeight: 500, fontSize: 8, color: th.inkSoft },
}));

function AttendeeSection({ t, label, names }: { t: PdfTheme; label: string; names: string[] }) {
  const s = estilos(t);
  if (names.length === 0) return null;
  return (
    <View style={s.attendeeSection} wrap={false}>
      <Eyebrow t={t}>{label}</Eyebrow>
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

interface BitacoraPdfProps {
  doc: PrismaDocument;
  company: Partial<CompanyConfig> | null;
  linea: PdfLinea;
}

export function BitacoraPdf({ doc, company, linea }: BitacoraPdfProps) {
  const t = temaDe(linea);
  const lang = (doc.language as PdfLang) ?? "es";
  const tr = traducir(lang);
  const content = doc.content as Record<string, string>;
  const meta: MetaDato[] = [
    { label: tr.date, value: fmtDate(doc.issueDate, lang) },
    ...(content?.project ? [{ label: tr.project, value: content.project }] : []),
    ...(doc.clientName ? [{ label: lang === "en" ? "CLIENT" : "CLIENTE", value: doc.clientName }] : []),
  ];

  return (
    <Document title={`${tr.log} — ${doc.title}`} author={company?.name ?? "PIME PANAMA"} creator="Pime Communications Suite">
        <DocPage t={t}>
          <DocumentHeader t={t} docLabel={tr.log} docNumber={doc.number} meta={meta} />
          <AttendeeSection t={t} label={tr.clientAttendees} names={parseAttendeeList(content?.attendees)} />
          <AttendeeSection t={t} label={tr.pimeAttendees} names={parseAttendeeList(content?.pimeAttendees)} />
          <NotesBlock t={t} label={tr.agenda} text={content?.agenda} />
          <NotesBlock t={t} label={tr.decisions} text={content?.decisions} />
          <NotesBlock t={t} label={tr.actionItems} text={content?.actionItems} />
          <NotesBlock t={t} label={tr.nextMeeting} text={content?.nextMeeting} />
          <DocumentFooter t={t} tr={tr} config={company} />
        </DocPage>
    </Document>
  );
}
