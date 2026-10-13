import { View, Text } from "@react-pdf/renderer";
import { FONTS, RADIUS } from "../tokens";
import { porTema, type PdfTheme } from "../tema";
import { Pill } from "./pill";
import { ChevronCapas } from "./gradient";

const estilos = porTema((t) => ({
  card: { flex: 1, borderRadius: RADIUS.block, padding: 13, display: "flex", flexDirection: "column" },
  highlight: { backgroundColor: t.dark },
  plain: { backgroundColor: t.paper, borderWidth: 1, borderColor: t.line },
  // Alto suficiente para la pill (~17 pt): uno menor la recorta.
  badgeSlot: { height: 18, marginBottom: 6 },
  name: { fontFamily: FONTS.heading, fontWeight: 700, fontSize: 11.5 },
  priceRow: { flexDirection: "row", alignItems: "flex-end", marginTop: 6 },
  price: { fontFamily: FONTS.heading, fontWeight: 800, fontSize: 19, marginRight: 3 },
  period: { fontFamily: FONTS.body, fontSize: 8, marginBottom: 3 },
  desc: { fontSize: 8.2, marginTop: 5, marginBottom: 10 },
  featureRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 5 },
  featureBullet: { marginTop: 1, marginRight: 6 },
  featureText: { fontFamily: FONTS.body, fontWeight: 500, fontSize: 8, lineHeight: 1.45, flex: 1 },
}));

interface PricingCardProps {
  t: PdfTheme;
  name: string;
  price: string;
  desc: string;
  features: string[];
  highlight?: boolean;
}

/** design-system §4.10 — fila de planes de igual alto; el recomendado en el oscuro de la línea con «MÁS ELEGIDO». */
export function PricingCard({ t, name, price, desc, features, highlight = false }: PricingCardProps) {
    const s = estilos(t);
  const textColor = highlight ? t.white : t.ink;
  const subColor = highlight ? t.onDarkSoft : t.slate;
  const featureColor = highlight ? t.white : t.inkSoft;
  return (
    <View style={[s.card, highlight ? s.highlight : s.plain]} wrap={false}>
      <View style={s.badgeSlot}>{highlight ? <Pill t={t} variant="grad">MÁS ELEGIDO</Pill> : null}</View>
      <Text style={[s.name, { color: textColor }]}>{name}</Text>
      <View style={s.priceRow}>
        <Text style={[s.price, { color: textColor }]}>{price}</Text>
        <Text style={[s.period, { color: subColor }]}>/mes</Text>
      </View>
      <Text style={[s.desc, { color: subColor }]}>{desc}</Text>
      {features.map((f, i) => (
        <View key={i} style={s.featureRow}>
          <View style={s.featureBullet}>
            <ChevronCapas size={8} color={highlight ? t.accentOnDark : t.accent} />
          </View>
          <Text style={[s.featureText, { color: featureColor }]}>{f}</Text>
        </View>
      ))}
    </View>
  );
}
