/**
 * Color por tipo de documento, expresado como token del tema.
 *
 * Antes eran hex fijos (#3B82F6, #10B981…) compuestos con sufijo de alfa
 * (`${color}15`). Sobre el panel oscuro se veían bien; en tema claro el ámbar y
 * el esmeralda caían a ~2:1 contra su propio tinte. Los `style` en línea sí
 * resuelven `var()`, así que el token viaja hasta el DOM y sigue al tema.
 */
import type { CSSProperties } from "react";

export const DOC_TYPE_VAR: Record<string, string> = {
  FACTURA: "--c-info",
  // `--c-iris` es el tono de superficie; para texto va `--c-iris-fg`, que es el
  // que está resuelto para leerse en ambos temas (en oscuro, iris solo da 3:1).
  COTIZACION: "--c-iris-fg",
  BITACORA: "--c-emerald2",
  CORREO: "--c-warn",
};

/** Píldora rellena: texto del token sobre su propio tinte. */
export function docTypePillStyle(type: string): CSSProperties {
  const v = DOC_TYPE_VAR[type] ?? "--c-fg-dim";
  return { color: `rgb(var(${v}))`, backgroundColor: `rgb(var(${v}) / 0.15)` };
}

/** Botón contorneado: mismo tono, con borde y relleno más tenue. */
export function docTypeOutlineStyle(cssVar: string): CSSProperties {
  return {
    color: `rgb(var(${cssVar}))`,
    borderColor: `rgb(var(${cssVar}) / 0.3)`,
    backgroundColor: `rgb(var(${cssVar}) / 0.1)`,
  };
}
