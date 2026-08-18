import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { COLORS, FONTS, SPACING, RADIUS } from "../tokens";
import type { PdfTranslations } from "../translations";

const s = StyleSheet.create({
  container: { marginBottom: SPACING.lg },
  row: { flexDirection: "row", gap: SPACING.md },
  block: {
    flex: 1,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: RADIUS.card,
    padding: SPACING.md,
  },
  label: {
    fontFamily: FONTS.body,
    fontWeight: 700,
    fontSize: 7,
    color: COLORS.blue,
    letterSpacing: 1.4,
    marginBottom: SPACING.xs,
  },
  name: { fontFamily: FONTS.heading, fontWeight: 700, fontSize: 10.5, color: COLORS.ink, marginBottom: 2 },
  detail: { fontFamily: FONTS.body, fontSize: 8, color: COLORS.slate, lineHeight: 1.55 },
  dateRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  dateLabel: { fontFamily: FONTS.body, fontSize: 7, color: COLORS.slateLight },
  dateValue: { fontFamily: FONTS.body, fontWeight: 600, fontSize: 8.5, color: COLORS.ink },
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
        <View style={s.block}>
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
