import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { COLORS, FONTS, SPACING } from "../tokens";

const s = StyleSheet.create({
  container: { marginBottom: SPACING.lg },
  label: { fontFamily: FONTS.bold, fontSize: 7, color: COLORS.gold, letterSpacing: 2, marginBottom: SPACING.xs },
  card: { backgroundColor: COLORS.bgCard, borderRadius: 4, padding: SPACING.md },
  text: { fontSize: 8.5, color: COLORS.textMuted, lineHeight: 1.6 },
});

interface NotesBlockProps {
  label: string;
  text: string | null | undefined;
}

export function NotesBlock({ label, text }: NotesBlockProps) {
  if (!text?.trim()) return null;
  return (
    <View style={s.container} wrap={false}>
      <Text style={s.label}>{label}</Text>
      <View style={s.card}>
        <Text style={s.text}>{text}</Text>
      </View>
    </View>
  );
}
