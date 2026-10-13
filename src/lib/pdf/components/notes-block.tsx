import { View, Text } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import { FONTS, RADIUS } from "../tokens";
import { porTema, type PdfTheme } from "../tema";
import { Eyebrow } from "./section-title";

const estilos = porTema((t) => ({
  container: { marginBottom: 18 },
  card: { backgroundColor: t.panel, borderWidth: 1, borderColor: t.line, borderRadius: RADIUS.card, padding: 14 },
  text: { fontFamily: FONTS.body, fontSize: 8.6, color: t.slate, lineHeight: 1.65 },
}));

// Hasta este largo la nota va entera en una página; más larga, se deja partir (siempre con el título pegado).
const CABE_ENTERA = 1400;

/**
 * Texto con saltos de línea. Ningún «\n» va dentro de un Text: react-pdf dibuja el salto con Helvetica y
 * el PDF termina con dos familias. Cada línea es su propio Text; entre párrafos (línea en blanco), margen.
 */
export function Parrafos({ text, style }: { text: string; style: Style }) {
  const parrafos = text.trim().replace(/\r\n/g, "\n").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <>
      {parrafos.flatMap((p, i) =>
        p.split("\n").map((linea, j) => (
          <Text key={`${i}-${j}`} style={i > 0 && j === 0 ? [style, { marginTop: 7 }] : style}>
            {linea.trim() || " "}
          </Text>
        ))
      )}
    </>
  );
}

/** Notas o términos: eyebrow y tarjeta. Nunca el título en una página y el texto en la siguiente. */
export function NotesBlock({ t, label, text }: { t: PdfTheme; label: string; text: string | null | undefined }) {
  const s = estilos(t);
  if (!text?.trim()) return null;
  const larga = text.length > CABE_ENTERA;
  return (
    <View style={s.container} wrap={larga}>
      <View minPresenceAhead={80}>
        <Eyebrow t={t}>{label}</Eyebrow>
      </View>
      <View style={s.card} wrap={larga}>
        <Parrafos text={text} style={s.text} />
      </View>
    </View>
  );
}
