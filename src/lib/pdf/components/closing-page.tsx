import { Page, View, Text, Svg, Rect, Image, StyleSheet } from "@react-pdf/renderer";
import { CapasOutline } from "./gradient";
import { brandPng } from "../brand-assets";
import { COLORS, FONTS, PAGE } from "../tokens";

const s = StyleSheet.create({
  page: { backgroundColor: COLORS.ink, fontFamily: FONTS.body, color: COLORS.white },
  content: { position: "relative", padding: "28pt 26pt", height: PAGE.height - 4, display: "flex", flexDirection: "column" },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brandName: { fontFamily: FONTS.heading, fontWeight: 800, fontSize: 11, color: COLORS.white },
  sectionTag: { fontSize: 8, letterSpacing: 1.4, textTransform: "uppercase", color: "rgba(255,255,255,0.45)", fontWeight: 600 },
  eyebrow: { fontFamily: FONTS.body, fontWeight: 700, fontSize: 9.5, letterSpacing: 1.6, textTransform: "uppercase", color: COLORS.purple },
  title: { fontFamily: FONTS.heading, fontWeight: 800, fontSize: 24, marginTop: 6, lineHeight: 1.16, color: COLORS.white },
  steps: { marginTop: 22, display: "flex", flexDirection: "column", gap: 14 },
  // Solid grays, not rgba() — react-pdf's border-color resolver mis-renders rgba() as a debug green.
  step: { flexDirection: "row", gap: 12, alignItems: "flex-start", borderBottomWidth: 1, borderBottomColor: "#1F2F4D", paddingBottom: 14 },
  stepNum: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1.2, borderColor: "#6FA8FF",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  stepNumText: { fontFamily: FONTS.heading, fontWeight: 800, fontSize: 9.5, color: COLORS.white },
  stepTitle: { fontFamily: FONTS.body, fontWeight: 700, fontSize: 10, color: COLORS.white },
  stepDesc: { fontFamily: FONTS.body, fontSize: 8.6, color: "#AEB8CC", marginTop: 3 },
  spacer: { flex: 1 },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "#1F2F4D",
    paddingTop: 12,
  },
  companyName: { fontFamily: FONTS.heading, fontWeight: 800, fontSize: 12.5, color: COLORS.white },
  companySub: { fontSize: 8.2, color: "#8792A8", marginTop: 3 },
  bottomRight: { textAlign: "right" },
  bottomText: { fontSize: 8.2, color: "#8792A8" },
});

function BackgroundBlobs() {
  // Marca «Capas abiertas»: fondo azul tinta liso y el símbolo grande en contorno, sangrado a la derecha.
  return (
    <View style={{ position: "absolute", top: 0, left: 0, width: PAGE.width, height: PAGE.height }}>
      <Svg width={PAGE.width} height={PAGE.height} style={{ position: "absolute", top: 0, left: 0 }}>
        <Rect x="0" y="0" width={PAGE.width} height={PAGE.height} fill={COLORS.ink} />
      </Svg>
      <View style={{ position: "absolute", left: PAGE.width - 220, top: 330 }}>
        <CapasOutline size={400} color={COLORS.purple} opacity={0.2} />
      </View>
    </View>
  );
}

interface ClosingPageProps {
  sectionTag: string;
  title: string;
  steps: { title: string; description: string }[];
}

/** Design-system §4.13 — the ONE dark page in the document, reserved for the close. */
export function ClosingPage({ sectionTag, title, steps }: ClosingPageProps) {
  return (
    <Page size="LETTER" style={s.page}>
      <BackgroundBlobs />
      <View style={s.content}>
        <View style={s.topRow}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={brandPng("pime-normal-horizontal-invertido.png")} style={{ width: 77, height: 22, objectFit: "contain" }} />
          <Text style={s.sectionTag}>{sectionTag}</Text>
        </View>

        <View style={{ marginTop: 20 }}>
          <Text style={s.eyebrow}>Próximos pasos</Text>
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
