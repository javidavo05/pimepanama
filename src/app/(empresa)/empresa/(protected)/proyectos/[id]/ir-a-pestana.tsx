"use client";

import { irAPestana } from "@/components/empresa/clientes/ficha-tabs";

/** Botón que cambia de pestaña del proyecto sin recargar, con su entrada en el historial. */
export function IrAPestana({ tab, className, children }: { tab: string; className: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={() => irAPestana(tab)} className={className}>
      {children}
    </button>
  );
}
