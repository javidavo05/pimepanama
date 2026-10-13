import { StyleSheet } from "@react-pdf/renderer";
import { temaDe, type PdfLinea, type PdfTheme } from "./linea";

export { temaDe, type PdfLinea, type PdfTheme };

// El tema viaja como prop `t` en cada componente, no por React context: las rutas de la API se compilan
// con la condición react-server, que no tiene createContext.

/**
 * Hojas de estilo que dependen de la línea: se crean una vez por línea y se reutilizan.
 * Uso: `const estilos = porTema((t) => ({ caja: { color: t.ink } }));` y `const s = estilos(t);`
 */
export function porTema<T extends Parameters<typeof StyleSheet.create>[0]>(crear: (t: PdfTheme) => T) {
  const cache = new Map<PdfLinea, T>();
  return (t: PdfTheme): T => {
    let s = cache.get(t.linea);
    if (!s) {
      s = StyleSheet.create(crear(t)) as T;
      cache.set(t.linea, s);
    }
    return s;
  };
}
