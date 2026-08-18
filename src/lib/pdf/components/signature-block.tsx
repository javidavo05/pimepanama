import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { COLORS, FONTS, SPACING } from "../tokens";
import type { PdfTranslations } from "../translations";

const s = StyleSheet.create({
  container: { marginTop: SPACING.xl },
  acceptanceText: {
    fontFamily: FONTS.body,
    fontWeight: 500,
    fontSize: 7.6,
    color: COLORS.slate,
    marginBottom: SPACING.md,
    lineHeight: 1.6,
  },
  row: { flexDirection: "row", gap: SPACING.xl },
  block: { flex: 1 },
  line: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
    height: 32,
    marginBottom: SPACING.xs,
  },
  label: { fontFamily: FONTS.body, fontWeight: 700, fontSize: 7, color: COLORS.blue, letterSpacing: 1 },
  subLabel: { fontFamily: FONTS.body, fontSize: 6.6, color: COLORS.slateLight, marginTop: 2 },
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
        <Text style={s.acceptanceText}>{acceptanceText}</Text>
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
