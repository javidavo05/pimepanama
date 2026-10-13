import { Page, View, Text, Image } from "@react-pdf/renderer";
import { CapasOutline } from "./gradient";
import { brandPng } from "../brand-assets";
import { FONTS, PAGE } from "../tokens";
import { porTema, type PdfTheme } from "../tema";

const estilos = porTema((t) => ({
  page: { backgroundColor: t.dark, fontFamily: FONTS.body, color: t.white },
  deco: { position: "absolute", left: PAGE.width - 220, top: 330 },
  content: { position: "relative", padding: "50pt 51pt 40pt 51pt", height: PAGE.height, display: "flex", flexDirection: "column" },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logo: { width: 70, height: 20, objectFit: "contain" },
  sectionTag: { fontSize: 7.8, letterSpacing: 1, textTransform: "uppercase", color: t.onDarkMuted, fontWeight: 700 },
  eyebrow: { flexDirection: "row", alignItems: "center" },
  bar: { width: 12, height: 1.8, borderRadius: 1, backgroundColor: t.accentOnDark, marginRight: 8 },
  eyebrowText: { fontFamily: FONTS.body, fontWeight: 700, fontSize: 9, letterSpacing: 1.4, textTransform: "uppercase", color: t.accentOnDark },
  title: { fontFamily: FONTS.heading, fontWeight: 800, fontSize: 24, marginTop: 8, lineHeight: 1.16, color: t.white },
  steps: { marginTop: 26, display: "flex", flexDirection: "column", maxWidth: 400 },
  step: { flexDirection: "row", alignItems: "flex-start", borderBottomWidth: 1, borderBottomColor: t.onDarkLine, paddingBottom: 14, marginBottom: 14 },
  stepNum: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.2, borderColor: t.accentOnDark, alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 12 },
  stepNumText: { fontFamily: FONTS.heading, fontWeight: 800, fontSize: 9.5, color: t.accentOnDark },
  stepTitle: { fontFamily: FONTS.body, fontWeight: 700, fontSize: 10, color: t.white },
  stepDesc: { fontFamily: FONTS.body, fontSize: 8.6, color: t.onDarkSoft, marginTop: 3, lineHeight: 1.55 },
  spacer: { flex: 1 },
  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderTopWidth: 1, borderTopColor: t.onDarkLine, paddingTop: 14 },
  companyName: { fontFamily: FONTS.heading, fontWeight: 800, fontSize: 12.5, color: t.white },
  companySub: { fontSize: 8.2, color: t.onDarkSoft, marginTop: 3 },
  bottomRight: { textAlign: "right" },
  bottomText: { fontSize: 8.2, color: t.onDarkSoft },
}));

interface ClosingPageProps {
  t: PdfTheme;
  sectionTag: string;
  title: string;
  steps: { title: string; description: string }[];
}

/** design-system §4.13 — Cierre en el oscuro de la línea (azul tinta o negro) con el símbolo en contorno. */
export function ClosingPage({ t, sectionTag, title, steps }: ClosingPageProps) {
    const s = estilos(t);
  return (
    <Page size="LETTER" style={s.page}>
      <View style={s.deco}>
        <CapasOutline size={400} color={t.accentOnDark} opacity={0.2} />
      </View>
      <View style={s.content}>
        <View style={s.topRow}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={brandPng(t.logoInvertido)} style={s.logo} />
          <Text style={s.sectionTag}>{sectionTag}</Text>
        </View>

        <View style={{ marginTop: 44 }}>
          <View style={s.eyebrow}>
            <View style={s.bar} />
            <Text style={s.eyebrowText}>Próximos pasos</Text>
          </View>
          <Text style={s.title}>{title}</Text>
          <View style={s.steps}>
            {steps.map((step, i) => (
              <View key={i} style={s.step} wrap={false}>
                <View style={s.stepNum}>
                  <Text style={s.stepNumText}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.stepTitle}>{step.title}</Text>
                  <Text style={s.stepDesc}>{step.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={s.spacer} />

        <View style={s.bottomRow}>
          <View>
            <Text style={s.companyName}>Pime Panamá</Text>
            <Text style={s.companySub}>Desarrollo de software empresarial · Panamá</Text>
          </View>
          <View style={s.bottomRight}>
            <Text style={s.bottomText}>pimepanama.com</Text>
            <Text style={[s.bottomText, { marginTop: 3 }]}>Gracias por la confianza.</Text>
          </View>
        </View>
      </View>
    </Page>
  );
}
