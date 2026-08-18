import { Page, View, Text, Svg, Defs, RadialGradient, Stop, Rect, Circle, StyleSheet } from "@react-pdf/renderer";
import { COLORS, FONTS, PAGE } from "../tokens";

const s = StyleSheet.create({
  page: { backgroundColor: COLORS.ink, fontFamily: FONTS.body, color: COLORS.white },
  content: { position: "relative", padding: "28pt 26pt", height: PAGE.height - 4, display: "flex", flexDirection: "column" },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brandName: { fontFamily: FONTS.heading, fontWeight: 800, fontSize: 11, color: COLORS.white },
  sectionTag: { fontSize: 8, letterSpacing: 1.4, textTransform: "uppercase", color: "rgba(255,255,255,0.45)", fontWeight: 600 },
  eyebrow: { fontFamily: FONTS.body, fontWeight: 700, fontSize: 9.5, letterSpacing: 1.6, textTransform: "uppercase", color: "#7FB8FF" },
  title: { fontFamily: FONTS.heading, fontWeight: 800, fontSize: 24, marginTop: 6, lineHeight: 1.16, color: COLORS.white },
  steps: { marginTop: 22, display: "flex", flexDirection: "column", gap: 14 },
  // Solid grays, not rgba() — react-pdf's border-color resolver mis-renders rgba() as a debug green.
  step: { flexDirection: "row", gap: 12, alignItems: "flex-start", borderBottomWidth: 1, borderBottomColor: "#262A34", paddingBottom: 14 },
  stepNum: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1.2, borderColor: "#6B707C",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  stepNumText: { fontFamily: FONTS.heading, fontWeight: 800, fontSize: 9.5, color: COLORS.white },
  stepTitle: { fontFamily: FONTS.body, fontWeight: 700, fontSize: 10, color: COLORS.white },
  stepDesc: { fontFamily: FONTS.body, fontSize: 8.6, color: "#A8ACB8", marginTop: 3 },
  spacer: { flex: 1 },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "#262A34",
    paddingTop: 12,
  },
  companyName: { fontFamily: FONTS.heading, fontWeight: 800, fontSize: 12.5, color: COLORS.white },
  companySub: { fontSize: 8.2, color: "#9297A3", marginTop: 3 },
  bottomRight: { textAlign: "right" },
  bottomText: { fontSize: 8.2, color: "#9297A3" },
});

function BackgroundBlobs() {
  // gradientUnits="userSpaceOnUse" so cx/cy/r are real page-pixel coordinates — the SVG default
  // (objectBoundingBox) resolves 0..1 against each *shape's own* box, not the page, which put the
  // blob centers in the wrong place and made them read as almost invisible.
  return (
    <Svg width={PAGE.width} height={PAGE.height} style={{ position: "absolute", top: 0, left: 0 }}>
      <Defs>
        <RadialGradient id="blobPurple" gradientUnits="userSpaceOnUse" cx={PAGE.width * 0.85} cy={PAGE.height * 0.15} r={PAGE.width * 0.5}>
          <Stop offset="0" stopColor={COLORS.purple} stopOpacity={0.45} />
          <Stop offset="1" stopColor={COLORS.purple} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="blobBlue" gradientUnits="userSpaceOnUse" cx={PAGE.width * 0.1} cy={PAGE.height * 0.9} r={PAGE.width * 0.5}>
          <Stop offset="0" stopColor={COLORS.blue} stopOpacity={0.4} />
          <Stop offset="1" stopColor={COLORS.blue} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width={PAGE.width} height={PAGE.height} fill={COLORS.ink} />
      <Circle cx={PAGE.width * 0.85} cy={PAGE.height * 0.15} r={PAGE.width * 0.5} fill="url(#blobPurple)" />
      <Circle cx={PAGE.width * 0.1} cy={PAGE.height * 0.9} r={PAGE.width * 0.5} fill="url(#blobBlue)" />
    </Svg>
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
          <Text style={s.brandName}>PIME</Text>
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
