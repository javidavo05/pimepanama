import { StyleSheet } from "@react-pdf/renderer";

export const COLORS = {
  // Backgrounds
  bg: "#FFFFFF",
  bgCard: "#F8FAFC",
  bgAlt: "#F1F5F9",
  bgDark: "#0A0E1A",

  // PIME Brand
  blue: "#1AA7F0",
  blueDim: "#0E87C8",
  blueLight: "#EBF6FE",
  purple: "#6344E8",
  purpleLight: "#EEEBFB",

  // Text
  text: "#111827",
  textMuted: "#6B7280",
  textDim: "#9CA3AF",
  textInverse: "#FFFFFF",

  // Borders
  border: "#E5E7EB",
  borderMid: "#D1D5DB",

  // Backwards-compat aliases (any code still referencing gold/bgHeader gets PIME colors)
  gold: "#1AA7F0",
  goldDim: "#0E87C8",
  goldLight: "#EBF6FE",
  bgHeader: "#0A0E1A",
  bgCard2: "#F8FAFC",
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

export const pageStyles = StyleSheet.create({
  // LAW: size must always be LETTER (8.5" × 11"). NEVER A4.
  page: {
    backgroundColor: COLORS.bg,
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
    fontFamily: FONTS.regular,
    color: COLORS.text,
  },
  body: {
    paddingHorizontal: SPACING.page,
    flex: 1,
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 7,
    color: COLORS.blue,
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
