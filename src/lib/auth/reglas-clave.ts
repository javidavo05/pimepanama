/**
 * Requisitos de una contraseña nueva de la cuenta del cliente. Los mismos en el navegador (la lista que se
 * va marcando mientras se escribe) y en el servidor (que la rechaza si no cumple): si se cambia uno, cambia
 * en los dos lados.
 */
export type ReglaClave = { id: string; texto: string; cumple: (clave: string) => boolean };

export const REGLAS_CLAVE: ReglaClave[] = [
  { id: "largo", texto: "Al menos 10 caracteres", cumple: (c) => c.length >= 10 },
  { id: "mayuscula", texto: "Una letra mayúscula", cumple: (c) => /\p{Lu}/u.test(c) },
  { id: "minuscula", texto: "Una letra minúscula", cumple: (c) => /\p{Ll}/u.test(c) },
  { id: "numero", texto: "Un número", cumple: (c) => /\d/.test(c) },
];

/** El primer requisito que falta, como frase para mostrar; null si la contraseña cumple todos. */
export function errorDeClave(clave: string): string | null {
  const falta = REGLAS_CLAVE.find((r) => !r.cumple(clave));
  return falta ? `A la contraseña le falta: ${falta.texto.toLowerCase()}.` : null;
}
