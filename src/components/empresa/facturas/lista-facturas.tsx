/**
 * Lista de facturas con descarga del PDF, la misma en la ficha del cliente y en el proyecto.
 * Cada fila abre la factura; el botón «PDF» la descarga sin abrirla.
 */
import Link from "@/components/empresa/link";
import { StatusBadge } from "@/components/empresa/document-builder/status-badge";
import type { DocumentStatus } from "@prisma/client";
import { dinero } from "@/lib/portal/datos";

export type FilaFactura = {
  id: string;
  number: string | null;
  title: string;
  status: string;
  total: number;
  falta?: number;
  issueDate: Date;
  /** Proyecto de la factura, para listas que mezclan proyectos. */
  proyecto?: string | null;
};

const fecha = (d: Date) => d.toLocaleDateString("es-PA", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Panama" });

export function ListaFacturas({ facturas, vacio = "Sin facturas todavía." }: { facturas: FilaFactura[]; vacio?: string }) {
  if (!facturas.length) return <p className="mt-3 text-sm text-fg-dim">{vacio}</p>;
  return (
    <ul className="mt-3 divide-y divide-line">
      {facturas.map((x) => {
        const nombre = x.number ?? "Factura";
        return (
          <li key={x.id} className="flex items-center gap-2 py-2">
            <Link href={`/empresa/facturas/${x.id}`} className="flex min-w-0 flex-1 items-center gap-3 min-h-12 -ml-2 px-2 rounded-lg hover:bg-fill">
              <span className="min-w-0 flex-1">
                <span className="block text-fg text-sm font-medium line-clamp-2 sm:truncate">{nombre} · {x.title}</span>
                <span className="block text-fg-dim text-xs">
                  <span className="sm:hidden font-mono text-fg">{dinero(x.total)} · </span>
                  {fecha(x.issueDate)}
                  {x.proyecto ? ` · ${x.proyecto}` : ""}
                  {x.falta !== undefined && x.falta > 0.005 && x.status !== "DRAFT" && x.status !== "CANCELLED" ? ` · falta ${dinero(x.falta)}` : ""}
                </span>
              </span>
              <span className="hidden sm:block w-32 shrink-0 text-right font-mono text-sm text-fg">{dinero(x.total)}</span>
              <span className="flex w-24 shrink-0 justify-center"><StatusBadge status={x.status as DocumentStatus} /></span>
            </Link>
            <a
              href={`/api/empresa/documents/${x.id}/pdf`}
              download={`${nombre}.pdf`}
              aria-label={`Descargar el PDF de ${nombre}`}
              className="inline-flex shrink-0 items-center justify-center gap-2 min-h-11 sm:min-h-10 px-3 rounded-lg border border-line-mid text-sm font-semibold text-fg-mute hover:text-fg hover:border-line-loud"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>
              PDF
            </a>
          </li>
        );
      })}
    </ul>
  );
}
