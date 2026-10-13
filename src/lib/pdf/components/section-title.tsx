import { View, Text } from "@react-pdf/renderer";
import { FONTS } from "../tokens";
import { porTema, type PdfTheme } from "../tema";

const estilos = porTema((t) => ({
  wrap: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  bar: { width: 12, height: 1.8, borderRadius: 1, backgroundColor: t.accent, marginRight: 6 },
  text: { fontFamily: FONTS.body, fontWeight: 700, fontSize: 7.4, letterSpacing: 1.2, textTransform: "uppercase", color: t.accentText },
}));

/** Eyebrow de sección (design-system §4.4 `.eyebrow`): filete de acento y etiqueta en mayúsculas. */
export function Eyebrow({ t, children }: { t: PdfTheme; children: string }) {
  const s = estilos(t);
  return (
    <View style={s.wrap}>
      <View style={s.bar} />
      <Text style={s.text}>{children}</Text>
    </View>
  );
}
