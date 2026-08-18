import { Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { COLORS, FONTS, PAGE } from "../tokens";
import { GradientBar } from "./gradient";

const s = StyleSheet.create({
  page: { backgroundColor: COLORS.white, fontFamily: FONTS.body, color: COLORS.ink },
  content: { position: "relative", padding: "30pt 26pt 26pt 26pt", height: PAGE.height - 6, display: "flex", flexDirection: "column" },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  logo: { width: 22, height: 22, objectFit: "contain" },
  brandName: { fontFamily: FONTS.heading, fontWeight: 800, fontSize: 13, color: COLORS.ink },
  tag: { fontSize: 7.5, letterSpacing: 1.6, textTransform: "uppercase", color: COLORS.slateLight, fontWeight: 600 },
  middle: { flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", marginTop: 10 },
  eyebrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    fontFamily: FONTS.body,
    fontWeight: 700,
    fontSize: 9.5,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: COLORS.blue,
    marginBottom: 14,
  },
  title: { fontFamily: FONTS.heading, fontWeight: 800, fontSize: 30, lineHeight: 1.16, maxWidth: 400, letterSpacing: -0.5, color: COLORS.ink },
  accentLine: { marginTop: 16, marginBottom: 16 },
  subtitle: { fontSize: 11, color: COLORS.slate, maxWidth: 340, lineHeight: 1.7, fontWeight: 400 },
  metaRow: { flexDirection: "row", gap: 34, marginTop: 30 },
  metaLabel: { fontSize: 7, color: COLORS.slateLight, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, marginBottom: 4 },
  metaValue: { fontSize: 10, fontWeight: 600, color: COLORS.ink },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    paddingTop: 12,
  },
  bottomText: { fontSize: 7.6, color: COLORS.slateLight, fontWeight: 500 },
});

interface CoverPageProps {
  logoSrc: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  preparedFor: string;
  preparedBy?: string;
  date: string;
  brandTag?: string;
}

/** Design-system §4.1 — white, serious cover. Never dark/neon here (that's reserved for ClosingPage). */
export function CoverPage({ logoSrc, eyebrow, title, subtitle, preparedFor, preparedBy = "Pime Panamá", date, brandTag = "Panamá · Desarrollo de Software" }: CoverPageProps) {
  return (
    <Page size="LETTER" style={s.page}>
      <GradientBar width={PAGE.width} height={5} />
      <View style={s.content}>
        <View style={s.topRow}>
          <View style={s.brand}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image style={s.logo} src={logoSrc} />
            <Text style={s.brandName}>PIME</Text>
          </View>
          <Text style={s.tag}>{brandTag}</Text>
        </View>

        <View style={s.middle}>
          <Text style={s.eyebrow}>{eyebrow}</Text>
          <Text style={s.title}>{title}</Text>
          <View style={s.accentLine}>
            <GradientBar width={62} height={2.4} />
          </View>
          <Text style={s.subtitle}>{subtitle}</Text>

          <View style={s.metaRow}>
            <View>
              <Text style={s.metaLabel}>Preparado para</Text>
              <Text style={s.metaValue}>{preparedFor}</Text>
            </View>
            <View>
              <Text style={s.metaLabel}>Preparado por</Text>
              <Text style={s.metaValue}>{preparedBy}</Text>
            </View>
            <View>
              <Text style={s.metaLabel}>Fecha</Text>
              <Text style={s.metaValue}>{date}</Text>
            </View>
          </View>
        </View>

        <View style={s.bottomRow}>
          <Text style={s.bottomText}>Documento confidencial · Preparado exclusivamente para el destinatario</Text>
          <Text style={s.bottomText}>pimepanama.com</Text>
        </View>
      </View>
    </Page>
  );
}
