import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { pageStyles, COLORS, FONTS, SPACING, RADIUS } from "../tokens";
import { t, fmtDate } from "../translations";
import { DocumentHeader } from "../components/document-header";
import { ClientBlock } from "../components/client-block";
import { DocumentFooter } from "../components/document-footer";
import type { DatosRecibo } from "@/lib/pagos/recibo";

const s = StyleSheet.create({
  // LAW: size must be LETTER (8.5" × 11"). NEVER A4.
  page: { ...pageStyles.page, fontFamily: FONTS.body, backgroundColor: COLORS.white, color: COLORS.ink, paddingBottom: 70 },
  body: { paddingHorizontal: SPACING.page, paddingTop: SPACING.lg, flex: 1, flexDirection: "column" },
  monto: { marginTop: SPACING.lg, padding: SPACING.lg, borderRadius: RADIUS.block, backgroundColor: COLORS.panel },
  etiqueta: { fontSize: 8, letterSpacing: 1, color: COLORS.slate, textTransform: "uppercase" },
  grande: { fontSize: 26, fontWeight: 700, color: COLORS.ink, marginTop: SPACING.xs },
  fila: { flexDirection: "row", justifyContent: "space-between", paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  izq: { fontSize: 10, color: COLORS.slate },
  der: { fontSize: 10, color: COLORS.ink, fontWeight: 600 },
  tabla: { marginTop: SPACING.lg },
  nota: { marginTop: SPACING.lg, fontSize: 9, color: COLORS.slateLight, lineHeight: 1.5 },
});

const METODO: Record<string, [string, string]> = {
  transferencia: ["Transferencia", "Bank transfer"], yappy: ["Yappy", "Yappy"], tarjeta: ["Tarjeta", "Card"],
  efectivo: ["Efectivo", "Cash"], cheque: ["Cheque", "Check"], otro: ["Otro", "Other"],
};

export function ReciboPdf({ d, logoSrc }: { d: NonNullable<DatosRecibo>; logoSrc: string }) {
  const en = d.lang === "en";
  const tr = t(d.lang);
  const usd = (n: number) => `${d.moneda} ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const filas: [string, string][] = [
    [en ? "Payment date" : "Fecha del pago", fmtDate(d.pago.fecha, d.lang)],
    [en ? "Method" : "Método", (METODO[d.pago.metodo] ?? [d.pago.metodo, d.pago.metodo])[en ? 1 : 0]],
    ...(d.pago.referencia ? [[en ? "Reference" : "Referencia", d.pago.referencia] as [string, string]] : []),
    ...(d.factura
      ? ([
          [en ? "Applied to" : "Abono a", `${d.factura.numero ?? ""} · ${d.factura.concepto}`],
          [en ? "Invoice total" : "Total de la factura", usd(d.factura.total)],
          [en ? "Paid to date" : "Pagado a la fecha", usd(d.pagadoHasta)],
          [en ? "Balance due" : "Saldo pendiente", usd(d.saldo)],
        ] as [string, string][])
      : []),
  ];
  const c = d.cliente;
  return (
    <Document title={`${en ? "Receipt" : "Recibo"} ${d.numero}`} author={d.company?.name ?? "PIME PANAMA"} creator="Pime Communications Suite">
      <Page size="LETTER" style={s.page}>
        <DocumentHeader config={d.company} docLabel={en ? "PAYMENT RECEIPT" : "RECIBO DE PAGO"} docNumber={d.numero} logoSrc={logoSrc} statusLabel={en ? "Received" : "Recibido"} statusVariant="solid" />
        <View style={s.body}>
          <ClientBlock tr={tr} billToLabel={en ? "RECEIVED FROM" : "RECIBIDO DE"} clientName={c?.name ?? null} clientCompany={c?.company ?? null} clientAddress={c?.address ?? null} clientEmail={c?.email ?? null} clientRuc={c?.ruc ?? null} issueDate={fmtDate(d.pago.fecha, d.lang)} />
          <View style={s.monto}>
            <Text style={s.etiqueta}>{en ? "Amount received" : "Monto recibido"}</Text>
            <Text style={s.grande}>{usd(d.pago.monto)}</Text>
          </View>
          <View style={s.tabla}>
            {filas.map(([k, v]) => (
              <View key={k} style={s.fila}><Text style={s.izq}>{k}</Text><Text style={s.der}>{v}</Text></View>
            ))}
          </View>
          <Text style={s.nota}>{en ? "This receipt confirms a payment applied to the invoice above. The invoice is the tax document." : "Este recibo confirma un abono a la factura indicada. La factura es el documento fiscal."}</Text>
        </View>
        <DocumentFooter tr={tr} config={d.company} />
      </Page>
    </Document>
  );
}
