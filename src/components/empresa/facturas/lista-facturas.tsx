/**
 * Lista de facturas con descarga del PDF, la misma en la ficha del cliente y en el proyecto.
 * Cada fila abre la factura; el botón «PDF» la descarga sin abrirla. Debajo van sus pagos, cada uno con su recibo.
 */
import Link from "@/components/empresa/link";
import { StatusBadge } from "@/components/empresa/document-builder/status-badge";
import type { DocumentStatus } from "@prisma/client";
import { dinero } from "@/lib/portal/dinero";

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
  /** Abonos de la factura, cada uno con su recibo. */
  pagos?: { id: string; monto: number; fecha: Date }[];
};

const fechaPago = (d: Date) => new Date(`${d.toISOString().slice(0, 10)}T12:00:00Z`).toLocaleDateString("es-PA", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const BOTON = "inline-flex lg:w-28 shrink-0 items-center justify-center gap-2 min-h-11 sm:min-h-10 px-3 rounded-lg border border-line-mid text-sm font-semibold text-fg-mute hover:text-fg hover:border-line-loud";
const Descarga = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>;
const fecha = (d: Date) => d.toLocaleDateString("es-PA", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Panama" });

export function ListaFacturas({ facturas, vacio = "Sin facturas todavía." }: { facturas: FilaFactura[]; vacio?: string }) {
  if (!facturas.length) return <p className="mt-3 text-sm text-fg-dim">{vacio}</p>;
  return (
    <ul className="mt-3 divide-y divide-line">
      {facturas.map((x) => {
        const nombre = x.number ?? "Factura";
        return (
          <li key={x.id} className="py-2">
            <div className="flex items-center gap-2">
            <Link href={`/empresa/facturas/${x.id}`} className="flex min-w-0 flex-1 items-center gap-3 min-h-12 -ml-2 px-2 rounded-lg hover:bg-fill">
              <span className="min-w-0 flex-1">
                <span className="block text-fg text-sm font-medium line-clamp-2 lg:truncate">{nombre} · {x.title}</span>
                <span className="mt-1 flex lg:hidden"><StatusBadge status={x.status as DocumentStatus} /></span>
                <span className="block text-fg-dim text-xs">
                  <span className="lg:hidden font-mono text-fg">{dinero(x.total)} · </span>
                  {fecha(x.issueDate)}
                  {x.proyecto ? ` · ${x.proyecto}` : ""}
                  {x.falta !== undefined && x.falta > 0.005 && x.status !== "DRAFT" && x.status !== "CANCELLED" ? ` · falta ${dinero(x.falta)}` : ""}
                </span>
              </span>
              <span className="hidden lg:block w-32 shrink-0 text-right font-mono text-sm text-fg">{dinero(x.total)}</span>
              <span className="hidden lg:flex w-24 shrink-0 justify-center"><StatusBadge status={x.status as DocumentStatus} /></span>
            </Link>
            <a
              href={`/api/empresa/documents/${x.id}/pdf`}
              download={`${nombre}.pdf`}
              aria-label={`Descargar el PDF de ${nombre}`}
              className={BOTON}
            >
              <Descarga />
              PDF
            </a>
            </div>
            {x.pagos && x.pagos.length > 0 && (
              <ul className="mt-2 ml-4 border-l border-line pl-4 space-y-1" aria-label={`Pagos de ${nombre}`}>
                {x.pagos.map((p, i) => (
                  <li key={p.id} className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 text-xs text-fg-dim">
                      Pago {i + 1} · {fechaPago(p.fecha)}
                    </span>
                    {/* Mismas columnas que la factura (monto, estado y el relleno del enlace): el monto queda bajo su monto y el recibo bajo su PDF. */}
                    <span className="flex shrink-0 items-center gap-3 lg:pr-2">
                      <span className="lg:w-32 text-right font-mono text-sm text-fg">{dinero(p.monto)}</span>
                      <span className="hidden lg:block w-24" aria-hidden />
                    </span>
                    <a href={`/api/empresa/pagos/${p.id}/recibo`} download aria-label={`Descargar el recibo del pago ${i + 1} de ${nombre}`} className={BOTON}>
                      <Descarga />
                      Recibo
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
