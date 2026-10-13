import { View, Text, Image } from "@react-pdf/renderer";
import { FONTS, PAGE, MARGEN } from "../tokens";
import { porTema, type PdfTheme } from "../tema";
import { brandPng } from "../brand-assets";
import { GradientBar } from "./gradient";
import { Pill, type PillVariant } from "./pill";
import type { CompanyConfig } from "@prisma/client";

// Logo horizontal (1048 × 300): 7 mm de alto en el encabezado corrido, 8 mm en el de la primera página.
const LOGO_CORRIDO = { width: 70, height: 20 };
const LOGO_PORTADA = { width: 84, height: 24 };

const estilos = porTema((t) => {
  const oscuro = t.linea === "premium";
  return {
    // Primera página. Normal: blanca con la banda de tres capas (como la portada normal).
    // Premium: negra a sangre con filete de oro y logo invertido (como la portada premium).
    first: {
      marginTop: -MARGEN.arriba,
      marginHorizontal: -MARGEN.lado,
      marginBottom: 18,
      backgroundColor: oscuro ? t.dark : t.paper,
      ...(oscuro ? {} : { borderBottomWidth: 1, borderBottomColor: t.line }),
    },
    top: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: MARGEN.lado, paddingTop: 24 },
    logo: { ...LOGO_PORTADA, objectFit: "contain" },
    right: { alignItems: "flex-end", maxWidth: 300 },
    docLabel: {
      fontFamily: FONTS.body,
      fontWeight: 700,
      fontSize: 8,
      letterSpacing: 1.6,
      textTransform: "uppercase",
      color: oscuro ? t.accentOnDark : t.accentText,
      marginBottom: 5,
    },
    docNumber: { fontFamily: FONTS.heading, fontWeight: 800, fontSize: 20, letterSpacing: -0.4, color: oscuro ? t.white : t.ink },
    pill: { marginTop: 8, alignSelf: "flex-end" },
    meta: {
      flexDirection: "row",
      marginHorizontal: MARGEN.lado,
      marginTop: 16,
      paddingTop: 11,
      paddingBottom: 14,
      borderTopWidth: 1,
      borderTopColor: oscuro ? t.onDarkLine : t.line,
    },
    metaItem: { flex: 1, paddingRight: 10 },
    metaLabel: {
      fontFamily: FONTS.body,
      fontWeight: 700,
      fontSize: 6.6,
      letterSpacing: 1,
      textTransform: "uppercase",
      color: oscuro ? t.onDarkMuted : t.slateLight,
      marginBottom: 4,
    },
    metaValue: { fontFamily: FONTS.body, fontWeight: 600, fontSize: 9.4, color: oscuro ? t.white : t.ink },
    metaStrong: { fontWeight: 800, color: oscuro ? t.accentOnDark : t.ink },
    // Páginas 2+: `.doc-header` (logo a la izquierda, sección a la derecha, filete abajo).
    runningSlot: { position: "absolute", top: 0, left: MARGEN.lado, right: MARGEN.lado },
    running: {
      height: MARGEN.arriba - 16,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: t.line,
    },
    runningLogo: { ...LOGO_CORRIDO, objectFit: "contain" },
    runningTag: { fontFamily: FONTS.body, fontWeight: 700, fontSize: 7.4, letterSpacing: 0.8, textTransform: "uppercase", color: t.slateLight, marginBottom: 4 },
  };
});

export interface MetaDato {
  label: string;
  value: string;
  /** La cifra que importa (total o saldo): más peso y, en premium, en oro. */
  strong?: boolean;
}

interface DocumentHeaderProps {
  t: PdfTheme;
  /** Ya no se usa en el encabezado: los datos de la empresa van en el bloque «Emitida por». */
  config?: Partial<CompanyConfig> | null;
  docLabel: string;
  docNumber: string | null;
  statusLabel?: string;
  statusVariant?: PillVariant;
  /** Metadatos bajo el número (fechas, moneda, total). Hasta cuatro. */
  meta?: MetaDato[];
}

/**
 * Encabezado de los documentos de la suite. En la primera página es el grande (banda de la línea, logo,
 * tipo de documento, número, estado y metadatos); de la segunda en adelante, uno corrido y discreto.
 * La página que lo usa debe tener `paddingTop: MARGEN.arriba` y `paddingHorizontal: MARGEN.lado`.
 */
export function DocumentHeader({ t, docLabel, docNumber, statusLabel, statusVariant = "outline", meta = [] }: DocumentHeaderProps) {
    const s = estilos(t);
  const oscuro = t.linea === "premium";
  const tag = [docLabel, docNumber].filter(Boolean).join(" · ");
  return (
    <>
      <View
        fixed
        style={s.runningSlot}
        render={({ pageNumber }) =>
          pageNumber > 1 ? (
            <View style={s.running}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image style={s.runningLogo} src={brandPng(t.logoColor)} />
              <Text style={s.runningTag}>{tag}</Text>
            </View>
          ) : null
        }
      />
      <View style={s.first}>
        <GradientBar t={t} width={PAGE.width} height={oscuro ? 3.4 : 4.5} />
        <View style={s.top}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image style={s.logo} src={brandPng(oscuro ? t.logoInvertido : t.logoColor)} />
          <View style={s.right}>
            <Text style={s.docLabel}>{docLabel}</Text>
            {docNumber ? <Text style={s.docNumber}>{docNumber}</Text> : null}
            {statusLabel ? (
              <View style={s.pill}>
                <Pill t={t} variant={oscuro ? "sello" : statusVariant}>{statusLabel}</Pill>
              </View>
            ) : null}
          </View>
        </View>
        {meta.length > 0 ? (
          <View style={s.meta}>
            {meta.slice(0, 4).map((m) => (
              <View key={m.label} style={s.metaItem}>
                <Text style={s.metaLabel}>{m.label}</Text>
                <Text style={m.strong ? [s.metaValue, s.metaStrong] : s.metaValue}>{m.value}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={{ height: 22 }} />
        )}
      </View>
    </>
  );
}
