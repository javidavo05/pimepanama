import fs from "fs";
import path from "path";
import { temaDe, type PdfLinea } from "./linea";

const cache = new Map<string, string>();

/**
 * Archivos de marca para react-pdf (que no lee SVG en <Image>): en el servidor se leen de /public y se pasan
 * como data URL; en la vista previa del navegador se usa la ruta pública. Mismo criterio que fonts.ts.
 */
export function brandPng(filename: string): string {
  if (typeof window !== "undefined") return `/brand/${filename}`;
  let src = cache.get(filename);
  if (!src) {
    const bytes = fs.readFileSync(path.join(process.cwd(), "public", "brand", filename));
    src = `data:image/png;base64,${bytes.toString("base64")}`;
    cache.set(filename, src);
  }
  return src;
}

/** Logo horizontal de la línea: a color para fondo blanco, invertido para fondo oscuro. */
export function logoDeLinea(linea: PdfLinea, modo: "color" | "invertido" = "color"): string {
  const t = temaDe(linea);
  return brandPng(modo === "color" ? t.logoColor : t.logoInvertido);
}

/** Proporción del logo horizontal (PNG de 1048 × 300). */
export const LOGO_RATIO = 1048 / 300;
