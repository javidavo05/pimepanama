import fs from "fs";
import path from "path";

/**
 * Archivos de marca para react-pdf (que no lee SVG en <Image>): en el servidor se leen de /public y se pasan
 * como data URL; en la vista previa del navegador se usa la ruta pública. Mismo criterio que fonts.ts.
 */
export function brandPng(filename: string): string {
  if (typeof window === "undefined") {
    const bytes = fs.readFileSync(path.join(process.cwd(), "public", "brand", filename));
    return `data:image/png;base64,${bytes.toString("base64")}`;
  }
  return `/brand/${filename}`;
}

/** Logo horizontal invertido (para fondo azul tinta). Proporción 3.49 : 1. */
export const LOGO_RATIO = 1048 / 300;
