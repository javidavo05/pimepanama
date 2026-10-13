import { Svg, Rect, Path, View, Text } from "@react-pdf/renderer";
import { FONTS, RADIUS } from "../tokens";
import { porTema, type PdfTheme } from "../tema";

/**
 * Banda superior de la línea (manual de marca): en normal, las tres capas del logo apiladas (azul tinta,
 * azul señal, azul cielo); en premium, un filete de oro. Con alto menor a 3 pt se dibuja solo el acento,
 * que es como se usa al lado de los eyebrows. `width`/`height` en pt.
 */
export function GradientBar({ t, width, height = 4, radius = 0 }: { t: PdfTheme; width: number; height?: number; radius?: number }) {
    const capas = height < 3 ? [t.accent] : t.banda;
  const h = height / capas.length;
  return (
    <Svg width={width} height={height}>
      {capas.map((c, i) => (
        <Rect key={i} x="0" y={h * i} width={width} height={h} fill={c} rx={radius} ry={radius} />
      ))}
    </Svg>
  );
}

const chipEstilos = porTema((t) => ({
  wrap: { position: "relative", marginBottom: 10 },
  labelBox: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  label: { fontFamily: FONTS.heading, fontWeight: 800, color: t.accentOnDark, textAlign: "center" },
}));

/** Chip cuadrado de tarjeta (`.icon-chip`: fondo oscuro de la línea, letra en acento sobre oscuro). */
export function GradientChip({ t, size = 26, children, fontSize = 11 }: { t: PdfTheme; size?: number; children: React.ReactNode; fontSize?: number }) {
    const s = chipEstilos(t);
  return (
    <View style={[s.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Rect x="0" y="0" width={size} height={size} fill={t.dark} rx={RADIUS.chip} ry={RADIUS.chip} />
      </Svg>
      <View style={s.labelBox}>
        <Text style={[s.label, { fontSize }]}>{children}</Text>
      </View>
    </View>
  );
}

/** Símbolo de la marca en contorno (las tres capas), para portadas y cierres. Coordenadas sobre 100 × 100. */
export function CapasOutline({ size, color, opacity = 1, strokeWidth = 1.6 }: { size: number; color: string; opacity?: number; strokeWidth?: number }) {
  // La opacidad va en el trazo: react-pdf ignora `opacity` en el estilo del <Svg>.
  const common = { fill: "none", stroke: color, strokeOpacity: opacity, strokeWidth, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M20 72 L50 84 L80 72" {...common} />
      <Path d="M20 54 L50 66 L80 54" {...common} />
      <Path d="M20 36 L50 16 L80 36 L50 48 Z" {...common} />
    </Svg>
  );
}

/** Viñeta de «incluye»: el chevron de capas del logo (design-system §4.8). */
export function ChevronCapas({ size = 9, color }: { size?: number; color: string }) {
  const trazo = { fill: "none", stroke: color, strokeWidth: 3.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <Path d="M3 7l7 5 7-5" {...trazo} />
      <Path d="M3 12l7 5 7-5" {...trazo} opacity={0.45} />
    </Svg>
  );
}

/** Viñeta de «no incluye»: una × gris. */
export function Equis({ size = 9, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <Path d="M5 5l10 10M15 5 5 15" stroke={color} strokeWidth={3} strokeLinecap="round" />
    </Svg>
  );
}
