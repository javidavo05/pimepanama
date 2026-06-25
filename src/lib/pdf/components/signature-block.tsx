import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { COLORS, SPACING } from "../tokens";
import type { PdfTranslations } from "../translations";

const s = StyleSheet.create({
  container: { marginTop: SPACING.xl },
  row: { flexDirection: "row", gap: SPACING.xl },
  block: { flex: 1 },
  line: { borderBottomWidth: 0.5, borderBottomColor: COLORS.border, height: 30, marginBottom: SPACING.xs },
  label: { fontSize: 7, color: COLORS.textDim, letterSpacing: 1 },
  subLabel: { fontSize: 6.5, color: COLORS.textDim, marginTop: 2 },
});

interface SignatureBlockProps {
  tr: PdfTranslations;
  showAcceptance?: boolean;
  acceptanceText?: string;
}

export function SignatureBlock({ tr, showAcceptance, acceptanceText }: SignatureBlockProps) {
  return (
    <View style={s.container} wrap={false}>
      {showAcceptance && acceptanceText && (
        <Text style={{ fontSize: 7.5, color: COLORS.textMuted, marginBottom: SPACING.md, lineHeight: 1.5 }}>
          {acceptanceText}
        </Text>
      )}
      <View style={s.row}>
        <View style={s.block}>
          <View style={s.line} />
          <Text style={s.label}>{tr.authorizedBy}</Text>
          <Text style={s.subLabel}>{tr.signature} / {tr.date}</Text>
        </View>
        <View style={s.block}>
          <View style={s.line} />
          <Text style={s.label}>{tr.receivedBy}</Text>
          <Text style={s.subLabel}>{tr.signature} / {tr.date}</Text>
        </View>
      </View>
    </View>
  );
}
