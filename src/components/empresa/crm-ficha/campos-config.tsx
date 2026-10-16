"use client";

/** Definir los campos propios de cada cliente: nombre, tipo de dato y, si es una lista, sus opciones. */
import { useActionState, useEffect, useRef, useState } from "react";
import { borrarCampoAction, guardarCampoAction } from "@/app/(empresa)/empresa/(protected)/acciones-crm-ficha";
import { TIPOS_CAMPO, TIPO_CAMPO_LABEL, type TipoCampo } from "@/lib/crm/ficha";
import { campo, etiqueta } from "@/components/empresa/clientes/formularios";
import { btn } from "@/components/empresa/page-header";
import { Resultado, botonChico } from "./comun";

export type CampoFila = { id: string; etiqueta: string; tipo: string; opciones: string[] };

export function FormCampo({ k, onListo }: { k?: CampoFila; onListo?: () => void }) {
  const [estado, accion, enviando] = useActionState(guardarCampoAction, null);
  const [tipo, setTipo] = useState<TipoCampo>((TIPOS_CAMPO as readonly string[]).includes(k?.tipo ?? "") ? (k!.tipo as TipoCampo) : "texto");
  const ref = useRef<HTMLFormElement>(null);
  const pre = k?.id ?? "nuevo";
  useEffect(() => {
    if (!estado?.ok) return;
    if (k) onListo?.();
    else { ref.current?.reset(); setTipo("texto"); }
  }, [estado, k, onListo]);
  return (
    <form ref={ref} action={accion} className="space-y-4">
      {k && <input type="hidden" name="id" value={k.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="min-w-0">
          <label htmlFor={`${pre}-etq`} className={etiqueta}>Nombre del campo</label>
          <input id={`${pre}-etq`} name="etiqueta" required maxLength={60} defaultValue={k?.etiqueta ?? ""} className={campo} placeholder="Número de sucursales" autoComplete="off" />
        </div>
        <div className="min-w-0">
          <label htmlFor={`${pre}-tipo`} className={etiqueta}>Tipo de dato</label>
          <select id={`${pre}-tipo`} name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoCampo)} className={campo}>
            {TIPOS_CAMPO.map((t) => <option key={t} value={t}>{TIPO_CAMPO_LABEL[t]}</option>)}
          </select>
        </div>
        {tipo === "opcion" && (
          <div className="min-w-0 sm:col-span-2">
            <label htmlFor={`${pre}-ops`} className={etiqueta}>Opciones</label>
            <input id={`${pre}-ops`} name="opciones" defaultValue={k?.opciones.join(", ") ?? ""} className={campo} placeholder="Pequeña, Mediana, Grande" autoComplete="off" />
            <p className="mt-1 text-xs text-fg-dim">Sepáralas con coma. Al editar el cliente se elige una.</p>
          </div>
        )}
      </div>
      <Resultado estado={estado} />
      <div className="flex flex-wrap justify-end gap-2">
        {k && <button type="button" className={btn.secondary} onClick={onListo}>Cancelar</button>}
        <button type="submit" className={btn.primary} disabled={enviando}>{enviando ? "Guardando…" : k ? "Guardar cambios" : "Agregar campo"}</button>
      </div>
    </form>
  );
}

export function FilaCampo({ k }: { k: CampoFila }) {
  const [editando, setEditando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [estado, borrar, borrando] = useActionState(borrarCampoAction, null);
  if (editando) return <li className="py-4"><FormCampo k={k} onListo={() => setEditando(false)} /></li>;
  return (
    <li className="py-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-fg text-sm font-semibold [overflow-wrap:anywhere]">{k.etiqueta}</p>
          <p className="text-fg-dim text-xs [overflow-wrap:anywhere]">{TIPO_CAMPO_LABEL[k.tipo as TipoCampo] ?? k.tipo}{k.opciones.length ? `: ${k.opciones.join(", ")}` : ""}</p>
        </div>
        <div className="flex items-center gap-1 -mr-3">
          <button type="button" className={botonChico} onClick={() => setEditando(true)}>Editar</button>
          {!confirmar && <button type="button" className={`${botonChico} hover:text-danger`} onClick={() => setConfirmar(true)}>Quitar</button>}
        </div>
      </div>
      {confirmar && (
        <form action={borrar} className="flex flex-wrap items-center gap-2 rounded-xl border border-danger/30 bg-danger/5 p-3">
          <input type="hidden" name="id" value={k.id} />
          <p className="text-sm text-fg-mute flex-1 min-w-0">¿Quitar «{k.etiqueta}»? Lo ya escrito en cada cliente no se borra, solo deja de mostrarse.</p>
          <button type="button" className={botonChico} onClick={() => setConfirmar(false)}>No</button>
          <button type="submit" className={`${botonChico} text-danger`} disabled={borrando}>{borrando ? "Quitando…" : "Sí, quitar"}</button>
        </form>
      )}
      <Resultado estado={estado?.error ? estado : null} />
    </li>
  );
}
