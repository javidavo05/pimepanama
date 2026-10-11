import { Svg, Rect, Path, View, Text, StyleSheet } from "@react-pdf/renderer";
import { COLORS, FONTS, LAYERS, RADIUS } from "../tokens";

/**
 * Banda de marca (manual de marca, «banda de tres capas»): azul tinta, azul señal y azul cielo apilados.
 * Con alto menor a 3 pt se dibuja solo el azul señal. Se conserva el nombre GradientBar para no tocar
 * a quienes la usan; ya no hay degradado. `width`/`height` deben ser pt concretos.
 */
export function GradientBar({ width, height = 4, radius = 0 }: { width: number; height?: number; radius?: number }) {
  if (height < 3) {
    return (
      <Svg width={width} height={height}>
        <Rect x="0" y="0" width={width} height={height} fill={COLORS.blue} rx={radius} ry={radius} />
      </Svg>
    );
  }
  const h = height / 3;
  return (
    <Svg width={width} height={height}>
      <Rect x="0" y="0" width={width} height={h} fill={LAYERS[0]} />
      <Rect x="0" y={h} width={width} height={h} fill={LAYERS[1]} />
      <Rect x="0" y={h * 2} width={width} height={h} fill={LAYERS[2]} />
    </Svg>
  );
}

const chipStyles = StyleSheet.create({
  wrap: { position: "relative", marginBottom: 10 },
  labelBox: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  label: { fontFamily: FONTS.heading, fontWeight: 800, color: COLORS.purple, textAlign: "center" },
});

/** Chip cuadrado de tarjeta (manual: fondo azul tinta, letra en azul cielo). `children` es 1-2 letras. */
export function GradientChip({ size = 26, children, fontSize = 11 }: { size?: number; children: React.ReactNode; fontSize?: number }) {
  return (
    <View style={[chipStyles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Rect x="0" y="0" width={size} height={size} fill={COLORS.ink} rx={RADIUS.chip} ry={RADIUS.chip} />
      </Svg>
      <View style={chipStyles.labelBox}>
        <Text style={[chipStyles.label, { fontSize }]}>{children}</Text>
      </View>
    </View>
  );
}

/** Símbolo de la marca en contorno (las tres capas), para portadas y cierres. Coordenadas sobre 100 × 100. */
export function CapasOutline({ size, color, opacity = 1, strokeWidth = 1.6 }: { size: number; color: string; opacity?: number; strokeWidth?: number }) {
  const common = { fill: "none", stroke: color, strokeWidth, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" style={{ opacity }}>
      <Path d="M20 72 L50 84 L80 72" {...common} />
      <Path d="M20 54 L50 66 L80 54" {...common} />
      <Path d="M20 36 L50 16 L80 36 L50 48 Z" {...common} />
    </Svg>
  );
}
