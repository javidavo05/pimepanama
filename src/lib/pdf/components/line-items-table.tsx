import { View, Text } from "@react-pdf/renderer";
import { FONTS, RADIUS } from "../tokens";
import { porTema, type PdfTheme } from "../tema";
import type { PdfTranslations } from "../translations";
import { fmtCurrency, type PdfLang } from "../translations";
import { Eyebrow } from "./section-title";
import { Parrafos } from "./notes-block";

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxPercent: number;
  discount: number;
}

/** Subtotal, impuesto y total de las líneas. Misma cuenta que la vista de la factura en la suite. */
export function calcularTotales(items: LineItem[]) {
  let subtotal = 0;
  let impuesto = 0;
  const filas = items.map((item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const disc = Number(item.discount) || 0;
    const tax = Number(item.taxPercent) || 0;
    const base = qty * price * (1 - disc / 100);
    const taxAmt = base * (tax / 100);
    subtotal += base;
    impuesto += taxAmt;
    return { ...item, total: base + taxAmt };
  });
  return { filas, subtotal, impuesto, total: subtotal + impuesto };
}

const estilos = porTema((t) => ({
  // `table.clean`: sin bordes verticales, encabezado en mayúsculas con filete de 1.4 en tinta.
  headerRow: { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 8, borderBottomWidth: 1.4, borderBottomColor: t.ink },
  headerCell: { fontFamily: FONTS.body, fontWeight: 700, fontSize: 6.6, color: t.slateLight, letterSpacing: 0.8, textTransform: "uppercase" },
  row: { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: t.line },
  cell: { fontFamily: FONTS.body, fontSize: 8.6, color: t.inkSoft, lineHeight: 1.45 },
  cellDim: { color: t.slate },
  right: { textAlign: "right" },
  amount: { fontWeight: 700, color: t.ink },
  // Totales a la derecha y la cifra que importa en un `.dark-block`.
  // Totales a la derecha y, al lado, la cifra que importa en un `.dark-block`.
  totals: { flexDirection: "row", justifyContent: "flex-end", alignItems: "stretch", marginTop: 12, marginBottom: 18 },
  totalsCol: { width: 214, justifyContent: "center" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, paddingHorizontal: 8 },
  totalLabel: { fontFamily: FONTS.body, fontWeight: 600, fontSize: 7.4, letterSpacing: 0.6, color: t.slateLight, textTransform: "uppercase" },
  totalValue: { fontFamily: FONTS.body, fontWeight: 600, fontSize: 9, color: t.inkSoft },
  grandRow: { borderTopWidth: 1.4, borderTopColor: t.ink, marginTop: 4, paddingTop: 7 },
  grandLabel: { fontFamily: FONTS.body, fontWeight: 700, fontSize: 7.6, letterSpacing: 0.6, color: t.ink, textTransform: "uppercase" },
  grandValue: { fontFamily: FONTS.heading, fontWeight: 800, fontSize: 10.5, color: t.ink },
  paidValue: { color: t.accentText },
  block: { width: 190, marginLeft: 14, backgroundColor: t.dark, borderRadius: RADIUS.block, paddingVertical: 12, paddingHorizontal: 14, justifyContent: "center" },
  blockLabel: { fontFamily: FONTS.body, fontWeight: 700, fontSize: 7, letterSpacing: 1.2, color: t.onDarkSoft, textTransform: "uppercase" },
  blockValue: { fontFamily: FONTS.heading, fontWeight: 800, fontSize: 19, letterSpacing: -0.3, color: t.accentOnDark, marginTop: 4 },
}));

interface LineItemsTableProps {
  t: PdfTheme;
  tr: PdfTranslations;
  lang: PdfLang;
  items: LineItem[];
  currency?: string;
}

