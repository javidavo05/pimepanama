import { StyleSheet } from "@react-pdf/renderer";

export const COLORS = {
  bg: "#050508",
  bgCard: "#0c0c14",
  bgHeader: "#0a0a12",
  gold: "#C8A96E",
  goldDim: "#a8895a",
  goldLight: "#d4b87a",
  text: "#FFFFFF",
  textMuted: "rgba(255,255,255,0.55)",
  textDim: "rgba(255,255,255,0.35)",
  border: "rgba(255,255,255,0.07)",
  borderLight: "rgba(255,255,255,0.04)",
};

export const FONTS = {
  regular: "Helvetica",
  bold: "Helvetica-Bold",
  mono: "Courier",
  monoBold: "Courier-Bold",
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 22,
  xl: 32,
  page: 40,
};

// Shared page styles
export const pageStyles = StyleSheet.create({
  page: {
    size: "LETTER",
    backgroundColor: COLORS.bg,
    paddingTop: SPACING.page,
    paddingBottom: SPACING.page + 20, // extra for footer
    paddingHorizontal: SPACING.page,
    fontFamily: FONTS.regular,
    color: COLORS.text,
  },
  goldRule: {
    width: "100%",
    height: 1.5,
    backgroundColor: COLORS.gold,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 7,
    color: COLORS.gold,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: SPACING.sm,
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 4,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  flex1: { flex: 1 },
  textSm: { fontSize: 8.5, color: COLORS.textMuted, lineHeight: 1.5 },
  textBase: { fontSize: 9.5, color: COLORS.text, lineHeight: 1.5 },
  textMono: { fontFamily: FONTS.mono, fontSize: 9 },
  textMonoBold: { fontFamily: FONTS.monoBold, fontSize: 9 },
});
