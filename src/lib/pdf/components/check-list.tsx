import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { COLORS, FONTS } from "../tokens";

const s = StyleSheet.create({
  item: { flexDirection: "row", alignItems: "flex-start", gap: 7, marginBottom: 6 },
  bullet: { width: 8, height: 8, marginTop: 2, borderRadius: 2, flexShrink: 0 },
  bulletCheck: { backgroundColor: COLORS.blue },
  bulletX: { backgroundColor: COLORS.slateLight, opacity: 0.5 },
  text: { fontFamily: FONTS.body, fontSize: 9, lineHeight: 1.5, fontWeight: 500 },
  textCheck: { color: COLORS.inkSoft },
  textX: { color: COLORS.slate },
});

/** Design-system §4.8 `.check-list` / `.x-list` — the only accepted "incluye / no incluye" pattern. */
export function CheckList({ items, variant = "check" }: { items: string[]; variant?: "check" | "x" }) {
  return (
    <View>
      {items.map((item, i) => (
        <View key={i} style={s.item}>
          <View style={[s.bullet, variant === "check" ? s.bulletCheck : s.bulletX]} />
          <Text style={[s.text, variant === "check" ? s.textCheck : s.textX, { flex: 1 }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}
