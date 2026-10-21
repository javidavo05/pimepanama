import { Page, View, Text, Image } from "@react-pdf/renderer";
import { FONTS, PAGE } from "../tokens";
import { porTema, type PdfTheme } from "../tema";
import { brandPng } from "../brand-assets";
import { GradientBar, CapasOutline } from "./gradient";
import { Pill } from "./pill";

const estilos = porTema((t) => {
  const oscuro = t.linea === "premium";
  const tc = oscuro ? t.white : t.ink;
  const muted = oscuro ? t.onDarkMuted : t.slateLight;
  return {
    page: { backgroundColor: oscuro ? t.dark : t.paper, fontFamily: FONTS.body, color: tc },
    deco: { position: "absolute", left: PAGE.width - 190, top: 250 },
    content: { position: "relative", padding: "50pt 51pt 40pt 51pt", height: PAGE.height - 5, display: "flex", flexDirection: "column" },
    topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    logo: { width: 98, height: 28, objectFit: "contain" },
    tag: { fontSize: 7.5, letterSpacing: 1.4, textTransform: "uppercase", color: muted, fontWeight: 700 },
    middle: { flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" },
    sello: { marginBottom: 20 },
    eyebrow: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
    bar: { width: 12, height: 1.8, borderRadius: 1, backgroundColor: oscuro ? t.accentOnDark : t.accent, marginRight: 8 },
    eyebrowText: { fontFamily: FONTS.body, fontWeight: 700, fontSize: 9, letterSpacing: 1.4, textTransform: "uppercase", color: oscuro ? t.accentOnDark : t.accentText },
    title: { fontFamily: FONTS.heading, fontWeight: 800, fontSize: 30, lineHeight: 1.14, maxWidth: 400, letterSpacing: -0.6, color: tc },
    accentLine: { width: 62, height: 2, backgroundColor: t.accent, marginTop: 20, marginBottom: 20 },
    subtitle: { fontSize: 11, color: oscuro ? t.onDarkSoft : t.slate, maxWidth: 340, lineHeight: 1.7, fontWeight: 400 },
    metaRow: { flexDirection: "row", marginTop: 34 },
    meta: { marginRight: 38 },
    metaLabel: { fontSize: 7, color: muted, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, marginBottom: 5 },
    metaValue: { fontSize: 10, fontWeight: 600, color: tc },
    bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderTopWidth: 1, borderTopColor: oscuro ? t.onDarkLine : t.line, paddingTop: 14 },
    bottomText: { fontSize: 7.6, color: muted, fontWeight: 500 },
  };
});

interface CoverPageProps {
  t: PdfTheme;
  eyebrow: string;
  title: string;
  subtitle: string;
  preparedFor: string;
  preparedBy?: string;
  date: string;
  brandTag?: string;
  /** Etiquetas fijas de la portada; por defecto en español. */
  etiquetas?: { para: string; por: string; fecha: string; pie: string };
}

const ETIQUETAS_ES = { para: "Preparado para", por: "Preparado por", fecha: "Fecha", pie: "Documento confidencial · Preparado exclusivamente para el destinatario" };

/**
 * design-system §4.1 — Portada. Normal: blanca, banda de tres capas y logo a color.
 * Premium: negra, filete de oro, logo invertido y sello «Confidencial».
 */
export function CoverPage({ t, eyebrow, title, subtitle, preparedFor, preparedBy = "Pime Panamá", date, brandTag = "Panamá · Desarrollo de software", etiquetas = ETIQUETAS_ES }: CoverPageProps) {
    const s = estilos(t);
  const oscuro = t.linea === "premium";
  return (
    <Page size="LETTER" style={s.page}>
      <GradientBar t={t} width={PAGE.width} height={oscuro ? 3.4 : 5} />
      <View style={s.deco}>
        <CapasOutline size={330} color={oscuro ? t.accent : t.line} opacity={oscuro ? 0.3 : 1} strokeWidth={oscuro ? 1.6 : 1.4} />
      </View>
      <View style={s.content}>
        <View style={s.topRow}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image style={s.logo} src={brandPng(oscuro ? t.logoInvertido : t.logoColor)} />
          <Text style={s.tag}>{brandTag}</Text>
        </View>

        <View style={s.middle}>
          {oscuro ? (
            <View style={s.sello}>
              <Pill t={t} variant="sello">CONFIDENCIAL</Pill>
            </View>
          ) : null}
          <View style={s.eyebrow}>
            <View style={s.bar} />
            <Text style={s.eyebrowText}>{eyebrow}</Text>
          </View>
          <Text style={s.title}>{title}</Text>
          <View style={s.accentLine} />
          <Text style={s.subtitle}>{subtitle}</Text>

          <View style={s.metaRow}>
            {[
              [etiquetas.para, preparedFor],
              [etiquetas.por, preparedBy],
              [etiquetas.fecha, date],
            ].map(([k, v]) => (
              <View key={k} style={s.meta}>
                <Text style={s.metaLabel}>{k}</Text>
                <Text style={s.metaValue}>{v}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.bottomRow}>
          <Text style={s.bottomText}>{etiquetas.pie}</Text>
          <Text style={s.bottomText}>pimepanama.com</Text>
        </View>
      </View>
    </Page>
  );
}
