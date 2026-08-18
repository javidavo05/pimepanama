import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { COLORS, FONTS, RADIUS } from "../tokens";
import { Pill } from "./pill";

const s = StyleSheet.create({
  // No `flex: 1` here — the card is used inside a wrapping grid (percentage-width items with
  // auto height), and `flex: 1` on a child of an auto-height wrapped container collapses to
  // near-zero height in Yoga instead of sizing to content. Width is controlled by the caller's wrapper.
  card: { borderRadius: RADIUS.block, padding: 11, display: "flex", flexDirection: "column" },
  cardFirst: { borderWidth: 1.4, borderColor: COLORS.ink },
  cardOptional: { borderWidth: 1, borderColor: COLORS.line },
  tag: { marginBottom: 8 },
  name: { fontFamily: FONTS.heading, fontWeight: 800, fontSize: 11.5, color: COLORS.ink },
  price: { fontFamily: FONTS.heading, fontWeight: 800, fontSize: 14, color: COLORS.blue, marginTop: 4 },
  timeframe: { fontFamily: FONTS.body, fontWeight: 600, fontSize: 7.4, color: COLORS.slateLight, marginTop: 3, marginBottom: 7 },
  body: { fontFamily: FONTS.body, fontSize: 8.3, color: COLORS.slate, lineHeight: 1.55 },
  footerPill: { marginTop: 10 },
});

interface PhaseCardProps {
  tag: string;
  isFirstPhase: boolean;
  name: string;
  price: string;
  timeframe: string;
  body: string;
  footerLabel: string;
}

/**
 * Design-system §4.11 — phases are approved and billed INDEPENDENTLY. Never render these as a connected
 * timeline that implies "Phase 1 must finish before Phase 2 exists" — always a row of standalone cards.
 */
export function PhaseCard({ tag, isFirstPhase, name, price, timeframe, body, footerLabel }: PhaseCardProps) {
  return (
    <View style={[s.card, isFirstPhase ? s.cardFirst : s.cardOptional]} wrap={false}>
      <View style={s.tag}>
        <Pill variant={isFirstPhase ? "solid" : "outline"}>{tag}</Pill>
      </View>
      <Text style={s.name}>{name}</Text>
      <Text style={s.price}>{price}</Text>
      <Text style={s.timeframe}>{timeframe}</Text>
      <Text style={s.body}>{body}</Text>
      <View style={s.footerPill}>
        <Pill variant="outline">{footerLabel}</Pill>
      </View>
    </View>
  );
}
