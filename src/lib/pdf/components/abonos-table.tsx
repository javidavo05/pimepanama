import { View, Text } from "@react-pdf/renderer";
import { FONTS } from "../tokens";
import { porTema, type PdfTheme } from "../tema";
import { fmtCurrency, fmtDate, type PdfLang, type PdfTranslations } from "../translations";
import { Eyebrow } from "./section-title";

/** Un abono confirmado a la factura, tal como va en el PDF. */
export interface AbonoPdf {
  fecha: Date;
  metodo: string;
  referencia?: string | null;
  monto: number;
}

const METODO: Record<string, [string, string]> = {
  transferencia: ["Transferencia", "Bank transfer"],
  yappy: ["Yappy", "Yappy"],
  tarjeta: ["Tarjeta", "Card"],
  efectivo: ["Efectivo", "Cash"],
  cheque: ["Cheque", "Check"],
  otro: ["Otro", "Other"],
};

export function nombreMetodo(metodo: string, lang: PdfLang): string {
  return (METODO[metodo] ?? [metodo, metodo])[lang === "en" ? 1 : 0];
}

const estilos = porTema((t) => ({
  wrap: { marginBottom: 18 },
  headerRow: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: 1.4, borderBottomColor: t.ink },
  headerCell: { fontFamily: FONTS.body, fontWeight: 700, fontSize: 6.6, color: t.slateLight, letterSpacing: 0.8, textTransform: "uppercase" },
  row: { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: t.line },
  cell: { fontFamily: FONTS.body, fontSize: 8.4, color: t.inkSoft },
  dim: { color: t.slate },
  right: { textAlign: "right", fontWeight: 700, color: t.ink },
}));

const W = { n: "8%", fecha: "28%", metodo: "22%", ref: "24%", monto: "18%" };

/** Abonos recibidos a la factura, en orden. El título va pegado al encabezado y al primer abono. */
export function AbonosTable({ t, tr, lang, abonos, currency = "USD" }: { t: PdfTheme; tr: PdfTranslations; lang: PdfLang; abonos: AbonoPdf[]; currency?: string }) {
  const s = estilos(t);
  if (abonos.length === 0) return null;
  const fila = (a: AbonoPdf, i: number) => (
    <View key={i} style={s.row} wrap={false}>
      <Text style={[s.cell, s.dim, { width: W.n }]}>{i + 1}</Text>
      <Text style={[s.cell, { width: W.fecha }]}>{fmtDate(a.fecha, lang)}</Text>
      <Text style={[s.cell, s.dim, { width: W.metodo }]}>{nombreMetodo(a.metodo, lang)}</Text>
      <Text style={[s.cell, s.dim, { width: W.ref }]}>{a.referencia || "—"}</Text>
      <Text style={[s.cell, s.right, { width: W.monto }]}>{fmtCurrency(a.monto, lang, currency)}</Text>
    </View>
  );
  // Hasta 8 abonos la tabla va entera; con más, se parte y el encabezado se repite en cada página.
  const corta = abonos.length <= 8;
  return (
    <View style={s.wrap} wrap={!corta}>
      <View wrap={false} minPresenceAhead={50}>
        <Eyebrow t={t}>{tr.paymentsReceived}</Eyebrow>
      </View>
      <View>
        <View style={s.headerRow} fixed>
          <Text style={[s.headerCell, { width: W.n }]}>#</Text>
          <Text style={[s.headerCell, { width: W.fecha }]}>{tr.date}</Text>
          <Text style={[s.headerCell, { width: W.metodo }]}>{tr.method}</Text>
          <Text style={[s.headerCell, { width: W.ref }]}>{tr.reference}</Text>
          <Text style={[s.headerCell, { width: W.monto, textAlign: "right" }]}>{tr.amount}</Text>
        </View>
        {abonos.map(fila)}
      </View>
    </View>
  );
}