/** Tabla de líneas. La columna de descuento solo aparece si alguna línea lo tiene. */
export function LineItemsTable({ t, tr, lang, items, currency = "USD" }: LineItemsTableProps) {
  const s = estilos(t);
  const { filas } = calcularTotales(items);
  const conDescuento = filas.some((f) => Number(f.discount) > 0);
  const w = conDescuento
    ? { desc: "43%", qty: "8%", price: "16%", tax: "9%", disc: "8%", amount: "16%" }
    : { desc: "49%", qty: "9%", price: "17%", tax: "9%", disc: "0%", amount: "16%" };
  const money = (n: number) => fmtCurrency(n, lang, currency);

  const encabezado = (
    <View style={s.headerRow}>
      <Text style={[s.headerCell, { width: w.desc }]}>{tr.description}</Text>
      <Text style={[s.headerCell, s.right, { width: w.qty }]}>{tr.quantity}</Text>
      <Text style={[s.headerCell, s.right, { width: w.price }]}>{tr.unitPrice}</Text>
      <Text style={[s.headerCell, s.right, { width: w.tax }]}>{tr.taxPct}</Text>
      {conDescuento ? <Text style={[s.headerCell, s.right, { width: w.disc }]}>{tr.discount}</Text> : null}
      <Text style={[s.headerCell, s.right, { width: w.amount }]}>{tr.amount}</Text>
    </View>
  );

  const fila = (f: (typeof filas)[number], i: number) => (
    <View key={i} style={s.row} wrap={false}>
      <View style={{ width: w.desc, paddingRight: 8 }}>
        <Parrafos text={f.description || "—"} style={s.cell} />
      </View>
      <Text style={[s.cell, s.cellDim, s.right, { width: w.qty }]}>{f.quantity}</Text>
      <Text style={[s.cell, s.cellDim, s.right, { width: w.price }]}>{money(Number(f.unitPrice))}</Text>
      <Text style={[s.cell, s.cellDim, s.right, { width: w.tax }]}>{Number(f.taxPercent) || 0}%</Text>
      {conDescuento ? <Text style={[s.cell, s.cellDim, s.right, { width: w.disc }]}>{Number(f.discount) || 0}%</Text> : null}
      <Text style={[s.cell, s.right, s.amount, { width: w.amount }]}>{money(f.total)}</Text>
    </View>
  );

  // Hasta 10 líneas la tabla va entera en una página. Con más, se parte entre filas (nunca a mitad de una)
  // y el encabezado se repite arriba en cada página. El título nunca queda solo al pie: pide espacio
  // para el encabezado y la primera línea.
  const corta = filas.length <= 10;
  return (
    <View wrap={!corta}>
      <View wrap={false} minPresenceAhead={60}>
        <Eyebrow t={t}>{tr.detail}</Eyebrow>
      </View>
      <View>
        <View fixed>{encabezado}</View>
        {filas.map(fila)}
      </View>
    </View>
  );
}

interface TotalsBlockProps {
  t: PdfTheme;
  tr: PdfTranslations;
  lang: PdfLang;
  items: LineItem[];
  currency?: string;
  /** Lo abonado a la fecha. Con abonos se muestra «Pagado a la fecha» y el bloque destacado es el saldo. */
  paid?: number;
  /** Etiqueta del bloque destacado cuando no hay abonos («Total a pagar», «Total de la propuesta»). */
  totalLabel?: string;
}

/** Subtotal, impuesto y total; con abonos, lo pagado y el saldo. Va entero en una página. */
export function TotalsBlock({ t, tr, lang, items, currency = "USD", paid = 0, totalLabel }: TotalsBlockProps) {
  const s = estilos(t);
  const { subtotal, impuesto, total } = calcularTotales(items);
  const money = (n: number) => fmtCurrency(n, lang, currency);
  const conAbonos = paid > 0.004;
  const saldo = Math.max(0, Math.round((total - paid) * 100) / 100);
  const destacado = !conAbonos
    ? { label: totalLabel ?? tr.amountDue, value: money(total) }
    : saldo <= 0.004
      ? { label: tr.paidInFull, value: money(paid) }
      : { label: tr.balanceDue, value: money(saldo) };
  return (
    <View style={s.totals} wrap={false}>
      <View style={s.totalsCol}>
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>{tr.subtotal}</Text>
          <Text style={s.totalValue}>{money(subtotal)}</Text>
        </View>
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>{tr.tax}</Text>
          <Text style={s.totalValue}>{money(impuesto)}</Text>
        </View>
        <View style={[s.totalRow, s.grandRow]}>
          <Text style={s.grandLabel}>{tr.total}</Text>
          <Text style={s.grandValue}>{money(total)}</Text>
        </View>
        {conAbonos ? (
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>{tr.paidToDate}</Text>
            <Text style={[s.totalValue, s.paidValue]}>- {money(paid)}</Text>
          </View>
        ) : null}
      </View>
      <View style={s.block}>
        <Text style={s.blockLabel}>{destacado.label}</Text>
        <Text style={s.blockValue}>{destacado.value}</Text>
      </View>
    </View>
  );
}
