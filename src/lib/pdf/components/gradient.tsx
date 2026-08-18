import { Svg, Defs, LinearGradient, Stop, Rect, View, Text, StyleSheet } from "@react-pdf/renderer";
import { COLORS, FONTS, GRADIENT_STOPS, RADIUS } from "../tokens";

/**
 * The blue→purple brand accent bar (design-system §1 `--grad`). Use for cover stripes, dividers,
 * eyebrow ticks. `width`/`height` must be concrete pt values (react-pdf's Svg needs a real size to
 * rasterize the gradient — pass the page width or a fixed chip size, never a percentage string).
 */
export function GradientBar({ width, height = 4, radius = 0 }: { width: number; height?: number; radius?: number }) {
  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="brandGrad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={GRADIENT_STOPS[0]} />
          <Stop offset="1" stopColor={GRADIENT_STOPS[1]} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#brandGrad)" rx={radius} ry={radius} />
    </Svg>
  );
}

const chipStyles = StyleSheet.create({
  wrap: { position: "relative", marginBottom: 10 },
  labelBox: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: FONTS.heading,
    fontWeight: 800,
    color: COLORS.white,
    textAlign: "center",
  },
});

/** Square gradient icon-chip used to head cards (design-system §4.6 `.icon-chip`). `children` is 1-2 letters/glyph. */
export function GradientChip({ size = 26, children, fontSize = 11 }: { size?: number; children: React.ReactNode; fontSize?: number }) {
  return (
    <View style={[chipStyles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="chipGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={GRADIENT_STOPS[0]} />
            <Stop offset="1" stopColor={GRADIENT_STOPS[1]} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#chipGrad)" rx={RADIUS.chip} ry={RADIUS.chip} />
      </Svg>
      <View style={chipStyles.labelBox}>
        <Text style={[chipStyles.label, { fontSize }]}>{children}</Text>
      </View>
    </View>
  );
}
