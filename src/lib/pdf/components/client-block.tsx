import { View, Text } from "@react-pdf/renderer";
import { FONTS, RADIUS } from "../tokens";
import { porTema, type PdfTheme } from "../tema";
import type { PdfTranslations } from "../translations";
import type { CompanyConfig } from "@prisma/client";
import { Parrafos } from "./notes-block";

const estilos = porTema((t) => ({
  row: { flexDirection: "row", marginBottom: 18 },
  block: { flex: 1, backgroundColor: t.panel, borderWidth: 1, borderColor: t.line, borderRadius: RADIUS.card, padding: 12 },
  gap: { width: 12 },
  label: { fontFamily: FONTS.body, fontWeight: 700, fontSize: 6.8, color: t.accentText, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 },
  name: { fontFamily: FONTS.heading, fontWeight: 700, fontSize: 10.5, color: t.ink, marginBottom: 3 },
  detail: { fontFamily: FONTS.body, fontSize: 8, color: t.slate, lineHeight: 1.55 },
  empty: { fontFamily: FONTS.body, fontSize: 8, color: t.slateLight },
}));

export interface DatosParte {
  name?: string | null;
  company?: string | null;
  ruc?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
}

interface ClientBlockProps {
  t: PdfTheme;
  tr: PdfTranslations;
  /** Etiqueta del cliente («Facturar a», «Propuesta para», «Recibido de»). */
  billToLabel?: string;
  client: DatosParte;
  /** La empresa que emite. Va en la tarjeta de la derecha. */
  company: Partial<CompanyConfig> | null;
}

function Detalles({ p, s }: { p: DatosParte; s: ReturnType<typeof estilos> }) {
  return (
    <>
      {p.company && p.name && p.company !== p.name ? <Text style={s.detail}>{p.company}</Text> : null}
      {p.ruc ? <Text style={s.detail}>RUC: {p.ruc}</Text> : null}
      {p.address ? <Parrafos text={p.address} style={s.detail} /> : null}
      {p.phone ? <Text style={s.detail}>Tel: {p.phone}</Text> : null}
      {p.email ? <Text style={s.detail}>{p.email}</Text> : null}
      {p.website ? <Text style={s.detail}>{p.website}</Text> : null}
    </>
  );
}

/** Las dos partes del documento en dos tarjetas (`.grid2` de `.card`): cliente a la izquierda, emisor a la derecha. */
export function ClientBlock({ t, tr, billToLabel, client, company }: ClientBlockProps) {
  const s = estilos(t);
  const emisor: DatosParte = {
    name: company?.name ?? "Pime Panamá",
    ruc: company?.ruc ?? "1-NT-2-739436 DV71",
    address: company?.address ? [company.address, company.city, company.country].filter(Boolean).join(", ") : null,
    phone: company?.phone,
    email: company?.email,
    website: company?.website,
  };
  const nombre = client.name || client.company;
  return (
    <View style={s.row} wrap={false}>
      <View style={s.block}>
        <Text style={s.label}>{billToLabel ?? tr.billTo}</Text>
        {nombre ? <Text style={s.name}>{nombre}</Text> : <Text style={s.empty}>—</Text>}
        <Detalles p={client} s={s} />
      </View>
      <View style={s.gap} />
      <View style={s.block}>
        <Text style={s.label}>{tr.issuedBy}</Text>
        <Text style={s.name}>{emisor.name}</Text>
        <Detalles p={emisor} s={s} />
      </View>
    </View>
  );
}
