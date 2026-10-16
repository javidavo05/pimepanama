/**
 * CSV propio, sin librerías (fase 6 del CRM). Lee lo que sale de Excel, Google Sheets y Numbers: comillas, comas y
 * saltos de línea dentro de comillas, comillas dobles escapadas, `;` como separador (Excel en español), BOM y
 * finales de línea de Windows. Escribe CSV que Excel abre con tildes (BOM + CRLF).
 */

/** El separador más probable: el que más aparece fuera de comillas en la primera línea. */
export function detectarSeparador(texto: string): "," | ";" | "\t" {
  const cuenta: Record<string, number> = { ",": 0, ";": 0, "\t": 0 };
  let enComillas = false;
  for (const ch of texto.replace(/^﻿/, "")) {
    if (ch === '"') enComillas = !enComillas;
    else if (!enComillas && (ch === "\n" || ch === "\r")) break;
    else if (!enComillas && ch in cuenta) cuenta[ch]++;
  }
  if (cuenta[";"] > cuenta[","] && cuenta[";"] >= cuenta["\t"]) return ";";
  if (cuenta["\t"] > cuenta[","]) return "\t";
  return ",";
}

/** Texto CSV → filas de celdas. Quita las filas completamente vacías. */
export function parseCsv(texto: string, separador?: string): string[][] {
  const t = texto.replace(/^﻿/, "");
  const sep = separador ?? detectarSeparador(t);
  const filas: string[][] = [];
  let fila: string[] = [];
  let celda = "";
  let enComillas = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (enComillas) {
      if (ch === '"') {
        if (t[i + 1] === '"') { celda += '"'; i++; }
        else enComillas = false;
      } else celda += ch;
      continue;
    }
    if (ch === '"' && celda.trim() === "") { celda = ""; enComillas = true; }
    else if (ch === sep) { fila.push(celda); celda = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && t[i + 1] === "\n") i++;
      fila.push(celda); filas.push(fila); fila = []; celda = "";
    } else celda += ch;
  }
  if (celda !== "" || fila.length) { fila.push(celda); filas.push(fila); }
  return filas.map((f) => f.map((c) => c.trim())).filter((f) => f.some((c) => c !== ""));
}

/**
 * Una celda lista para CSV. Comillas si hace falta y, para que Excel no la ejecute como fórmula, un apóstrofo
 * delante de lo que empieza con = @ o + y - que no sean un número (un teléfono «+507…» queda igual).
 */
export function celdaCsv(v: unknown, sep = ","): string {
  let s = v == null ? "" : v instanceof Date ? v.toISOString().slice(0, 10) : String(v);
  if (/^[=@\t\r]/.test(s) || (/^[+-]/.test(s) && !/^[+-][\d\s().-]*$/.test(s))) s = `'${s}`;
  return s.includes(sep) || /["\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Filas → texto CSV con BOM y CRLF (Excel lo abre con tildes). */
export function aCsv(encabezados: string[], filas: unknown[][], sep = ","): string {
  return "﻿" + [encabezados, ...filas].map((f) => f.map((c) => celdaCsv(c, sep)).join(sep)).join("\r\n") + "\r\n";
}

/** Nombre de archivo con la fecha de hoy: «clientes-2026-10-16.csv». */
export function nombreArchivo(base: string, hoy = new Date()): string {
  return `${base}-${hoy.toLocaleDateString("en-CA", { timeZone: "America/Panama" })}.csv`;
}
