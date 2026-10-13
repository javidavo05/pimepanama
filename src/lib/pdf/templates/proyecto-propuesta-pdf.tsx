import { Document, Page, View, Text } from "@react-pdf/renderer";
import { paginaBase, FONTS, SPACING, RADIUS, MARGEN } from "../tokens";
import { porTema, temaDe, type PdfLinea, type PdfTheme } from "../tema";
import { fmtDate } from "../translations";
import { CoverPage } from "../components/cover-page";
import { ClosingPage } from "../components/closing-page";
import { ProposalPageHeader, SectionIntro } from "../components/section-header";
import { DocumentFooter } from "../components/document-footer";
import { GradientChip } from "../components/gradient";
import { PhaseCard } from "../components/phase-card";
import { CheckList } from "../components/check-list";
import { Parrafos } from "../components/notes-block";
import { Pill } from "../components/pill";
import { t as traducir } from "../translations";
import type { Project, Client, CompanyConfig } from "@prisma/client";
import type { ProposalContent } from "../proposal-content";

const estilos = porTema((th) => ({
  page: { ...paginaBase(th), paddingBottom: MARGEN.abajo },
  body: { paddingHorizontal: MARGEN.lado },
  grid3: { flexDirection: "row", gap: 10, marginBottom: SPACING.lg },
  pillarCard: { flex: 1, backgroundColor: th.panel, borderWidth: 1, borderColor: th.line, borderRadius: RADIUS.card, padding: 12 },
  pillarText: { fontFamily: FONTS.body, fontWeight: 600, fontSize: 8.6, color: th.inkSoft, lineHeight: 1.5 },
  twoCol: { flexDirection: "row", gap: 12, marginBottom: SPACING.lg },
  colCard: { flex: 1, borderWidth: 1, borderColor: th.line, borderRadius: RADIUS.card, padding: 12 },
  colTitle: { fontFamily: FONTS.heading, fontWeight: 700, fontSize: 10, color: th.ink, marginBottom: 6 },
  colBody: { fontFamily: FONTS.body, fontSize: 8.6, color: th.slate, lineHeight: 1.6 },
  paraCard: { backgroundColor: th.panel, borderWidth: 1, borderColor: th.line, borderRadius: RADIUS.card, padding: 14, marginBottom: SPACING.lg },
  paraText: { fontFamily: FONTS.body, fontSize: 9, color: th.slate, lineHeight: 1.7 },
  archRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  archCard: { flex: 1, backgroundColor: th.panel, borderWidth: 1, borderColor: th.line, borderRadius: RADIUS.card, padding: 12 },
  archTitle: { fontFamily: FONTS.heading, fontWeight: 700, fontSize: 9.5, color: th.ink, marginBottom: 5 },
  archBody: { fontFamily: FONTS.body, fontSize: 8.2, color: th.slate, lineHeight: 1.55 },
  pillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  methodologyNote: { backgroundColor: th.panel, borderWidth: 1, borderColor: th.line, borderRadius: RADIUS.card, padding: 12, marginBottom: 14 },
  methodologyText: { fontFamily: FONTS.body, fontSize: 8.2, color: th.slate, lineHeight: 1.6 },
  phaseGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  phaseGridItem: { width: "48.5%" },
  table: { marginBottom: SPACING.lg },
  tableHeaderRow: { flexDirection: "row", borderBottomWidth: 1.4, borderBottomColor: th.ink, paddingBottom: 6, marginBottom: 4 },
  tableHeaderCell: { fontFamily: FONTS.body, fontWeight: 700, fontSize: 6.8, color: th.slateLight, letterSpacing: 1, textTransform: "uppercase" },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: th.line, paddingVertical: 8 },
  tableCell: { fontFamily: FONTS.body, fontSize: 8.8, color: th.slate },
  tableCellStrong: { fontFamily: FONTS.body, fontWeight: 600, fontSize: 8.8, color: th.inkSoft },
  scopeCol: { flex: 1 },
  scopeColTitle: { fontFamily: FONTS.heading, fontWeight: 700, fontSize: 10, marginBottom: 10 },
}));

