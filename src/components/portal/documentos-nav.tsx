"use client";

/** Pestañas de Documentos: resumen, propuestas, contratos, reuniones y archivos. En el teléfono se desliza de lado. */
import Link from "next/link";
import { usePathname } from "next/navigation";

const SECCIONES = [
  { href: "/cliente/documentos", label: "Resumen" },
  { href: "/cliente/propuestas", label: "Propuestas" },
  { href: "/cliente/contratos", label: "Contratos" },
  { href: "/cliente/reuniones", label: "Reuniones" },
  { href: "/cliente/archivos", label: "Archivos" },
];

export function DocumentosNav({ pendientes = {} }: { pendientes?: Partial<Record<string, number>> }) {
  const ruta = usePathname();
  return (
    <nav aria-label="Documentos" className="p-in -mx-4 px-4 overflow-x-auto [scrollbar-width:none]">
      <ul className="flex w-max gap-2">
        {SECCIONES.map(({ href, label }) => {
          const activa = ruta === href || ruta.startsWith(`${href}/`);
          const n = pendientes[href] ?? 0;
          return (
            <li key={href}>
              <Link href={href} aria-current={activa ? "page" : undefined}
                className={`inline-flex items-center gap-2 min-h-11 px-4 rounded-lg border text-sm font-semibold whitespace-nowrap transition-colors ${activa ? "border-line-loud bg-panel text-fg" : "border-line text-fg-dim hover:text-fg hover:border-line-loud"}`}>
                {label}
                {n > 0 && <span className="p-pill bg-warn/10 text-warn tabular-nums" aria-label={`${n} pendientes`}>{n}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
