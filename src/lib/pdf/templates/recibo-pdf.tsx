import { Document, View, Text } from "@react-pdf/renderer";
import { FONTS, RADIUS } from "../tokens";
import { porTema, temaDe, type PdfLinea, type PdfTheme } from "../tema";
import { t as traducir, fmtDate, fmtCurrency, type PdfTranslations } from "../translations";
import { DocPage } from "../components/doc-page";
import { DocumentHeader, type MetaDato } from "../components/document-header";
import { ClientBlock } from "../components/client-block";
import { Eyebrow } from "../components/section-title";
import { DocumentFooter } from "../components/document-footer";
import { nombreMetodo } from "../components/abonos-table";
import type { DatosRecibo } from "@/lib/pagos/recibo";

type Recibo = NonNullable<DatosRecibo>;

const estilos = porTema((th) => ({
  // El monto recibido en un `.dark-block`; a la derecha, lo que queda de la factura.
  block: { flexDirection: "row", backgroundColor: th.dark, borderRadius: RADIUS.block, paddingVertical: 16, paddingHorizontal: 18, marginBottom: 22 },
  blockMain: { flex: 1 },
  blockSide: { width: 170, borderLeftWidth: 1, borderLeftColor: th.onDarkLine, paddingLeft: 16, justifyContent: "center" },
  blockLabel: { fontFamily: FONTS.body, fontWeight: 700, fontSize: 7, letterSpacing: 1.2, color: th.onDarkSoft, textTransform: "uppercase" },
  blockValue: { fontFamily: FONTS.heading, fontWeight: 800, fontSize: 24, letterSpacing: -0.4, color: th.accentOnDark, marginTop: 5 },
  sideValue: { fontFamily: FONTS.heading, fontWeight: 800, fontSize: 13, color: th.white, marginTop: 4 },
  tabla: { marginBottom: 22 },
  fila: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: th.line },
  primera: { borderTopWidth: 1.4, borderTopColor: th.ink },
  izq: { fontFamily: FONTS.body, fontSize: 8.6, color: th.slate },
  der: { fontFamily: FONTS.body, fontSize: 8.6, color: th.ink, fontWeight: 700, textAlign: "right", maxWidth: 300 },
  nota: { fontFamily: FONTS.body, fontSize: 8, color: th.slateLight, lineHeight: 1.6 },
}));

function Cuerpo({ t, d, tr }: { t: PdfTheme; d: Recibo; tr: PdfTranslations }) {
  const s = estilos(t);
  const en = d.lang === "en";
  const money = (n: number) => fmtCurrency(n, d.lang, d.moneda);
  const filas: [string, string][] = d.factura
    ? [
        [en ? "Invoice" : "Factura", d.factura.numero ?? "—"],
        [en ? "Concept" : "Concepto", d.factura.concepto || "—"],
        [en ? "Invoice total" : "Total de la factura", money(d.factura.total)],
        [en ? "Paid to date" : "Pagado a la fecha", money(d.pagadoHasta)],
        [en ? "Balance due" : "Saldo pendiente", money(d.saldo)],
      ]
    : [];
  return (
    <>
      <View style={s.block} wrap={false}>
        <View style={s.blockMain}>
          <Text style={s.blockLabel}>{en ? "Amount received" : "Monto recibido"}</Text>
          <Text style={s.blockValue}>{money(d.pago.monto)}</Text>
        </View>
        {d.factura ? (
          <View style={s.blockSide}>
            <Text style={s.blockLabel}>{tr.balanceDue}</Text>
            <Text style={s.sideValue}>{money(d.saldo)}</Text>
          </View>
        ) : null}
      </View>
      {filas.length > 0 ? (
        <View style={s.tabla} wrap={false}>
          <Eyebrow t={t}>{en ? "Applied to" : "Abono a la factura"}</Eyebrow>
          {filas.map(([k, v], i) => (
            <View key={k} style={i === 0 ? [s.fila, s.primera] : s.fila}>
              <Text style={s.izq}>{k}</Text>
              <Text style={s.der}>{v}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <Text style={s.nota} wrap={false}>
        {en
          ? "This receipt confirms a payment applied to the invoice above. The invoice is the tax document."
          : "Este recibo confirma un abono a la factura indicada. La factura es el documento fiscal."}
      </Text>
    </>
  );
}

/** Recibo de un pago, en la línea de marca del cliente que pagó. */
export function ReciboPdf({ d, linea }: { d: Recibo; linea: PdfLinea }) {
  const t = temaDe(linea);
  const en = d.lang === "en";
  const tr = traducir(d.lang);
  const c = d.cliente;
  const meta: MetaDato[] = [
    { label: en ? "Payment date" : "Fecha del pago", value: fmtDate(d.pago.fecha, d.lang) },
    { label: tr.method, value: nombreMetodo(d.pago.metodo, d.lang) },
    ...(d.pago.referencia ? [{ label: tr.reference, value: d.pago.referencia }] : []),
    { label: en ? "Amount" : "Monto", value: fmtCurrency(d.pago.monto, d.lang, d.moneda), strong: true },
  ];
  return (
    <Document title={`${en ? "Receipt" : "Recibo"} ${d.numero}`} author={d.company?.name ?? "PIME PANAMA"} creator="Pime Communications Suite">
        <DocPage t={t}>
          <DocumentHeader t={t} docLabel={en ? "PAYMENT RECEIPT" : "RECIBO DE PAGO"} docNumber={d.numero} statusLabel={en ? "RECEIVED" : "RECIBIDO"} statusVariant="solid" meta={meta} />
          <ClientBlock t={t}
            tr={tr}
            billToLabel={en ? "RECEIVED FROM" : "RECIBIDO DE"}
            client={{ name: c?.name, company: c?.company, ruc: c?.ruc, address: c?.address, email: c?.email }}
            company={d.company}
          />
          <Cuerpo t={t} d={d} tr={tr} />
          <DocumentFooter t={t} tr={tr} config={d.company} />
        </DocPage>
    </Document>
  );
}
