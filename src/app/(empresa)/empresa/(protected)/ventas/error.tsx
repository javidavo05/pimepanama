"use client";

import { btn } from "@/components/empresa/page-header";

export default function VentasError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="rounded-xl border border-line bg-panel px-6 py-12 text-center" role="alert">
        <p className="font-medium text-fg-mute">No se pudo cargar el embudo de ventas</p>
        <p className="mt-1 text-sm text-fg-dim">Puede ser la conexión con la base de datos. Tus oportunidades no se perdieron.</p>
        <button type="button" onClick={reset} className={`${btn.primary} mt-6`}>Volver a intentar</button>
      </div>
    </div>
  );
}
