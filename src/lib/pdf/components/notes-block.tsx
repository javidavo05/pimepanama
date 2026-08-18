import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { COLORS, FONTS, SPACING, RADIUS } from "../tokens";

const s = StyleSheet.create({
  container: { marginBottom: SPACING.lg },
  label: {
    fontFamily: FONTS.body,
    fontWeight: 700,
    fontSize: 7,
    color: COLORS.blue,
    letterSpacing: 1.4,
    marginBottom: SPACING.xs,
  },
  card: {
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: RADIUS.card,
    padding: SPACING.md,
  },
  text: { fontFamily: FONTS.body, fontSize: 8.5, color: COLORS.slate, lineHeight: 1.65 },
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
