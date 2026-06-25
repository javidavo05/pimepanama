import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { COLORS, FONTS, SPACING } from "../tokens";
import type { PdfTranslations } from "../translations";

const s = StyleSheet.create({
  container: { marginBottom: SPACING.lg },
  row: { flexDirection: "row", gap: SPACING.md },
  block: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.blue,
    padding: SPACING.md,
  },
  label: {
    fontFamily: FONTS.bold,
    fontSize: 6.5,
    color: COLORS.blue,
    letterSpacing: 2,
    marginBottom: SPACING.xs,
  },
  name: { fontFamily: FONTS.bold, fontSize: 10, color: COLORS.text, marginBottom: 2 },
  detail: { fontSize: 8, color: COLORS.textMuted, lineHeight: 1.5 },
  dateBlock: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.purple,
    padding: SPACING.md,
  },
  dateRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  dateLabel: { fontSize: 7, color: COLORS.textDim },
  dateValue: { fontFamily: FONTS.mono, fontSize: 8.5, color: COLORS.text },
});

interface ClientBlockProps {
  tr: PdfTranslations;
  billToLabel?: string;
  clientName?: string | null;
  clientCompany?: string | null;
  clientAddress?: string | null;
  clientEmail?: string | null;
  clientRuc?: string | null;
  issueDate: string;
  secondDateLabel?: string;
  secondDate?: string | null;
}

export function ClientBlock({
  tr,
  billToLabel,
  clientName,
  clientCompany,
  clientAddress,
  clientEmail,
  clientRuc,
  issueDate,
  secondDateLabel,
  secondDate,
}: ClientBlockProps) {
  return (
    <View style={s.container} wrap={false}>
      <View style={s.row}>
        <View style={s.block}>
          <Text style={s.label}>{billToLabel ?? tr.billTo}</Text>
          {clientName && <Text style={s.name}>{clientName}</Text>}
          {clientCompany && <Text style={s.detail}>{clientCompany}</Text>}
          {clientRuc && <Text style={s.detail}>RUC: {clientRuc}</Text>}
          {clientAddress && <Text style={s.detail}>{clientAddress}</Text>}
          {clientEmail && <Text style={s.detail}>{clientEmail}</Text>}
        </View>
        <View style={s.dateBlock}>
          <View style={s.dateRow}>
            <Text style={s.dateLabel}>{tr.issueDate}</Text>
            <Text style={s.dateValue}>{issueDate}</Text>
          </View>
          {secondDate && secondDateLabel && (
            <View style={s.dateRow}>
              <Text style={s.dateLabel}>{secondDateLabel}</Text>
              <Text style={s.dateValue}>{secondDate}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
