import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { COLORS, FONTS, SPACING } from "../tokens";
import type { PdfTranslations } from "../translations";

const s = StyleSheet.create({
  container: {
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.bgCard,
    borderRadius: 6,
    padding: SPACING.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.blue,
  },
  title: {
    fontSize: 7,
    fontFamily: FONTS.bold,
    color: COLORS.blue,
    letterSpacing: 1.5,
    marginBottom: SPACING.sm,
  },
  row: {
    flexDirection: "row",
    gap: SPACING.lg,
  },
  method: {
    flex: 1,
    paddingRight: SPACING.sm,
  },
  methodLabel: {
    fontSize: 6.5,
    fontFamily: FONTS.bold,
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  methodValue: {
    fontSize: 8.5,
    color: COLORS.text,
    fontFamily: FONTS.mono,
    lineHeight: 1.5,
  },
  methodSub: {
    fontSize: 7.5,
    color: COLORS.textMuted,
    lineHeight: 1.5,
  },
  divider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.sm,
  },
});

interface PaymentInfoBlockProps {
  tr: PdfTranslations;
}

export function PaymentInfoBlock({ tr }: PaymentInfoBlockProps) {
  return (
    <View style={s.container} wrap={false}>
      <Text style={s.title}>{tr.paymentMethods}</Text>
      <View style={s.row}>
        {/* Tarjeta */}
        <View style={s.method}>
          <Text style={s.methodLabel}>Tarjeta de Crédito / Débito</Text>
          <Text style={s.methodValue}>Link de Pago</Text>
          <Text style={s.methodSub}>Procesado por Paguelo Fácil</Text>
        </View>

        <View style={s.divider} />

        {/* Banco */}
        <View style={s.method}>
          <Text style={s.methodLabel}>Transferencia Bancaria</Text>
          <Text style={s.methodValue}>Banco General</Text>
          <Text style={s.methodSub}>04-4444999991-783{"\n"}Pime Panamá · Cta. de Ahorros</Text>
        </View>

        <View style={s.divider} />

        {/* Yappy */}
        <View style={s.method}>
          <Text style={s.methodLabel}>Yappy</Text>
          <Text style={s.methodValue}>6479-5352</Text>
          <Text style={s.methodSub}>Pime Panamá</Text>
        </View>
      </View>
    </View>
  );
}
