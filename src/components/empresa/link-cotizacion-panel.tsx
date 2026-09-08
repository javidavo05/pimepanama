"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { linkDocumentsAction } from "@/app/(empresa)/empresa/actions";
import Link from "next/link";

interface Cotizacion {
  id: string;
  number: string | null;
  clientName: string | null;
  total: number | null;
}

interface LinkCotizacionPanelProps {
  facturaId: string;
  cotizaciones: Cotizacion[];
}

export function LinkCotizacionPanel({ facturaId, cotizaciones }: LinkCotizacionPanelProps) {
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function handleLink() {
    if (!selected) return;
    startTransition(async () => {
      await linkDocumentsAction(facturaId, selected);
      setDone(true);
      router.refresh();
    });
  }

  if (done) {
    return (
      <div className="bg-panel border border-ok/20 rounded-xl p-5">
        <p className="text-ok text-sm font-medium">✓ Cotización vinculada correctamente</p>
        <p className="text-fg-dim text-xs mt-1">Recarga la página para ver el pipeline actualizado.</p>
      </div>
    );
  }

  return (
    <div className="bg-panel border border-warn/20 rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-warn text-sm">⚠</span>
        <p className="text-fg-mute text-sm font-medium">Factura sin cotización vinculada</p>
      </div>
      <p className="text-fg-dim text-xs">
        Para un pipeline completo, vincula esta factura a su cotización de origen.
      </p>

      {cotizaciones.length === 0 ? (
        <Link
          href={`/empresa/cotizaciones/nueva`}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-fill border border-line text-fg-dim text-xs hover:text-fg hover:border-line-loud transition-all"
        >
          + Crear cotización retroactiva
        </Link>
      ) : (
        <div className="flex items-center gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            aria-label="Cotización a vincular"
            className="flex-1 bg-fill border border-line rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-brand/40 transition-all"
          >
            <option value="">Seleccionar cotización...</option>
            {cotizaciones.map((c) => (
              <option key={c.id} value={c.id}>
                {c.number ?? c.id} — {c.clientName ?? "Sin cliente"}{c.total != null ? ` — $${Number(c.total).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : ""}
              </option>
            ))}
          </select>
          <button
            onClick={handleLink}
            disabled={!selected || pending}
            className="px-4 py-2 rounded-lg bg-brand/10 border border-brand/25 text-brand-fg text-sm font-medium hover:bg-brand/15 disabled:opacity-40 transition-all shrink-0"
          >
            {pending ? "Vinculando..." : "Vincular"}
          </button>
        </div>
      )}
    </div>
  );
}
