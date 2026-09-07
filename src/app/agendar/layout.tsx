import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";

/**
 * Página de reserva de citas (PimeBook).
 *
 * Va con `noindex, follow` a propósito: es un formulario, no contenido. Sin
 * título ni descripción propios estaba entrando al índice como página vacía,
 * que es una señal de calidad en contra. `follow` mantiene el flujo de
 * autoridad hacia el resto del sitio.
 */
export const metadata: Metadata = {
  title: "Agendar una reunión | Pime Panamá",
  description:
    "Reservá una llamada con el equipo de Pime Panamá para conversar sobre tu proyecto de software a medida.",
  alternates: { canonical: `${getSiteUrl()}/agendar` },
  robots: { index: false, follow: true },
};

export default function AgendarLayout({ children }: { children: React.ReactNode }) {
  return children;
}
