"use client";

/**
 * Fuente, industria, etiquetas y campos propios dentro del formulario del cliente (va en la ranura `extra`
 * de ClienteForm). `crm=1` le dice a guardarClienteAction que estos datos vienen en el formulario.
 */
import { useState, type KeyboardEvent } from "react";
import Link from "@/components/empresa/link";
import { FUENTES_CLIENTE, limpiarEtiquetas } from "@/lib/crm/ficha";
import { campo, etiqueta } from "@/components/empresa/clientes/formularios";

export type CampoDef = { clave: string; etiqueta: string; tipo: string; opciones: string[] };

function Etiquetas({ inicial, sugeridas }: { inicial: string[]; sugeridas: string[] }) {
  const [lista, setLista] = useState(inicial);
  const [texto, setTexto] = useState("");
  const agregar = (v: string) => { const n = limpiarEtiquetas([...lista, ...v.split(",")]); setLista(n); setTexto(""); };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && texto.trim()) { e.preventDefault(); agregar(texto); }
    else if (e.key === "Enter") e.preventDefault();
    else if (e.key === "Backspace" && !texto && lista.length) setLista(lista.slice(0, -1));
  };
  const libres = sugeridas.filter((s) => !lista.some((x) => x.toLowerCase() === s.toLowerCase())).slice(0, 8);
  return (
    <div className="sm:col-span-2">
      <label htmlFor="crm-etiqueta" className={etiqueta}>Etiquetas</label>
      <input type="hidden" name="etiquetas" value={JSON.stringify(lista)} />
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line-mid bg-fill p-2 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
        {lista.map((t) => (
          <span key={t} className="inline-flex max-w-full items-center gap-1 rounded-full bg-brand/10 pl-3 text-xs font-semibold text-brand-fg">
            <span className="[overflow-wrap:anywhere]">{t}</span>
            <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-full text-base hover:bg-brand/15" aria-label={`Quitar ${t}`} onClick={() => setLista(lista.filter((x) => x !== t))}>×</button>
          </span>
        ))}
        <input id="crm-etiqueta" value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={onKey} onBlur={() => texto.trim() && agregar(texto)}
          className="min-h-9 min-w-32 flex-1 bg-transparent px-1 text-base sm:text-sm text-fg placeholder:text-fg-trace focus:outline-none" placeholder={lista.length ? "Otra…" : "VIP, gobierno, mantenimiento…"} autoComplete="off" />
      </div>
      <p className="mt-1 text-xs text-fg-dim">Escribe y presiona Enter. Sirven para filtrar y agrupar clientes.</p>
      {libres.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {libres.map((s) => <button key={s} type="button" onClick={() => agregar(s)} className="inline-flex min-h-11 sm:min-h-8 items-center rounded-full border border-line-mid px-3 text-xs text-fg-mute hover:border-line-loud hover:text-fg">+ {s}</button>)}
        </div>
      )}
    </div>
  );
}

function CampoPropio({ k, valor }: { k: CampoDef; valor: unknown }) {
  const id = `campo-${k.clave}`;
  const name = `campo_${k.clave}`;
  const v = valor == null ? "" : String(valor);
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={etiqueta}>{k.etiqueta}</label>
      {k.tipo === "opcion" ? (
        <select id={id} name={name} defaultValue={k.opciones.includes(v) ? v : ""} className={campo}>
          <option value="">Sin elegir</option>
          {k.opciones.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : k.tipo === "fecha" ? (
        <input id={id} name={name} type="date" defaultValue={v} className={campo} />
      ) : k.tipo === "numero" ? (
        <input id={id} name={name} inputMode="decimal" defaultValue={v} className={campo} autoComplete="off" />
      ) : (
        <input id={id} name={name} defaultValue={v} className={campo} autoComplete="off" />
      )}
    </div>
  );
}

export function CamposCrm({ fuente, industria, etiquetas, camposExtra, campos, industrias, etiquetasUsadas, puedeDefinir }: {
  fuente?: string | null; industria?: string | null; etiquetas?: string[]; camposExtra?: Record<string, unknown> | null;
  campos: CampoDef[]; industrias: string[]; etiquetasUsadas: string[]; puedeDefinir: boolean;
}) {
  return (
    <fieldset className="space-y-4 border-t border-line pt-6">
      <input type="hidden" name="crm" value="1" />
      <legend className="sr-only">Datos de venta</legend>
      <div>
        <p className="text-fg text-sm font-semibold">Datos de venta</p>
        <p className="text-fg-dim text-xs">De dónde vino y a qué se dedica. El cliente no ve esto.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="min-w-0">
          <label htmlFor="crm-fuente" className={etiqueta}>Cómo nos conoció</label>
          <select id="crm-fuente" name="fuente" defaultValue={fuente ?? ""} className={campo}>
            <option value="">Sin dato</option>
            {FUENTES_CLIENTE.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div className="min-w-0">
          <label htmlFor="crm-industria" className={etiqueta}>Industria</label>
          <input id="crm-industria" name="industria" list="crm-industrias" defaultValue={industria ?? ""} className={campo} placeholder="Restaurantes, salud, logística…" autoComplete="off" />
          <datalist id="crm-industrias">{industrias.map((i) => <option key={i} value={i} />)}</datalist>
        </div>
        <Etiquetas inicial={etiquetas ?? []} sugeridas={etiquetasUsadas} />
      </div>
      {campos.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {campos.map((k) => <CampoPropio key={k.clave} k={k} valor={camposExtra?.[k.clave]} />)}
        </div>
      )}
      {puedeDefinir && (
        <p className="text-xs text-fg-dim">
          {campos.length ? "¿Falta un dato? " : "¿Necesitas guardar otro dato de cada cliente, como su número de sucursales? "}
          <Link href="/empresa/configuracion/campos" className="text-brand-fg hover:underline">Define tus campos propios</Link>.
        </p>
      )}
    </fieldset>
  );
}
