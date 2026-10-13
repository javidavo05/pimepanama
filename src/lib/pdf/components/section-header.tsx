import { View, Text, Image } from "@react-pdf/renderer";
import { FONTS, SPACING, MARGEN } from "../tokens";
import { porTema, type PdfTheme } from "../tema";
import { brandPng } from "../brand-assets";

const estilos = porTema((t) => ({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: MARGEN.lado,
    paddingTop: 26,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: t.line,
    marginBottom: SPACING.lg,
  },
  logo: { width: 70, height: 20, objectFit: "contain" },
  section: { fontFamily: FONTS.body, fontWeight: 700, fontSize: 7.6, color: t.slateLight, letterSpacing: 0.8 },
  wrap: { marginBottom: SPACING.lg },
  eyebrow: { flexDirection: "row", alignItems: "center" },
  bar: { width: 12, height: 1.8, borderRadius: 1, backgroundColor: t.accent, marginRight: 7 },
  eyebrowText: { fontFamily: FONTS.body, fontWeight: 700, fontSize: 8.2, letterSpacing: 1.2, textTransform: "uppercase", color: t.accentText },
  title: { fontFamily: FONTS.heading, fontWeight: 800, fontSize: 18, color: t.ink, marginTop: 6, lineHeight: 1.15 },
  subtitle: { fontFamily: FONTS.body, fontSize: 9, color: t.slate, lineHeight: 1.6, marginTop: 8, maxWidth: 400 },
}));

/** design-system §4.2 — encabezado de página interna: logo de la línea a la izquierda, sección a la derecha. */
export function ProposalPageHeader({ t, section }: { t: PdfTheme; section: string }) {
    const s = estilos(t);
  return (
    <View style={s.header}>
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <Image style={s.logo} src={brandPng(t.logoColor)} />
      <Text style={s.section}>{section.toUpperCase()}</Text>
    </View>
  );
}

/** design-system §4.4 — eyebrow + título + bajada opcional, arriba de cada página de contenido. */
export function SectionIntro({ t, eyebrow, title, subtitle }: { t: PdfTheme; eyebrow: string; title: string; subtitle?: string }) {
  const s = estilos(t);
  return (
    <View style={s.wrap} wrap={false}>
      <View style={s.eyebrow}>
        <View style={s.bar} />
        <Text style={s.eyebrowText}>{eyebrow}</Text>
      </View>
      <Text style={s.title}>{title}</Text>
      {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}
