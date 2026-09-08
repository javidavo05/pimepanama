"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Borrar una reunión desde el listado.
 *
 * Antes solo se podía desde el detalle, lo que obligaba a entrar a cada prueba
 * fallida para deshacerse de ella. Se borra la reunión con su transcripción y su
 * audio en R2, así que se pide confirmación con el título delante: dos filas
 * seguidas se parecen demasiado como para borrar a ciegas.
 */
export function DeleteMeetingButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function remove(e: React.MouseEvent) {
    // La fila entera es un enlace: sin esto, borrar también navega al detalle.
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`¿Borrar «${title}»?\n\nSe pierde la transcripción y el audio grabado. No se puede deshacer.`)) {
      return;
    }

    setBusy(true);
    setError(false);
    try {
      const res = await fetch(`/api/empresa/meetings/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  return (
    <button
      onClick={remove}
      disabled={busy}
      title={error ? "No se pudo borrar" : "Borrar reunión"}
      aria-label={`Borrar ${title}`}
      className={`absolute right-12 top-5 z-10 w-7 h-7 rounded-lg border flex items-center justify-center text-xs transition-all ${
        error
          ? "border-danger/30 text-danger"
          : "border-line text-fg-ghost hover:text-danger hover:border-danger/25 hover:bg-danger/10"
      }`}
    >
      {busy ? "…" : "✕"}
    </button>
  );
}
