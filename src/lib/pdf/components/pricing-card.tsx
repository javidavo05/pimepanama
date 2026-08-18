import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { COLORS, FONTS, RADIUS } from "../tokens";
import { Pill } from "./pill";

const s = StyleSheet.create({
  card: { flex: 1, borderRadius: RADIUS.block, padding: 13, display: "flex", flexDirection: "column" },
  highlight: { backgroundColor: COLORS.ink },
  plain: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line },
  // Tall enough to fit the pill's own padding+glyphs (~17pt) — a shorter fixed height clips the label.
  badgeSlot: { height: 18, marginBottom: 6 },
  name: { fontFamily: FONTS.heading, fontWeight: 700, fontSize: 11.5 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 3, marginTop: 6 },
  price: { fontFamily: FONTS.heading, fontWeight: 800, fontSize: 19 },
  period: { fontFamily: FONTS.body, fontSize: 8 },
  desc: { fontSize: 8.2, marginTop: 5, marginBottom: 10 },
  featureRow: { flexDirection: "row", gap: 6, alignItems: "flex-start", marginBottom: 5 },
  featureBullet: { width: 6, height: 6, borderRadius: 2, marginTop: 2, backgroundColor: COLORS.blue, flexShrink: 0 },
  featureText: { fontFamily: FONTS.body, fontWeight: 500, fontSize: 8, lineHeight: 1.45, flex: 1 },
});

interface PricingCardProps {
  name: string;
  price: string;
  desc: string;
  features: string[];
  highlight?: boolean;
}

/** Design-system §4.10 — a row of these with equal height, the recommended plan filled dark with the "MÁS ELEGIDO" badge. */
export function PricingCard({ name, price, desc, features, highlight = false }: PricingCardProps) {
  const textColor = highlight ? COLORS.white : COLORS.ink;
  const subColor = highlight ? "rgba(255,255,255,0.65)" : COLORS.slate;
  const featureColor = highlight ? "rgba(255,255,255,0.82)" : COLORS.inkSoft;
  return (
    <View style={[s.card, highlight ? s.highlight : s.plain]} wrap={false}>
      <View style={s.badgeSlot}>{highlight && <Pill variant="grad">MÁS ELEGIDO</Pill>}</View>
      <Text style={[s.name, { color: textColor }]}>{name}</Text>
      <View style={s.priceRow}>
        <Text style={[s.price, { color: textColor }]}>{price}</Text>
        <Text style={[s.period, { color: subColor }]}>/mes</Text>
      </View>
      <Text style={[s.desc, { color: subColor }]}>{desc}</Text>
      {features.map((f, i) => (
        <View key={i} style={s.featureRow}>
          <View style={s.featureBullet} />
          <Text style={[s.featureText, { color: featureColor }]}>{f}</Text>
        </View>
      ))}
    </View>
  );
}
