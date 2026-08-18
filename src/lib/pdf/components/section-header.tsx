import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { COLORS, FONTS, SPACING } from "../tokens";
import { GradientBar } from "./gradient";

const headerStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.page,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
    marginBottom: SPACING.lg,
  },
  brand: { fontFamily: FONTS.heading, fontWeight: 800, fontSize: 10.5, color: COLORS.ink },
  section: { fontFamily: FONTS.body, fontWeight: 600, fontSize: 7.5, color: COLORS.slateLight, letterSpacing: 1 },
});

/** Design-system §4.2 — minimal internal-page header (icon+wordmark left, section name right). Lighter than DocumentHeader. */
export function ProposalPageHeader({ section }: { section: string }) {
  return (
    <View style={headerStyles.container}>
      <Text style={headerStyles.brand}>PIME</Text>
      <Text style={headerStyles.section}>{section.toUpperCase()}</Text>
    </View>
  );
}

const introStyles = StyleSheet.create({
  wrap: { paddingHorizontal: SPACING.page, marginBottom: SPACING.lg },
  eyebrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    fontFamily: FONTS.body,
    fontWeight: 700,
    fontSize: 8.2,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: COLORS.blue,
  },
  title: { fontFamily: FONTS.heading, fontWeight: 800, fontSize: 18, color: COLORS.ink, marginTop: 6, lineHeight: 1.15 },
  subtitle: { fontFamily: FONTS.body, fontSize: 9, color: COLORS.slate, lineHeight: 1.6, marginTop: 8, maxWidth: 400 },
});

/** Design-system §4.4 — eyebrow + section-title + optional section-sub, used at the top of every content page. */
export function SectionIntro({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <View style={introStyles.wrap}>
      <View style={introStyles.eyebrow}>
        <GradientBar width={12} height={2} />
        <Text>{eyebrow}</Text>
      </View>
      <Text style={introStyles.title}>{title}</Text>
      {subtitle && <Text style={introStyles.subtitle}>{subtitle}</Text>}
    </View>
  );
}
