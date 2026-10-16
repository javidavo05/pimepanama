"use client";

import Link from "next/link";
import { btnPrincipal, btnSecundario } from "@/components/portal/ui";

/** Si una sección de Documentos no carga: qué pasó en palabras simples y cómo seguir. */
export default function ErrorDocumentos({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="p-card p-6 sm:p-8 min-w-0 space-y-4" role="alert">
      <h1 className="text-fg text-xl font-bold tracking-tight">No pudimos cargar esta sección</h1>
      <p className="text-fg-dim text-sm leading-relaxed max-w-xl">Puede ser la conexión o un problema de nuestro lado. Tus documentos están a salvo; vuelve a intentarlo en un momento y, si sigue igual, abre un ticket y lo revisamos.</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={reset} className={btnPrincipal}>Intentar de nuevo</button>
        <Link href="/cliente/tickets/nuevo" className={btnSecundario}>Abrir un ticket</Link>
      </div>
    </section>
  );
}
