import { View, Text } from "@react-pdf/renderer";
import { FONTS, RADIUS } from "../tokens";
import { porTema, type PdfTheme } from "../tema";
import type { PdfTranslations } from "../translations";
import type { PdfPaymentMethod } from "../payment-methods";
import { Eyebrow } from "./section-title";
import { Parrafos } from "./notes-block";

const estilos = porTema((t) => ({
  container: { marginBottom: 8 },
  row: { flexDirection: "row", flexWrap: "wrap" },
  card: {
    marginBottom: 10,
    backgroundColor: t.panel,
    borderWidth: 1,
    borderColor: t.line,
    borderRadius: RADIUS.card,
    padding: 11,
  },
  methodLabel: { fontFamily: FONTS.body, fontWeight: 700, fontSize: 6.6, color: t.slateLight, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 4 },
  methodValue: { fontFamily: FONTS.heading, fontWeight: 700, fontSize: 9.4, color: t.ink, lineHeight: 1.4 },
  methodSub: { fontFamily: FONTS.body, fontSize: 7.8, color: t.slate, lineHeight: 1.5, marginTop: 2 },
}));

/** Formas de pago en tarjetas (`.grid3` de `.card`). Va entero en una página. */
export function PaymentInfoBlock({ t, tr, methods }: { t: PdfTheme; tr: PdfTranslations; methods: PdfPaymentMethod[] }) {
  const s = estilos(t);
  if (methods.length === 0) return null;
  // Tres por fila; con cuatro, los cuatro en una fila para que no quede uno solo abajo.
  const cols = methods.length === 4 ? 4 : 3;
  return (
    <View style={s.container} wrap={false}>
      <Eyebrow t={t}>{tr.paymentMethods}</Eyebrow>
      <View style={s.row}>
        {methods.map((m, i) => (
          <View key={m.id} style={[s.card, { flexBasis: `${(100 - 2 * (cols - 1)) / cols - 0.3}%`, flexGrow: 1, marginRight: i % cols === cols - 1 ? 0 : "2%" }]}>
            <Text style={s.methodLabel}>{m.label}</Text>
            <Text style={s.methodValue}>{m.title}</Text>
            {m.subtitle ? <Parrafos text={m.subtitle} style={s.methodSub} /> : null}
          </View>
        ))}
      </View>
    </View>
  );
}
