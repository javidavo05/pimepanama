import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { pageStyles, COLORS, FONTS, SPACING, RADIUS } from "../tokens";
import { t } from "../translations";
import { DocumentHeader } from "../components/document-header";
import { DocumentFooter } from "../components/document-footer";
import { NotesBlock } from "../components/notes-block";
import { SignatureBlock } from "../components/signature-block";
import { Pill } from "../components/pill";
import type { Contract, Client, CompanyConfig } from "@prisma/client";

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
  titleRow: { marginBottom: SPACING.lg },
  title: { fontFamily: FONTS.heading, fontWeight: 800, fontSize: 17, color: COLORS.ink, marginBottom: 6 },
  metaRow: { flexDirection: "row", gap: SPACING.md, marginBottom: SPACING.lg },
  metaCard: {
    flex: 1,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: RADIUS.card,
    padding: SPACING.md,
  },
  metaLabel: { fontFamily: FONTS.body, fontWeight: 700, fontSize: 6.6, color: COLORS.blue, letterSpacing: 1.2, marginBottom: 3 },
  metaValue: { fontFamily: FONTS.body, fontWeight: 600, fontSize: 9, color: COLORS.ink },
  partiesRow: { flexDirection: "row", gap: SPACING.md, marginBottom: SPACING.lg },
  partyCard: {
    flex: 1,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: RADIUS.card,
    padding: SPACING.md,
  },
  partyLabel: { fontFamily: FONTS.body, fontWeight: 700, fontSize: 7, color: COLORS.blue, letterSpacing: 1.4, marginBottom: SPACING.xs },
  partyName: { fontFamily: FONTS.heading, fontWeight: 700, fontSize: 10.5, color: COLORS.ink, marginBottom: 2 },
  partyDetail: { fontFamily: FONTS.body, fontSize: 8, color: COLORS.slate, lineHeight: 1.55 },
});

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador",
  ACTIVE: "Activo",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado",
};

function fmtMoney(value: number | null | undefined): string {
  if (value == null) return "—";
  return `USD ${Number(value).toLocaleString("es-PA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("es-PA", { day: "2-digit", month: "long", year: "numeric" });
}

interface ContratoPdfProps {
  contract: Contract;
  client: Client | null;
  company: Partial<CompanyConfig> | null;
  logoSrc: string;
}

export function ContratoPdf({ contract, client, company, logoSrc }: ContratoPdfProps) {
  const tr = t("es");
  return (
    <Document
      title={`Contrato — ${contract.title}`}
      author={company?.name ?? "PIME PANAMA"}
      creator="Pime Communications Suite"
    >
      <Page size="LETTER" style={s.page}>
        <DocumentHeader
          config={company}
          docLabel="CONTRATO"
          docNumber={contract.id.slice(-8).toUpperCase()}
          logoSrc={logoSrc}
        />
        <View style={s.body}>
          <View style={s.titleRow}>
            <Text style={s.title}>{contract.title}</Text>
            <Pill variant={contract.status === "ACTIVE" ? "solid" : "outline"}>
              {STATUS_LABEL[contract.status] ?? contract.status}
            </Pill>
          </View>

          <View style={s.partiesRow} wrap={false}>
            <View style={s.partyCard}>
              <Text style={s.partyLabel}>PRESTADOR DE SERVICIOS</Text>
              <Text style={s.partyName}>{company?.name ?? "Pime Panamá"}</Text>
              {company?.ruc && <Text style={s.partyDetail}>RUC: {company.ruc}</Text>}
              {company?.address && <Text style={s.partyDetail}>{company.address}</Text>}
            </View>
            <View style={s.partyCard}>
              <Text style={s.partyLabel}>CLIENTE</Text>
              <Text style={s.partyName}>{client?.name ?? "—"}</Text>
              {client?.company && <Text style={s.partyDetail}>{client.company}</Text>}
              {client?.ruc && <Text style={s.partyDetail}>RUC: {client.ruc}</Text>}
              {client?.email && <Text style={s.partyDetail}>{client.email}</Text>}
            </View>
          </View>

          <View style={s.metaRow} wrap={false}>
            <View style={s.metaCard}>
              <Text style={s.metaLabel}>VIGENCIA DESDE</Text>
              <Text style={s.metaValue}>{fmtDate(contract.startsAt)}</Text>
            </View>
            <View style={s.metaCard}>
              <Text style={s.metaLabel}>VIGENCIA HASTA</Text>
              <Text style={s.metaValue}>{fmtDate(contract.endsAt)}</Text>
            </View>
            <View style={s.metaCard}>
              <Text style={s.metaLabel}>VALOR DEL CONTRATO</Text>
              <Text style={s.metaValue}>{fmtMoney(contract.value ? Number(contract.value) : null)}</Text>
            </View>
          </View>

          <NotesBlock label="ALCANCE Y DESCRIPCIÓN" text={contract.description} />
          <NotesBlock label="RESPONSABILIDADES" text={contract.responsibilities} />
          <NotesBlock label="TÉRMINOS Y CONDICIONES" text={contract.terms} />

          <SignatureBlock
            tr={tr}
            showAcceptance
            acceptanceText="Al firmar el presente contrato, ambas partes aceptan los términos y condiciones aquí descritos."
          />
        </View>
        <DocumentFooter
          tr={tr}
          config={company}
          notes={`${company?.name ?? "Pime Panamá"} · Contrato Confidencial`}
        />
      </Page>
    </Document>
  );
}
