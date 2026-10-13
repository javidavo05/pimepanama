import { View, Text } from "@react-pdf/renderer";
import { FONTS } from "../tokens";
import { porTema, type PdfTheme } from "../tema";
import type { PdfTranslations } from "../translations";

const estilos = porTema((t) => ({
  container: { marginTop: 14 },
  acceptanceText: { fontFamily: FONTS.body, fontWeight: 500, fontSize: 7.8, color: t.slate, marginBottom: 14, lineHeight: 1.6 },
  row: { flexDirection: "row" },
  block: { flex: 1 },
  gap: { width: 32 },
  line: { borderBottomWidth: 1, borderBottomColor: t.ink, height: 28, marginBottom: 6 },
  label: { fontFamily: FONTS.body, fontWeight: 700, fontSize: 7, color: t.accentText, letterSpacing: 1 },
  subLabel: { fontFamily: FONTS.body, fontSize: 6.8, color: t.slateLight, marginTop: 2 },
}));

interface SignatureBlockProps {
  t: PdfTheme;
  tr: PdfTranslations;
  showAcceptance?: boolean;
  acceptanceText?: string;
}

/** Firmas de las dos partes. Va entero en una página. */
export function SignatureBlock({ t, tr, showAcceptance, acceptanceText }: SignatureBlockProps) {
  const s = estilos(t);
  return (
    <View style={s.container} wrap={false}>
      {showAcceptance && acceptanceText ? <Text style={s.acceptanceText}>{acceptanceText}</Text> : null}
      <View style={s.row}>
        <View style={s.block}>
          <View style={s.line} />
          <Text style={s.label}>{tr.authorizedBy}</Text>
          <Text style={s.subLabel}>{tr.signature} / {tr.date}</Text>
        </View>
        <View style={s.gap} />
        <View style={s.block}>
          <View style={s.line} />
          <Text style={s.label}>{tr.receivedBy}</Text>
          <Text style={s.subLabel}>{tr.signature} / {tr.date}</Text>
        </View>
      </View>
    </View>
  );
}
