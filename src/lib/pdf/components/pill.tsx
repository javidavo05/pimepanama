import { View, Text } from "@react-pdf/renderer";
import { FONTS, RADIUS } from "../tokens";
import { porTema, type PdfTheme } from "../tema";

const estilos = porTema((t) => ({
  base: { alignSelf: "flex-start", borderRadius: RADIUS.pill, paddingHorizontal: 9, paddingVertical: 4 },
  solid: { backgroundColor: t.ink },
  outline: { backgroundColor: "transparent", borderWidth: 1, borderColor: t.line },
  grad: { backgroundColor: t.pillAccentBg },
  // Sobre fondo oscuro: el sello de la línea (`.linea-sello`), borde de acento y texto en acento claro.
  sello: { backgroundColor: "transparent", borderWidth: 1, borderColor: t.accent },
  text: { fontFamily: FONTS.body, fontWeight: 700, fontSize: 6.8, letterSpacing: 0.6 },
  textSolid: { color: t.white },
  textOutline: { color: t.slate },
  textGrad: { color: t.pillAccentText },
  textSello: { color: t.accentOnDark, letterSpacing: 1.1 },
}));

export type PillVariant = "solid" | "outline" | "grad" | "sello";

/** Pill de estado o etiqueta (design-system §4.7 `.pill`). `grad` es la destacada (`.pill.accent`). */
export function Pill({ t, children, variant = "solid" }: { t: PdfTheme; children: React.ReactNode; variant?: PillVariant }) {
  const s = estilos(t);
  const caja = { solid: s.solid, outline: s.outline, grad: s.grad, sello: s.sello }[variant];
  const texto = { solid: s.textSolid, outline: s.textOutline, grad: s.textGrad, sello: s.textSello }[variant];
  return (
    <View style={[s.base, caja]}>
      <Text style={[s.text, texto]}>{children}</Text>
    </View>
  );
}
