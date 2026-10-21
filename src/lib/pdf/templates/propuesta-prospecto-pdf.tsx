import { Document, Page, View, Text } from "@react-pdf/renderer";
import { paginaBase, FONTS, SPACING, RADIUS, MARGEN } from "../tokens";
import { porTema, temaDe, type PdfTheme } from "../tema";
import { fmtDate, t as traducir } from "../translations";
import { CoverPage } from "../components/cover-page";
import { ClosingPage } from "../components/closing-page";
import { ProposalPageHeader, SectionIntro } from "../components/section-header";
import { DocumentFooter } from "../components/document-footer";
import { CheckList } from "../components/check-list";
import { Pill } from "../components/pill";
import type { PropuestaProspecto } from "@/lib/leads/propuesta-prospecto";

/**
 * Propuesta corta para un prospecto (src/lib/leads/propuesta-prospecto.ts): portada, lo que vimos, qué
 * construiríamos, lo que viene después (fijo) y próximos pasos. Siempre línea normal: el prospecto no tiene
 * categoría todavía.
 */

type Idioma = "es" | "en";

const T = {
  es: {
    vimosSeccion: "Lo que vimos",
    vimosEyebrow: "01 · Lo que vimos",
    vimosSub: "Todo lo de esta página sale de su presencia pública. No conocemos su operación interna: por eso es una propuesta para validar, no un diagnóstico.",
    duele: "Dónde suele doler",
    bien: "Lo que ya tienen bien",
    propSeccion: "Propuesta",
    propEyebrow: "02 · Qué construiríamos",
    propSub: "Piezas independientes. Se aprueban y se cotizan por separado, después de conversar.",
    nota: "Ninguna fase es obligatoria para avanzar. Las opcionales se aprueban cuando ustedes decidan y los cronogramas pueden traslaparse. El precio de cada fase es cerrado y se define después de la reunión.",
    fase: "Fase",
    opcional: "Opcional",
    precio: "Precio cerrado",
    partida: "Punto de partida del proyecto",
    separado: "Se aprueba por separado",
    caso: "Caso relacionado",
    como: "Cómo trabajamos",
    despuesSeccion: "Lo que viene después",
    despuesEyebrow: "03 · Lo que viene después",
    despuesTitulo: "Lo que viene después del lanzamiento",
    despuesSub: "Costos de terceros, garantía y soporte una vez que el proyecto está en producción.",
    servicio: "Servicio de tercero",
    costo: "Costo de referencia",
    frecuencia: "Frecuencia",
    terceros: [
      ["Hosting", "Incluye 30 correos corporativos de cortesía", "~US$45 al año", "Anual"],
      ["Dominio", "", "US$10–15 al año", "Anual"],
      ["Vercel", "Publicación de la aplicación", "Gratuito. Pro (~US$20/mes) solo si el uso lo requiere", "Solo si se requiere"],
      ["Supabase", "Base de datos, usuarios y archivos", "Gratuito. Pro (~US$25/mes) solo si el uso lo requiere", "Solo si se requiere"],
      ["Cloudflare", "Almacenamiento de imágenes y documentos", "Gratuito", "Sin costo"],
      ["Modelo de IA", "", "Variable según uso, en la cuenta del cliente", "Según uso"],
    ],
    tercerosNota: "Valores aproximados, en cuentas a nombre del cliente y sujetos al precio vigente de cada proveedor. Estos pagos los hace el cliente directamente; Pime Panamá no los cobra ni los administra.",
    recurrente: "Costo recurrente habitual del cliente: hosting y dominio",
    recurrenteMonto: "~US$55–60 al año",
    bloques: [
      ["Garantía de 3 meses", "Desde la entrega en producción. Los errores de lo construido se corrigen sin costo."],
      ["Soporte", "Lunes a viernes, de 8:00 a 17:00 (hora de Panamá), por correo o WhatsApp del proyecto."],
      ["Después: por evento", "US$30 la hora. Vencida la garantía, cada solicitud se atiende por evento, con las horas aprobadas antes. Sin cuota mensual."],
    ],
    prioridad: "Prioridad",
    ejemplo: "Ejemplo",
    respuesta: "Primera respuesta",
    prioridades: [
      ["Crítica", "", "4 horas hábiles"],
      ["Alta", "Un módulo no funciona, pero el resto sí", "1 día hábil"],
      ["Normal", "Detalle visual o mejora menor", "2 días hábiles"],
    ],
    garantiaNota: "La garantía cubre errores de lo desarrollado; no cubre cambios de alcance ni fallas de servicios de terceros.",
    cierre: "Cierre",
    cierreTitulo: "Cómo seguimos",
    pie: "Pime Panamá · Propuesta comercial confidencial",
    portada: { para: "Preparado para", por: "Preparado por", fecha: "Fecha", pie: "Documento confidencial · Preparado exclusivamente para el destinatario" },
    tagPortada: "Panamá · Desarrollo de software",
    cierreEtiquetas: { eyebrow: "Próximos pasos", sub: "Desarrollo de software empresarial · Panamá", gracias: "Gracias por la confianza." },
    pasos: [
      { titulo: "Conversación de 20 minutos", texto: "Nos cuentan cómo trabajan hoy. Validamos si esta idea les sirve." },
      { titulo: "Propuesta con precio cerrado", texto: "Si tiene sentido, en tres días hábiles les enviamos el alcance y el precio de la fase 1." },
      { titulo: "Primera entrega en dos semanas", texto: "Ven la primera pieza funcionando con sus datos reales." },
    ],
  },
  en: {
    vimosSeccion: "What we saw",
    vimosEyebrow: "01 · What we saw",
    vimosSub: "Everything on this page comes from your public presence. We don't know your internal operation, so this is a proposal to validate, not a diagnosis.",
    duele: "Where it usually hurts",
    bien: "What you already do well",
    propSeccion: "Proposal",
    propEyebrow: "02 · What we would build",
    propSub: "Independent pieces. Each one is approved and quoted separately, after we talk.",
    nota: "No phase is required to move forward. Optional phases are approved when you decide, and timelines can overlap. Each phase has a fixed price, set after our meeting.",
    fase: "Phase",
    opcional: "Optional",
    precio: "Fixed price",
    partida: "Project starting point",
    separado: "Approved separately",
    caso: "Related case",
    como: "How we work",
    despuesSeccion: "After launch",
    despuesEyebrow: "03 · After launch",
    despuesTitulo: "What comes after launch",
    despuesSub: "Third-party costs, warranty and support once the project is live.",
    servicio: "Third-party service",
    costo: "Reference cost",
    frecuencia: "Frequency",
    terceros: [
      ["Hosting", "Includes 30 complimentary business email accounts", "~US$45 per year", "Yearly"],
      ["Domain", "", "US$10–15 per year", "Yearly"],
      ["Vercel", "Application hosting", "Free. Pro (~US$20/mo) only if usage requires it", "Only if needed"],
      ["Supabase", "Database, users and files", "Free. Pro (~US$25/mo) only if usage requires it", "Only if needed"],
      ["Cloudflare", "Image and document storage", "Free", "No cost"],
      ["AI model", "", "Usage-based, on the client's account", "Usage-based"],
    ],
    tercerosNota: "Approximate values, on accounts in the client's name and subject to each provider's current pricing. The client pays these directly; Pime Panamá does not charge or manage them.",
    recurrente: "Usual recurring cost for the client: hosting and domain",
    recurrenteMonto: "~US$55–60 per year",
    bloques: [
      ["3-month warranty", "From the production release. Bugs in what we built are fixed at no cost."],
      ["Support", "Monday to Friday, 8:00 to 17:00 (Panama time, same as U.S. Eastern Standard), by email or the project's WhatsApp."],
      ["Afterwards: per request", "US$30 per hour. After the warranty, each request is handled on its own, with hours approved in advance. No monthly fee."],
    ],
    prioridad: "Priority",
    ejemplo: "Example",
    respuesta: "First response",
    prioridades: [
      ["Critical", "", "4 business hours"],
      ["High", "One module fails but the rest works", "1 business day"],
      ["Normal", "Visual detail or minor improvement", "2 business days"],
    ],
    garantiaNota: "The warranty covers bugs in what was developed; it does not cover scope changes or third-party outages.",
    cierre: "Closing",
    cierreTitulo: "Next steps",
    pie: "Pime Panamá · Confidential proposal",
    portada: { para: "Prepared for", por: "Prepared by", fecha: "Date", pie: "Confidential · Prepared exclusively for the recipient" },
    tagPortada: "Panama · Software development",
    cierreEtiquetas: { eyebrow: "Next steps", sub: "Business software development · Panama", gracias: "Thank you for your time." },
    pasos: [
      { titulo: "20-minute conversation", texto: "You tell us how you work today. We check whether this idea fits." },
      { titulo: "Fixed-price proposal", texto: "If it makes sense, within three business days we send the scope and price of phase 1." },
      { titulo: "First delivery in two weeks", texto: "You see the first piece working with your real data." },
    ],
  },
} as const;

