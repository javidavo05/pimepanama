import { Document, View, Text } from "@react-pdf/renderer";
import { FONTS } from "../tokens";
import { porTema, temaDe, type PdfLinea, type PdfTheme } from "../tema";
import { t as traducir } from "../translations";
import { DocPage } from "../components/doc-page";
import { DocumentHeader, type MetaDato } from "../components/document-header";
import { DocumentFooter } from "../components/document-footer";
import { ClientBlock } from "../components/client-block";
import { NotesBlock } from "../components/notes-block";
import { SignatureBlock } from "../components/signature-block";
import type { Contract, Client, CompanyConfig } from "@prisma/client";

const estilos = porTema((th) => ({
  title: { fontFamily: FONTS.heading, fontWeight: 800, fontSize: 17, color: th.ink, marginBottom: 18, lineHeight: 1.2 },
}));

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "BORRADOR",
  ACTIVE: "ACTIVO",
  COMPLETED: "COMPLETADO",
  CANCELLED: "CANCELADO",
};

function fmtMoney(value: number | null | undefined): string {
  if (value == null) return "—";
  return `USD ${Number(value).toLocaleString("es-PA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("es-PA", { day: "2-digit", month: "long", year: "numeric" });
}

function Titulo({ t, children }: { t: PdfTheme; children: string }) {
  const s = estilos(t);
  return <Text style={s.title}>{children}</Text>;
}

interface ContratoPdfProps {
  contract: Contract;
  client: Client | null;
  company: Partial<CompanyConfig> | null;
  /** Línea del cliente del contrato (o de los clientes del proyecto: si uno es premium, premium). */
  linea: PdfLinea;
}

export function ContratoPdf({ contract, client, company, linea }: ContratoPdfProps) {
  const t = temaDe(linea);
  const tr = traducir("es");
  const meta: MetaDato[] = [
    { label: "Vigencia desde", value: fmtDate(contract.startsAt) },
    { label: "Vigencia hasta", value: fmtDate(contract.endsAt) },
    { label: "Valor del contrato", value: fmtMoney(contract.value ? Number(contract.value) : null), strong: true },
  ];
  return (
    <Document title={`Contrato — ${contract.title}`} author={company?.name ?? "PIME PANAMA"} creator="Pime Communications Suite">
        <DocPage t={t}>
          <DocumentHeader t={t}
            docLabel="CONTRATO"
            docNumber={contract.id.slice(-8).toUpperCase()}
            statusLabel={STATUS_LABEL[contract.status] ?? contract.status}
            statusVariant={contract.status === "ACTIVE" ? "solid" : "outline"}
            meta={meta}
          />
          <View wrap={false}>
            <Titulo t={t}>{contract.title}</Titulo>
          </View>
          <ClientBlock t={t}
            tr={tr}
            billToLabel="CLIENTE"
            client={{ name: client?.name, company: client?.company, ruc: client?.ruc, email: client?.email }}
            company={company}
          />
          <NotesBlock t={t} label="ALCANCE Y DESCRIPCIÓN" text={contract.description} />
          <NotesBlock t={t} label="RESPONSABILIDADES" text={contract.responsibilities} />
          <NotesBlock t={t} label="TÉRMINOS Y CONDICIONES" text={contract.terms} />
          <SignatureBlock t={t} tr={tr} showAcceptance acceptanceText="Al firmar el presente contrato, ambas partes aceptan los términos y condiciones aquí descritos." />
          <DocumentFooter t={t} tr={tr} config={company} notes={`${company?.name ?? "Pime Panamá"} · Contrato confidencial`} />
        </DocPage>
    </Document>
  );
}
