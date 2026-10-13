import { View, Text } from "@react-pdf/renderer";
import { FONTS } from "../tokens";
import { porTema, type PdfTheme } from "../tema";
import { ChevronCapas, Equis } from "./gradient";

const estilos = porTema((t) => ({
  item: { flexDirection: "row", alignItems: "flex-start", marginBottom: 6 },
  bullet: { marginTop: 1.5, marginRight: 7 },
  text: { fontFamily: FONTS.body, fontSize: 9, lineHeight: 1.5, fontWeight: 500, flex: 1 },
  textCheck: { color: t.inkSoft },
  textX: { color: t.slate },
}));

/** design-system §4.8 `.check-list` / `.x-list`: chevron de capas en acento para «incluye», × gris para «no incluye». */
export function CheckList({ t, items, variant = "check" }: { t: PdfTheme; items: string[]; variant?: "check" | "x" }) {
    const s = estilos(t);
  return (
    <View>
      {items.map((item, i) => (
        <View key={i} style={s.item} wrap={false}>
          <View style={s.bullet}>{variant === "check" ? <ChevronCapas color={t.accent} /> : <Equis color={t.slateLight} />}</View>
          <Text style={[s.text, variant === "check" ? s.textCheck : s.textX]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}
