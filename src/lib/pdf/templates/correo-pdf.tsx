import { Document, View, Text } from "@react-pdf/renderer";
import { FONTS, RADIUS } from "../tokens";
import { porTema, temaDe, type PdfLinea, type PdfTheme } from "../tema";
import { t as traducir, fmtDate, type PdfLang, type PdfTranslations } from "../translations";
import { DocPage } from "../components/doc-page";
import { DocumentHeader, type MetaDato } from "../components/document-header";
import { DocumentFooter } from "../components/document-footer";
import { Eyebrow } from "../components/section-title";
import { Parrafos } from "../components/notes-block";
import type { Document as PrismaDocument, CompanyConfig } from "@prisma/client";

const estilos = porTema((th) => ({
  subjectWrap: { marginBottom: 22 },
  subject: { fontFamily: FONTS.heading, fontWeight: 800, fontSize: 14, color: th.ink, lineHeight: 1.3 },
  bodyCard: { backgroundColor: th.panel, borderWidth: 1, borderColor: th.line, borderRadius: RADIUS.card, padding: 16 },
  emailBodyText: { fontFamily: FONTS.body, fontSize: 9, color: th.slate, lineHeight: 1.7 },
}));

function Cuerpo({ t, tr, subject, body }: { t: PdfTheme; tr: PdfTranslations; subject: string; body: string }) {
  const s = estilos(t);
  return (
    <>
      <View style={s.subjectWrap} wrap={false}>
        <Eyebrow t={t}>{tr.subject}</Eyebrow>
        <Text style={s.subject}>{subject}</Text>
      </View>
      <View minPresenceAhead={80}>
        <Eyebrow t={t}>{tr.emailBody}</Eyebrow>
      </View>
      <View style={s.bodyCard}>
        <Parrafos text={body || "—"} style={s.emailBodyText} />
      </View>
    </>
  );
}

interface CorreoPdfProps {
  doc: PrismaDocument;
  company: Partial<CompanyConfig> | null;
  linea: PdfLinea;
}

export function CorreoPdf({ doc, company, linea }: CorreoPdfProps) {
  const t = temaDe(linea);
  const lang = (doc.language as PdfLang) ?? "es";
  const tr = traducir(lang);
  const content = doc.content as Record<string, string>;
  const meta: MetaDato[] = [
    { label: tr.date, value: fmtDate(doc.issueDate, lang) },
    ...(content?.to ? [{ label: tr.to, value: content.to }] : []),
    ...(content?.cc ? [{ label: tr.cc, value: content.cc }] : []),
  ];

  return (
    <Document title={`${tr.email} — ${content?.subject ?? doc.title}`} author={company?.name ?? "PIME PANAMA"} creator="Pime Communications Suite">
        <DocPage t={t}>
          <DocumentHeader t={t} docLabel={tr.email} docNumber={doc.number ?? null} meta={meta} />
          <Cuerpo t={t} tr={tr} subject={content?.subject ?? "—"} body={content?.body ?? ""} />
          <DocumentFooter t={t} tr={tr} config={company} />
        </DocPage>
    </Document>
  );
}
