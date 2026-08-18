import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { COLORS, FONTS, RADIUS } from "../tokens";

// Flat midpoint between --blue and --purple. Pills auto-size to their text, so an SVG gradient fill
// (which needs a concrete pixel size) isn't practical here — the accent bar/icon-chip use the real
// gradient where the box size is known ahead of render; this blend reads as "the accent" on badges.
const GRAD_BLEND = "#2D5AFE";

const s = StyleSheet.create({
  base: {
    alignSelf: "flex-start",
    borderRadius: RADIUS.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  solid: { backgroundColor: COLORS.ink },
  outline: { backgroundColor: "transparent", borderWidth: 1, borderColor: COLORS.line },
  grad: { backgroundColor: GRAD_BLEND },
  text: {
    fontFamily: FONTS.body,
    fontWeight: 700,
    fontSize: 6.8,
    letterSpacing: 0.6,
  },
  textSolid: { color: COLORS.white },
  textOutline: { color: COLORS.slate },
  textGrad: { color: COLORS.white },
});

interface PillProps {
  children: React.ReactNode;
  variant?: "solid" | "outline" | "grad";
}

/** Small status/label badge (design-system §4.7 `.pill`). */
export function Pill({ children, variant = "solid" }: PillProps) {
  const boxStyle = variant === "outline" ? s.outline : variant === "grad" ? s.grad : s.solid;
  const textStyle = variant === "outline" ? s.textOutline : variant === "grad" ? s.textGrad : s.textSolid;
  return (
    <View style={[s.base, boxStyle]}>
      <Text style={[s.text, textStyle]}>{children}</Text>
    </View>
  );
}
