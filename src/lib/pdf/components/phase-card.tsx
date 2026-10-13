import { View, Text } from "@react-pdf/renderer";
import { FONTS, RADIUS } from "../tokens";
import { porTema, type PdfTheme } from "../tema";
import { Pill } from "./pill";
import { Parrafos } from "./notes-block";

const estilos = porTema((t) => ({
  // Sin `flex: 1`: la tarjeta vive en una grilla que envuelve y Yoga la aplasta. El ancho lo da quien la usa.
  card: { borderRadius: RADIUS.block, padding: 11, display: "flex", flexDirection: "column" },
  cardFirst: { borderWidth: 1.4, borderColor: t.ink },
  cardOptional: { borderWidth: 1, borderColor: t.line },
  tag: { marginBottom: 8 },
  name: { fontFamily: FONTS.heading, fontWeight: 800, fontSize: 11.5, color: t.ink },
  price: { fontFamily: FONTS.heading, fontWeight: 800, fontSize: 14, color: t.accentText, marginTop: 4 },
  timeframe: { fontFamily: FONTS.body, fontWeight: 600, fontSize: 7.4, color: t.slateLight, marginTop: 3, marginBottom: 7 },
  body: { fontFamily: FONTS.body, fontSize: 8.3, color: t.slate, lineHeight: 1.55 },
  footerPill: { marginTop: 10 },
}));

interface PhaseCardProps {
  t: PdfTheme;
  tag: string;
  isFirstPhase: boolean;
  name: string;
  price: string;
  timeframe: string;
  body: string;
  footerLabel: string;
}

/** design-system §4.11 — las fases se aprueban y facturan POR SEPARADO: tarjetas sueltas, nunca una línea de tiempo. */
export function PhaseCard({ t, tag, isFirstPhase, name, price, timeframe, body, footerLabel }: PhaseCardProps) {
  const s = estilos(t);
  return (
    <View style={[s.card, isFirstPhase ? s.cardFirst : s.cardOptional]} wrap={false}>
      <View style={s.tag}>
        <Pill t={t} variant={isFirstPhase ? "solid" : "outline"}>{tag}</Pill>
      </View>
      <Text style={s.name}>{name}</Text>
      <Text style={s.price}>{price}</Text>
      <Text style={s.timeframe}>{timeframe}</Text>
      <Parrafos text={body} style={s.body} />
      <View style={s.footerPill}>
        <Pill t={t} variant="outline">{footerLabel}</Pill>
      </View>
    </View>
  );
}