const estilos = porTema((th) => ({
  page: { ...paginaBase(th), paddingBottom: MARGEN.abajo },
  body: { paddingHorizontal: MARGEN.lado },
  grid3: { flexDirection: "row", gap: 10, marginBottom: SPACING.lg },
  card: { flex: 1, backgroundColor: th.panel, borderWidth: 1, borderColor: th.line, borderRadius: RADIUS.card, padding: 12 },
  inicial: { width: 20, height: 20, borderRadius: RADIUS.chip, backgroundColor: th.dark, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  inicialText: { fontFamily: FONTS.heading, fontWeight: 800, fontSize: 8.6, color: th.accentOnDark },
  cardTitle: { fontFamily: FONTS.heading, fontWeight: 700, fontSize: 10, color: th.ink, marginBottom: 5, lineHeight: 1.3 },
  cardBody: { fontFamily: FONTS.body, fontSize: 8.2, color: th.slate, lineHeight: 1.55 },
  twoCol: { flexDirection: "row", gap: 16, marginBottom: SPACING.lg },
  col: { flex: 1 },
  colTitle: { fontFamily: FONTS.heading, fontWeight: 700, fontSize: 10, color: th.ink, marginBottom: 6 },
  colBody: { fontFamily: FONTS.body, fontSize: 8.8, color: th.slate, lineHeight: 1.6 },
  nota: { backgroundColor: th.panel, borderWidth: 1, borderColor: th.line, borderRadius: RADIUS.card, padding: 12, marginBottom: 14 },
  notaText: { fontFamily: FONTS.body, fontSize: 8.2, color: th.slate, lineHeight: 1.6 },
  fase: { flex: 1, borderRadius: RADIUS.block, padding: 11 },
  faseFirst: { borderWidth: 1.4, borderColor: th.ink },
  faseOpt: { borderWidth: 1, borderColor: th.line },
  faseName: { fontFamily: FONTS.heading, fontWeight: 800, fontSize: 10.5, color: th.ink, marginTop: 8 },
  fasePrecio: { fontFamily: FONTS.heading, fontWeight: 800, fontSize: 13, color: th.accentText, marginTop: 4 },
  fasePlazo: { fontFamily: FONTS.body, fontWeight: 600, fontSize: 7.4, color: th.slateLight, marginTop: 3, marginBottom: 7 },
  faseBody: { fontFamily: FONTS.body, fontSize: 8.2, color: th.slate, lineHeight: 1.55, marginBottom: 10 },
  casoCard: { flex: 1, backgroundColor: th.dark, borderRadius: RADIUS.block, padding: 16 },
  casoLabel: { fontFamily: FONTS.body, fontSize: 7.8, color: th.onDarkSoft },
  casoName: { fontFamily: FONTS.heading, fontWeight: 800, fontSize: 12, color: th.white, marginTop: 4, marginBottom: 6 },
  casoBody: { fontFamily: FONTS.body, fontSize: 8.4, color: th.onDarkSoft, lineHeight: 1.6 },
  table: { marginBottom: 10 },
  thRow: { flexDirection: "row", borderBottomWidth: 1.4, borderBottomColor: th.ink, paddingBottom: 6 },
  th: { fontFamily: FONTS.body, fontWeight: 700, fontSize: 6.8, color: th.slateLight, letterSpacing: 1, textTransform: "uppercase" },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: th.line, paddingVertical: 5 },
  td: { fontFamily: FONTS.body, fontSize: 8.4, color: th.slate },
  tdStrong: { fontFamily: FONTS.body, fontWeight: 600, fontSize: 8.4, color: th.inkSoft },
  tdSub: { fontFamily: FONTS.body, fontSize: 7, color: th.slateLight, marginTop: 2 },
  pequena: { fontFamily: FONTS.body, fontSize: 7, color: th.slateLight, lineHeight: 1.5, marginBottom: 12 },
  banda: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: th.dark, borderRadius: RADIUS.block, paddingVertical: 10, paddingHorizontal: 16, marginBottom: 12 },
  bandaText: { fontFamily: FONTS.body, fontSize: 8.4, color: th.onDarkSoft },
  bandaMonto: { fontFamily: FONTS.heading, fontWeight: 800, fontSize: 13, color: th.accentOnDark },
}));

