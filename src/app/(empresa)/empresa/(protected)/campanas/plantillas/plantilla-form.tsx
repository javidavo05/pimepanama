"use client";

import { useActionState, useState } from "react";
import Link from "@/components/empresa/link";
import { campo, etiqueta } from "@/components/empresa/clientes/formularios";
import { btn } from "@/components/empresa/page-header";
import { guardarPlantillaAction } from "../../acciones-campanas";
import { EditorCorreo } from "../editor-correo";

export function PlantillaForm({ p, logoUrl, siteUrl }: { p?: { id: string; nombre: string; asunto: string; cuerpo: string }; logoUrl: string; siteUrl: string }) {
  const [estado, accion, guardando] = useActionState(guardarPlantillaAction, null);
  const [asunto, setAsunto] = useState(p?.asunto ?? "");
  const [cuerpo, setCuerpo] = useState(p?.cuerpo ?? "Hola, {{nombre}}:\n\n\n\nSaludos,\n{{mi_nombre}}");
  return (
    <form action={accion} className="grid gap-6">
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="max-w-xl">
        <label htmlFor="nombre" className={etiqueta}>Nombre de la plantilla</label>
        <input id="nombre" name="nombre" required maxLength={120} defaultValue={p?.nombre} className={campo} placeholder="Ej.: Seguimiento después de la reunión" autoComplete="off" />
        <p className="text-fg-faint text-xs mt-2">Solo lo ve el equipo, para elegirla rápido.</p>
      </div>
      <EditorCorreo asunto={asunto} cuerpo={cuerpo} onAsunto={setAsunto} onCuerpo={setCuerpo} logoUrl={logoUrl} siteUrl={siteUrl} />
      {estado?.error && <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{estado.error}</p>}
      <div className="grid grid-flow-col auto-cols-fr gap-2 sm:flex sm:justify-end">
        <Link href="/empresa/campanas/plantillas" className={btn.secondary}>Cancelar</Link>
        <button type="submit" className={btn.primary} disabled={guardando}>{guardando ? "Guardando…" : "Guardar plantilla"}</button>
      </div>
    </form>
  );
}
