"use client";

/** Resultado de una acción del embudo: error en rojo, confirmación en verde. */
export function MensajeEstado({ estado }: { estado: { ok?: boolean; error?: string; mensaje?: string } | null }) {
  if (!estado) return null;
  if (estado.error) return <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger [overflow-wrap:anywhere]">{estado.error}</p>;
  if (estado.ok && estado.mensaje) return <p role="status" className="rounded-lg border border-ok/30 bg-ok/10 px-3 py-2 text-sm text-ok [overflow-wrap:anywhere]">{estado.mensaje}</p>;
  return null;
}
