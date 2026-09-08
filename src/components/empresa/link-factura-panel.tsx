"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { linkDocumentsAction } from "@/app/(empresa)/empresa/actions";

interface Factura {
  id: string;
  number: string | null;
  clientName: string | null;
  total: number | null;
}

interface LinkFacturaPanelProps {
  cotizacionId: string;
  facturas: Factura[];
}

export function LinkFacturaPanel({ cotizacionId, facturas }: LinkFacturaPanelProps) {
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function handleLink() {
    if (!selected) return;
    startTransition(async () => {
      await linkDocumentsAction(selected, cotizacionId);
      setDone(true);
      router.refresh();
    });
  }

  if (done) {
    return (
      <div className="bg-panel border border-green-500/20 rounded-xl p-5">
        <p className="text-ok text-sm font-medium">✓ Factura vinculada correctamente</p>
        <p className="text-fg-dim text-xs mt-1">Recarga la página para ver el pipeline actualizado.</p>
      </div>
    );
  }

  return (
    <div className="bg-panel border border-amber-500/20 rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-warn text-sm">⚠</span>
        <p className="text-fg-mute text-sm font-medium">Cotización sin factura vinculada</p>
      </div>
      <p className="text-fg-dim text-xs">
        Si ya existe una factura para esta cotización, vincúlala aquí.
      </p>

      {facturas.length === 0 ? (
        <Link
          href="/empresa/facturas/nueva"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-fill border border-line text-fg-dim text-xs hover:text-fg hover:border-line-loud transition-all"
        >
          + Crear factura retroactiva
        </Link>
      ) : (
        <div className="flex items-center gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            aria-label="Factura a vincular"
            className="flex-1 bg-fill border border-line rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-brand/40 transition-all"
          >
            <option value="">Seleccionar factura...</option>
            {facturas.map((f) => (
              <option key={f.id} value={f.id}>
                {f.number ?? f.id} — {f.clientName ?? "Sin cliente"}{f.total != null ? ` — $${Number(f.total).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : ""}
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
