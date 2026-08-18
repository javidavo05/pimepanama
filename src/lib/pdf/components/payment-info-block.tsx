import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { COLORS, FONTS, SPACING, RADIUS } from "../tokens";
import type { PdfTranslations } from "../translations";
import type { PdfPaymentMethod } from "../payment-methods";

const s = StyleSheet.create({
  container: {
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: RADIUS.card,
    padding: SPACING.md,
  },
  title: {
    fontFamily: FONTS.body,
    fontWeight: 700,
    fontSize: 7,
    color: COLORS.blue,
    letterSpacing: 1.4,
    marginBottom: SPACING.sm,
  },
  row: {
    flexDirection: "row",
    gap: SPACING.lg,
    flexWrap: "wrap",
  },
  method: {
    flexGrow: 1,
    flexBasis: "28%",
    minWidth: 120,
    paddingRight: SPACING.sm,
  },
  methodLabel: {
    fontFamily: FONTS.body,
    fontWeight: 700,
    fontSize: 6.6,
    color: COLORS.slateLight,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  methodValue: {
    fontFamily: FONTS.heading,
    fontWeight: 700,
    fontSize: 9,
    color: COLORS.ink,
    lineHeight: 1.5,
  },
  methodSub: {
    fontFamily: FONTS.body,
    fontSize: 7.5,
    color: COLORS.slate,
    lineHeight: 1.5,
  },
  divider: {
    width: 1,
    backgroundColor: COLORS.line,
    marginHorizontal: SPACING.sm,
    alignSelf: "stretch",
  },
});

interface PaymentInfoBlockProps {
  tr: PdfTranslations;
  methods: PdfPaymentMethod[];
}

export function PaymentInfoBlock({ tr, methods }: PaymentInfoBlockProps) {
  if (methods.length === 0) return null;

  return (
    <View style={s.container} wrap={false}>
      <Text style={s.title}>{tr.paymentMethods}</Text>
      <View style={s.row}>
        {methods.map((method, index) => (
          <View key={method.id} style={{ flexDirection: "row", flexGrow: 1, flexBasis: "28%" }}>
            {index > 0 ? <View style={s.divider} /> : null}
            <View style={s.method}>
              <Text style={s.methodLabel}>{method.label}</Text>
              <Text style={s.methodValue}>{method.title}</Text>
              {method.subtitle ? <Text style={s.methodSub}>{method.subtitle}</Text> : null}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
