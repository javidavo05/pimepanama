import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { COLORS, FONTS, SPACING } from "../tokens";
import type { PdfTranslations } from "../translations";
import { fmtCurrency, type PdfLang } from "../translations";

const COL_WIDTHS = {
  desc: "45%",
  qty: "10%",
  price: "16%",
  tax: "9%",
  disc: "9%",
  amount: "11%",
};

const s = StyleSheet.create({
  container: { marginBottom: SPACING.lg },
  headerRow: {
    flexDirection: "row",
    backgroundColor: COLORS.blueLight,
    paddingVertical: 7,
    paddingHorizontal: SPACING.md,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  headerCell: {
    fontFamily: FONTS.bold,
    fontSize: 6.5,
    color: COLORS.blueDim,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  rowAlt: { backgroundColor: COLORS.bgCard },
  cell: { fontSize: 8.5, color: COLORS.textMuted, lineHeight: 1.4 },
  cellRight: { textAlign: "right" },
  cellAmount: {
    fontFamily: FONTS.mono,
    fontSize: 8.5,
    color: COLORS.text,
    textAlign: "right",
  },
  totalsContainer: {
    alignItems: "flex-end",
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: SPACING.xl,
    marginBottom: 4,
  },
  totalLabel: { fontSize: 8, color: COLORS.textDim, width: 90, textAlign: "right" },
  totalValue: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: COLORS.textMuted,
    width: 80,
    textAlign: "right",
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: SPACING.xl,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1.5,
    borderTopColor: COLORS.blue,
  },
  grandTotalLabel: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    color: COLORS.blue,
    width: 90,
    textAlign: "right",
  },
  grandTotalValue: {
    fontFamily: FONTS.monoBold,
    fontSize: 13,
    color: COLORS.blue,
    width: 80,
    textAlign: "right",
  },
});

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxPercent: number;
  discount: number;
}

interface LineItemsTableProps {
  tr: PdfTranslations;
  lang: PdfLang;
  items: LineItem[];
  currency?: string;
}

export function LineItemsTable({ tr, lang, items, currency = "USD" }: LineItemsTableProps) {
  let subtotal = 0;
  let taxTotal = 0;

  const rows = items.map((item, i) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const disc = Number(item.discount) || 0;
    const tax = Number(item.taxPercent) || 0;
    const base = qty * price * (1 - disc / 100);
    const taxAmt = base * (tax / 100);
    const lineTotal = base + taxAmt;
    subtotal += base;
    taxTotal += taxAmt;
    return { ...item, lineTotal, i };
  });

  const grandTotal = subtotal + taxTotal;

  return (
    <View style={s.container}>
      <View style={s.headerRow}>
        <Text style={[s.headerCell, { width: COL_WIDTHS.desc }]}>{tr.description}</Text>
        <Text style={[s.headerCell, { width: COL_WIDTHS.qty, textAlign: "right" }]}>{tr.quantity}</Text>
        <Text style={[s.headerCell, { width: COL_WIDTHS.price, textAlign: "right" }]}>{tr.unitPrice}</Text>
        <Text style={[s.headerCell, { width: COL_WIDTHS.tax, textAlign: "right" }]}>{tr.taxPct}</Text>
        <Text style={[s.headerCell, { width: COL_WIDTHS.disc, textAlign: "right" }]}>{tr.discount}</Text>
        <Text style={[s.headerCell, { width: COL_WIDTHS.amount, textAlign: "right" }]}>{tr.amount}</Text>
      </View>

      {rows.map(({ description, quantity, unitPrice, taxPercent, discount, lineTotal, i }) => (
        <View key={i} style={[s.row, i % 2 === 1 ? s.rowAlt : {}]} wrap={false}>
          <Text style={[s.cell, { width: COL_WIDTHS.desc }]}>{description}</Text>
          <Text style={[s.cell, s.cellRight, { width: COL_WIDTHS.qty }]}>{quantity}</Text>
          <Text style={[s.cell, s.cellRight, { width: COL_WIDTHS.price }]}>{fmtCurrency(Number(unitPrice), lang, currency)}</Text>
          <Text style={[s.cell, s.cellRight, { width: COL_WIDTHS.tax }]}>{taxPercent}%</Text>
          <Text style={[s.cell, s.cellRight, { width: COL_WIDTHS.disc }]}>{discount}%</Text>
          <Text style={[s.cellAmount, { width: COL_WIDTHS.amount }]}>{fmtCurrency(lineTotal, lang, currency)}</Text>
        </View>
      ))}

      <View style={s.totalsContainer}>
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>{tr.subtotal}</Text>
          <Text style={s.totalValue}>{fmtCurrency(subtotal, lang, currency)}</Text>
        </View>
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>{tr.tax}</Text>
          <Text style={s.totalValue}>{fmtCurrency(taxTotal, lang, currency)}</Text>
        </View>
        <View style={s.grandTotalRow}>
          <Text style={s.grandTotalLabel}>{tr.total}</Text>
          <Text style={s.grandTotalValue}>{fmtCurrency(grandTotal, lang, currency)}</Text>
        </View>
      </View>
    </View>
  );
}
