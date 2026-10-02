import NextLink from "next/link";
import type { ComponentProps } from "react";

/**
 * `next/link` sin precarga por defecto para todo el panel /empresa.
 *
 * Next precarga cada enlace que entra en pantalla, y en el panel todas las
 * rutas son dinámicas: cada precarga es una función de Vercel con su
 * middleware. Una página de facturas o el dashboard disparaban 20–30 al
 * abrirse, y la cuota Hobby (4 h de CPU activa al mes) se agotó en sep-2026.
 * Quien de verdad se usa a cada rato (las pestañas del celular) pide
 * `prefetch={null}` para volver al comportamiento de Next.
 */
export default function Link({ prefetch = false, ...props }: ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={prefetch} {...props} />;
}