function Pie({ t, idioma }: { t: PdfTheme; idioma: Idioma }) {
  return <DocumentFooter t={t} tr={traducir(idioma)} config={null} notes={T[idioma].pie} />;
}

export function PropuestaProspectoPdf({ empresa, idioma, propuesta: c, fecha = new Date() }: {
  empresa: string;
  idioma: Idioma;
  propuesta: PropuestaProspecto;
  fecha?: Date;
}) {
  const t = temaDe("normal");
  const s = estilos(t);
  const L = T[idioma];
  const fases = c.construiriamos.fases;

  return (
    <Document title={`${idioma === "en" ? "Proposal" : "Propuesta"} — ${empresa}`} author="Pime Panamá" creator="Pime Communications Suite">
      <CoverPage t={t}
        eyebrow={c.eyebrow}
        title={c.titulo}
        subtitle={c.subtitulo}
        preparedFor={empresa}
        date={fmtDate(fecha, idioma)}
        brandTag={L.tagPortada}
        etiquetas={L.portada}
      />

      <Page size="LETTER" style={s.page}>
        <ProposalPageHeader t={t} section={L.vimosSeccion} />
        <View style={s.body}>
          <SectionIntro t={t} eyebrow={L.vimosEyebrow} title={c.vimos.titulo} subtitle={L.vimosSub} />
          <View style={s.grid3}>
            {c.vimos.tarjetas.map((k, i) => (
              <View key={i} style={s.card} wrap={false}>
                <View style={s.inicial}><Text style={s.inicialText}>{k.titulo.trim().charAt(0).toUpperCase()}</Text></View>
                <Text style={s.cardTitle}>{k.titulo}</Text>
                <Text style={s.cardBody}>{k.texto}</Text>
              </View>
            ))}
          </View>
          <View style={s.twoCol} wrap={false}>
            <View style={s.col}>
              <Text style={s.colTitle}>{L.duele}</Text>
              <Text style={s.colBody}>{c.vimos.duele}</Text>
            </View>
            <View style={s.col}>
              <Text style={s.colTitle}>{L.bien}</Text>
              <Text style={s.colBody}>{c.vimos.bien}</Text>
            </View>
          </View>
        </View>
        <Pie t={t} idioma={idioma} />
      </Page>

      <Page size="LETTER" style={s.page}>
        <ProposalPageHeader t={t} section={L.propSeccion} />
        <View style={s.body}>
          <SectionIntro t={t} eyebrow={L.propEyebrow} title={c.construiriamos.titulo} subtitle={L.propSub} />
          <View style={s.nota}><Text style={s.notaText}>{L.nota}</Text></View>
          <View style={s.grid3}>
            {fases.map((f, i) => (
              <View key={i} style={[s.fase, i === 0 ? s.faseFirst : s.faseOpt]} wrap={false}>
                <View style={{ flexDirection: "row" }}>
                  <Pill t={t} variant={i === 0 ? "solid" : "outline"}>
                    {`${L.fase} ${i + 1}${i === 0 ? "" : ` · ${L.opcional}`}`.toUpperCase()}
                  </Pill>
                </View>
                <Text style={s.faseName}>{f.nombre}</Text>
                <Text style={s.fasePrecio}>{L.precio}</Text>
                <Text style={s.fasePlazo}>{f.plazo}</Text>
                <Text style={s.faseBody}>{f.texto}</Text>
                <View style={{ flexDirection: "row", marginTop: "auto" }}>
                  <Pill t={t} variant="outline">{i === 0 ? L.partida : L.separado}</Pill>
                </View>
              </View>
            ))}
          </View>
          <View style={s.twoCol} wrap={false}>
            {c.construiriamos.caso ? (
              <View style={s.casoCard}>
                <Text style={s.casoLabel}>{L.caso}</Text>
                <Text style={s.casoName}>{c.construiriamos.caso.nombre}</Text>
                <Text style={s.casoBody}>{c.construiriamos.caso.texto}</Text>
              </View>
            ) : null}
            <View style={s.col}>
              <Text style={s.colTitle}>{L.como}</Text>
              <CheckList t={t} items={c.construiriamos.comoTrabajamos} />
            </View>
          </View>
        </View>
        <Pie t={t} idioma={idioma} />
      </Page>

      <Page size="LETTER" style={s.page}>
        <ProposalPageHeader t={t} section={L.despuesSeccion} />
        <View style={s.body}>
          <SectionIntro t={t} eyebrow={L.despuesEyebrow} title={L.despuesTitulo} subtitle={L.despuesSub} />
          <View style={s.table}>
            <View style={s.thRow}>
              <Text style={[s.th, { flex: 2 }]}>{L.servicio}</Text>
              <Text style={[s.th, { flex: 2.4 }]}>{L.costo}</Text>
              <Text style={[s.th, { flex: 1.2 }]}>{L.frecuencia}</Text>
            </View>
            {L.terceros.map(([nombre, sub, costo, frec]) => (
              <View key={nombre} style={s.tr} wrap={false}>
                <View style={{ flex: 2 }}>
                  <Text style={s.tdStrong}>{nombre}</Text>
                  {sub ? <Text style={s.tdSub}>{sub}</Text> : null}
                </View>
                <Text style={[s.td, { flex: 2.4 }]}>{costo}</Text>
                <Text style={[s.td, { flex: 1.2 }]}>{frec}</Text>
              </View>
            ))}
          </View>
          <Text style={s.pequena}>{L.tercerosNota}</Text>
          <View style={s.banda} wrap={false}>
            <Text style={s.bandaText}>{L.recurrente}</Text>
            <Text style={s.bandaMonto}>{L.recurrenteMonto}</Text>
          </View>
          <View style={[s.grid3, { marginBottom: 14 }]} wrap={false}>
            {L.bloques.map(([titulo, texto]) => (
              <View key={titulo} style={s.card}>
                <Text style={s.cardTitle}>{titulo}</Text>
                <Text style={s.cardBody}>{texto}</Text>
              </View>
            ))}
          </View>
          <View style={s.table} wrap={false}>
            <View style={s.thRow}>
              <Text style={[s.th, { flex: 1 }]}>{L.prioridad}</Text>
              <Text style={[s.th, { flex: 3 }]}>{L.ejemplo}</Text>
              <Text style={[s.th, { flex: 1.3, textAlign: "right" }]}>{L.respuesta}</Text>
            </View>
            {L.prioridades.map(([nivel, ejemplo, plazo], i) => (
              <View key={nivel} style={s.tr}>
                <Text style={[s.tdStrong, { flex: 1 }]}>{nivel}</Text>
                <Text style={[s.td, { flex: 3 }]}>{i === 0 ? c.construiriamos.ejemploCritico : ejemplo}</Text>
                <Text style={[s.tdStrong, { flex: 1.3, textAlign: "right" }]}>{plazo}</Text>
              </View>
            ))}
            <Text style={[s.pequena, { marginTop: 8, marginBottom: 0 }]}>{L.garantiaNota}</Text>
          </View>
        </View>
        <Pie t={t} idioma={idioma} />
      </Page>

      <ClosingPage t={t} sectionTag={L.cierre} title={L.cierreTitulo}
        steps={(c.pasos.length >= 2 ? c.pasos : L.pasos).map((p) => ({ title: p.titulo, description: p.texto }))}
        etiquetas={L.cierreEtiquetas}
      />
    </Document>
  );
}