function ProposalFooter({ t }: { t: PdfTheme }) {
  return <DocumentFooter t={t} tr={traducir("es")} config={null} notes="Pime Panamá · Propuesta Comercial Confidencial" />;
}

interface ProyectoPropuestaPdfProps {
  project: Project;
  client: Client | null;
  company: Partial<CompanyConfig> | null;
  content: ProposalContent;
  /** Línea de los clientes del proyecto: si uno es premium, premium. */
  linea: PdfLinea;
}

export function ProyectoPropuestaPdf({ project, client, company, content, linea }: ProyectoPropuestaPdfProps) {
  const t = temaDe(linea);
  const today = fmtDate(new Date(), "es");
  const s = estilos(t);

  return (
    <Document
      title={`Propuesta comercial — ${project.name}`}
      author={company?.name ?? "PIME PANAMA"}
      creator="Pime Communications Suite"
    >
      <CoverPage t={t}
        eyebrow={`Propuesta comercial · ${project.name}`}
        title={project.name}
        subtitle={project.aiSummary ?? project.description ?? "Propuesta de desarrollo a medida preparada para su equipo."}
        preparedFor={client?.company ?? client?.name ?? "—"}
        date={today}
      />

      {/* Resumen ejecutivo */}
      <Page size="LETTER" style={s.page}>
        <ProposalPageHeader t={t} section="Resumen ejecutivo" />
        <View style={s.body}>
          <SectionIntro t={t}
            eyebrow="01 · Resumen ejecutivo"
            title="Los pilares de este proyecto"
            subtitle="Una vista rápida de lo que construimos, por qué este enfoque, y el resultado esperado."
          />
          <View style={s.grid3}>
            {content.pillars.slice(0, 3).map((pillar, i) => (
              <View key={i} style={s.pillarCard}>
                <GradientChip t={t} size={22} fontSize={9}>{i + 1}</GradientChip>
                <Text style={s.pillarText}>{pillar}</Text>
              </View>
            ))}
          </View>
          <View style={s.twoCol}>
            <View style={s.colCard}>
              <Text style={s.colTitle}>Qué estamos construyendo</Text>
              <Parrafos text={content.whatWereBuilding} style={s.colBody} />
            </View>
            <View style={s.colCard}>
              <Text style={s.colTitle}>Por qué este enfoque</Text>
              <Parrafos text={content.whyThisApproach} style={s.colBody} />
            </View>
          </View>
        </View>
        <ProposalFooter t={t} />
      </Page>

      {/* Contexto y objetivo */}
      <Page size="LETTER" style={s.page}>
        <ProposalPageHeader t={t} section="Contexto y objetivo" />
        <View style={s.body}>
          <SectionIntro t={t} eyebrow="02 · Contexto" title="El problema que resolvemos" />
          <View style={s.paraCard}>
            <Parrafos text={content.contextObjective} style={s.paraText} />
          </View>
        </View>
        <ProposalFooter t={t} />
      </Page>

      {/* Arquitectura */}
      <Page size="LETTER" style={s.page}>
        <ProposalPageHeader t={t} section="Arquitectura" />
        <View style={s.body}>
          <SectionIntro t={t}
            eyebrow="03 · Arquitectura y stack"
            title="Cómo está construido"
            subtitle="Explicado en lenguaje ejecutivo, sin jerga técnica innecesaria."
          />
          <View style={s.archRow} wrap={false}>
            <View style={s.archCard}>
              <Text style={s.archTitle}>Interfaz</Text>
              <Parrafos text={content.architecture.frontend} style={s.archBody} />
            </View>
            <View style={s.archCard}>
              <Text style={s.archTitle}>Datos y backend</Text>
              <Parrafos text={content.architecture.backend} style={s.archBody} />
            </View>
            <View style={s.archCard}>
              <Text style={s.archTitle}>Infraestructura</Text>
              <Parrafos text={content.architecture.infra} style={s.archBody} />
            </View>
          </View>
          <View style={s.pillsRow}>
            {content.architecture.attributes.map((attr, i) => (
              <Pill t={t} key={i} variant="outline">{attr}</Pill>
            ))}
          </View>
        </View>
        <ProposalFooter t={t} />
      </Page>

      {/* Fases y cronograma */}
      <Page size="LETTER" style={s.page}>
        <ProposalPageHeader t={t} section="Fases y cronograma" />
        <View style={s.body}>
          <SectionIntro t={t} eyebrow="04 · Fases y cronograma" title="Cómo avanzamos" />
          <View style={s.methodologyNote}>
            <Text style={s.methodologyText}>
              Cada fase se aprueba y factura de forma independiente: ninguna fase es obligatoria para
              avanzar, las fases opcionales se aprueban cuando usted lo decida, y los cronogramas pueden
              traslaparse — no es necesario cerrar una fase por completo para iniciar la siguiente.
            </Text>
          </View>
          <View style={s.phaseGrid}>
            {content.phases.map((phase, i) => (
              <View key={i} style={s.phaseGridItem}>
                <PhaseCard t={t}
                  tag={phase.tag}
                  isFirstPhase={phase.isFirstPhase}
                  name={phase.name}
                  price={phase.price}
                  timeframe={phase.timeframe}
                  body={phase.body}
                  footerLabel={phase.footerLabel}
                />
              </View>
            ))}
          </View>
        </View>
        <ProposalFooter t={t} />
      </Page>

      {/* Inversión */}
      <Page size="LETTER" style={s.page}>
        <ProposalPageHeader t={t} section="Inversión" />
        <View style={s.body}>
          <SectionIntro t={t} eyebrow="05 · Inversión" title="Detalle por fase" />
          <View style={s.table}>
            <View style={s.tableHeaderRow}>
              <Text style={[s.tableHeaderCell, { flex: 2 }]}>Fase</Text>
              <Text style={[s.tableHeaderCell, { flex: 1 }]}>Plazo</Text>
              <Text style={[s.tableHeaderCell, { flex: 1, textAlign: "right" }]}>Inversión</Text>
            </View>
            {content.phases.map((phase, i) => (
              <View key={i} style={s.tableRow}>
                <Text style={[s.tableCellStrong, { flex: 2 }]}>{phase.name}</Text>
                <Text style={[s.tableCell, { flex: 1 }]}>{phase.timeframe}</Text>
                <Text style={[s.tableCellStrong, { flex: 1, textAlign: "right" }]}>{phase.price}</Text>
              </View>
            ))}
          </View>
          <View style={s.paraCard}>
            <Parrafos text={content.investmentNote} style={s.paraText} />
          </View>
        </View>
        <ProposalFooter t={t} />
      </Page>

      {/* Alcance */}
      <Page size="LETTER" style={s.page}>
        <ProposalPageHeader t={t} section="Alcance" />
        <View style={s.body}>
          <SectionIntro t={t} eyebrow="06 · Alcance" title="Qué incluye y qué no" />
          <View style={s.twoCol}>
            <View style={s.scopeCol}>
              <Text style={s.scopeColTitle}>Incluye</Text>
              <CheckList t={t} items={content.scopeIncludes} variant="check" />
            </View>
            <View style={s.scopeCol}>
              <Text style={s.scopeColTitle}>No incluye</Text>
              <CheckList t={t} items={content.scopeExcludes} variant="x" />
            </View>
          </View>
        </View>
        <ProposalFooter t={t} />
      </Page>

      <ClosingPage t={t} sectionTag="Cierre" title="Cómo comenzamos" steps={content.closingSteps} />
    </Document>
  );
}
