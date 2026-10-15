"use client";

/**
 * Tarjetas de selección de la cuenta del cliente (radio). Composición del sistema de propuestas: chip cuadrado
 * con el ícono, título y bajada, y un indicador redondo. Al elegir, el chip pasa a la tinta de la línea con el
 * acento encima, el borde se vuelve tinta, un filete de acento se dibuja arriba y el indicador se llena con un
 * check que se traza. Funciona con teclado (flechas) porque son radios nativos.
 */
import type { ComponentType, SVGProps } from "react";
import { useTheme, type ThemePreference } from "@/components/empresa/theme/theme-provider";

export type Opcion = { v: string; t: string; d?: string; Icon?: ComponentType<SVGProps<SVGSVGElement>> };

export function Opciones({ name, opciones, valor, porDefecto, onCambio, columnas = 2, compacta }: { name: string; opciones: readonly Opcion[]; valor?: string; porDefecto?: string; onCambio?: (v: string) => void; columnas?: 2 | 3; compacta?: boolean }) {
  return (
    <div className={`grid gap-3 ${columnas === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
      {opciones.map(({ v, t, d, Icon }) => (
        <label key={v} className={`p-opcion ${compacta ? "p-opcion-compacta" : ""}`}>
          <input type="radio" name={name} value={v} className="sr-only"
            {...(valor !== undefined ? { checked: valor === v, onChange: () => onCambio?.(v) } : { defaultChecked: porDefecto === v, onChange: () => onCambio?.(v) })} />
          {Icon && <span className="p-opcion-ico" aria-hidden><Icon width={20} height={20} /></span>}
          <span className="min-w-0">
            <span className="block text-fg text-sm font-bold">{t}</span>
            {d && <span className="mt-1 block text-fg-dim text-xs leading-relaxed">{d}</span>}
          </span>
          <span className="p-opcion-marca" aria-hidden>
            <svg viewBox="0 0 20 20"><path d="m5.5 10.5 3 3 6-6.5" pathLength={1} /></svg>
          </span>
        </label>
      ))}
    </div>
  );
}

const Sol = (p: SVGProps<SVGSVGElement>) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" {...p}><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" /></svg>;
const Luna = (p: SVGProps<SVGSVGElement>) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" /></svg>;
const Pantalla = (p: SVGProps<SVGSVGElement>) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>;

/** Apariencia de la cuenta con las mismas tarjetas de selección. */
export function TemaPortal() {
  const { preference, setPreference, ready } = useTheme();
  return (
    <div role="radiogroup" aria-label="Apariencia">
      <Opciones name="tema" columnas={3} compacta valor={ready ? preference : ""} onCambio={(v) => setPreference(v as ThemePreference)}
        opciones={[{ v: "light", t: "Claro", Icon: Sol }, { v: "dark", t: "Oscuro", Icon: Luna }, { v: "system", t: "Como tu equipo", Icon: Pantalla }]} />
    </div>
  );
}
