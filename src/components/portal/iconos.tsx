/** Íconos del portal: un solo estilo (línea de 1.75 px, esquinas redondeadas, 24 × 24). */
import type { SVGProps } from "react";

const base = (props: SVGProps<SVGSVGElement>) => ({ width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, ...props });

export const IconInicio = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M4 11.5 12 5l8 6.5" /><path d="M6 10v9h12v-9" /><path d="M10 19v-5h4v5" /></svg>;
export const IconProyectos = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M4 16.5 12 20l8-3.5" /><path d="M4 12.5 12 16l8-3.5" /><path d="M12 4 4 8.5 12 12l8-3.5Z" /></svg>;
export const IconTickets = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M5 5h14v10H9l-4 4Z" /><path d="M9 9h6" /><path d="M9 12h4" /></svg>;
export const IconFacturas = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M7 3h10v18l-2.5-1.5L12 21l-2.5-1.5L7 21Z" /><path d="M10 8h4" /><path d="M10 12h4" /></svg>;
export const IconCuenta = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c1.2-3.5 3.8-5 7-5s5.8 1.5 7 5" /></svg>;
export const IconMas = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M12 5v14" /><path d="M5 12h14" /></svg>;
export const IconFlecha = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M9 6l6 6-6 6" /></svg>;
export const IconAtras = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M15 6l-6 6 6 6" /></svg>;
export const IconClip = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="m20 11.5-7.8 7.8a5 5 0 0 1-7-7l8.3-8.3a3.3 3.3 0 0 1 4.7 4.7l-8.3 8.3a1.7 1.7 0 0 1-2.3-2.3l7.5-7.6" /></svg>;
export const IconCheck = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;
export const IconSalir = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M14 4h5v16h-5" /><path d="M10 8l-4 4 4 4" /><path d="M6 12h10" /></svg>;
export const IconEscudo = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6Z" /><path d="m9 12 2 2 4-4" /></svg>;
export const IconDocumentos = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M8 3h7l4 4v11H8Z" /><path d="M15 3v4h4" /><path d="M5 7v14h11" /><path d="M11 12h5" /><path d="M11 15h3" /></svg>;
export const IconDescargar = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M12 4v11" /><path d="m7.5 10.5 4.5 4.5 4.5-4.5" /><path d="M5 19h14" /></svg>;
export const IconSubir = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M12 15V4" /><path d="m7.5 8.5 4.5-4.5 4.5 4.5" /><path d="M5 19h14" /></svg>;
