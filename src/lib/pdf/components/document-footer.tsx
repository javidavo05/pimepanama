import { View, Text } from "@react-pdf/renderer";
import { FONTS, MARGEN } from "../tokens";
import { porTema, type PdfTheme } from "../tema";
import type { PdfTranslations } from "../translations";
import type { CompanyConfig } from "@prisma/client";

const estilos = porTema((t) => ({
  // `.doc-footer`: filete arriba, empresa a la izquierda y NN / TOTAL a la derecha.
  footer: {
    position: "absolute",
    bottom: 26,
    left: MARGEN.lado,
    right: MARGEN.lado,
    borderTopWidth: 1,
    borderTopColor: t.line,
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  left: { fontFamily: FONTS.body, fontSize: 7.4, color: t.slateLight, fontWeight: 600 },
  dot: { color: t.accent },
  right: { fontFamily: FONTS.body, fontWeight: 600, fontSize: 7.4, color: t.slateLight },
}));

interface DocumentFooterProps {
  t: PdfTheme;
  tr: PdfTranslations;
  config: Partial<CompanyConfig> | null;
  /** Texto del pie. Por defecto, «Empresa · Gracias por su preferencia». */
  notes?: string | null;
}

export function DocumentFooter({ t, tr, config, notes }: DocumentFooterProps) {
  const s = estilos(t);
  const empresa = config?.name ?? "Pime Panamá";
  const resto = config?.footerNotes_es?.trim() || tr.thankyou;
  return (
    <View style={s.footer} fixed>
      <Text style={s.left}>
        {notes ? notes : <>{empresa} <Text style={s.dot}>·</Text> {resto}</>}
      </Text>
      <Text
        style={s.right}
        render={({ pageNumber, totalPages }) => `${String(pageNumber).padStart(2, "0")} / ${String(totalPages).padStart(2, "0")}`}
      />
    </View>
  );
}
