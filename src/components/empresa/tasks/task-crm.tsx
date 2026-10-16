"use client";

/**
 * Campos del CRM en una tarea (fase 4): buscador de cliente, lead u oportunidad y selector de responsable.
 * Se usan en el cajón de la tarea y en el alta de la lista de tareas.
 */
import Link from "@/components/empresa/link";
import { useEffect, useId, useRef, useState } from "react";
import type { MiembroOption } from "./types";

export type TipoVinculo = "cliente" | "lead" | "oportunidad";
export type Vinculo = { id: string; nombre: string };
type Resultado = Vinculo & { detalle: string | null };

const NOMBRE: Record<TipoVinculo, { uno: string; varios: string }> = {
  cliente: { uno: "cliente", varios: "clientes" },
  lead: { uno: "lead", varios: "leads" },
  oportunidad: { uno: "oportunidad", varios: "oportunidades abiertas" },
};

const HREF: Partial<Record<TipoVinculo, (id: string) => string>> = {
  cliente: (id) => `/empresa/clientes/${id}`,
  lead: (id) => `/empresa/leads/${id}`,
};

/** Buscador de un vínculo: muestra el elegido con «Quitar», o un campo que busca mientras se escribe. */
export function BuscadorVinculo({
  tipo,
  valor,
  onChange,
  fieldClass,
}: {
  tipo: TipoVinculo;
  valor: Vinculo | null;
  onChange: (v: Vinculo | null) => void;
  fieldClass: string;
}) {
  const [q, setQ] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [estado, setEstado] = useState<"cargando" | "listo" | "error">("listo");
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const listaId = useId();
  const seq = useRef(0);

  useEffect(() => {
    if (!abierto) return;
    const n = ++seq.current;
    setEstado("cargando");
    const t = setTimeout(() => {
      fetch(`/api/empresa/tasks/vinculos?tipo=${tipo}&q=${encodeURIComponent(q.trim())}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((d: Resultado[]) => {
          if (n !== seq.current) return;
          setResultados(d);
          setEstado("listo");
        })
        .catch(() => n === seq.current && setEstado("error"));
    }, 250);
    return () => clearTimeout(t);
  }, [q, abierto, tipo]);

  if (valor) {
    const href = HREF[tipo]?.(valor.id);
    return (
      <div className="flex items-center gap-2 min-w-0">
        {href ? (
          <Link href={href} className="flex-1 min-w-0 flex items-center px-3 min-h-11 text-sm text-brand-fg hover:underline">
            <span className="truncate">{valor.nombre}</span>
          </Link>
        ) : (
          <span className="flex-1 min-w-0 flex items-center px-3 min-h-11 text-sm text-fg-soft">
            <span className="truncate">{valor.nombre}</span>
          </span>
        )}
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label={`Quitar ${NOMBRE[tipo].uno}`}
          className="px-3 min-h-11 text-xs text-fg-faint hover:text-fg-mute shrink-0"
        >
          Quitar
        </button>
      </div>
    );
  }

  return (
    <div className="relative min-w-0">
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        // Espera al toque en un resultado antes de cerrar la lista
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        onKeyDown={(e) => e.key === "Escape" && setAbierto(false)}
        placeholder={`Buscar ${NOMBRE[tipo].uno}`}
        role="combobox"
        aria-expanded={abierto}
        aria-controls={listaId}
        aria-autocomplete="list"
        className={`${fieldClass} placeholder:text-fg-faint`}
      />
      {abierto && (
        <div id={listaId} role="listbox" className="absolute z-20 inset-x-0 top-full mt-1 bg-pop border border-line-mid rounded-lg shadow-2xl overflow-hidden max-h-72 overflow-y-auto">
          {estado === "error" ? (
            <p className="px-3 py-3 text-sm text-danger" role="alert">No se pudo buscar. Revisa tu conexión e inténtalo de nuevo.</p>
          ) : estado === "cargando" && resultados.length === 0 ? (
            <p className="px-3 py-3 text-sm text-fg-dim">Buscando…</p>
          ) : resultados.length === 0 ? (
            <p className="px-3 py-3 text-sm text-fg-dim">
              {q.trim() ? `No hay ${NOMBRE[tipo].varios} con «${q.trim()}».` : `Todavía no hay ${NOMBRE[tipo].varios}.`}
            </p>
          ) : (
            resultados.map((r) => (
              <button
                key={r.id}
                type="button"
                role="option"
                aria-selected={false}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange({ id: r.id, nombre: r.nombre });
                  setQ("");
                  setAbierto(false);
                }}
                className="w-full text-left px-3 min-h-11 py-2 flex flex-col justify-center hover:bg-fill focus:bg-fill outline-none"
              >
                <span className="text-sm text-fg-soft [overflow-wrap:anywhere]">{r.nombre}</span>
                {r.detalle && <span className="text-xs text-fg-faint [overflow-wrap:anywhere]">{r.detalle}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/** Responsable de la tarea entre la gente del equipo. Mientras carga el equipo muestra al actual. */
export function SelectorResponsable({
  valor,
  equipo,
  onChange,
  className,
  ariaLabel = "Responsable",
}: {
  valor: Vinculo | null;
  equipo: MiembroOption[] | null;
  onChange: (v: Vinculo | null) => void;
  className: string;
  ariaLabel?: string;
}) {
  const opciones = equipo ?? (valor ? [valor] : []);
  const lista = valor && !opciones.some((m) => m.id === valor.id) ? [...opciones, valor] : opciones;
  return (
    <select
      value={valor?.id ?? ""}
      onChange={(e) => {
        const m = lista.find((x) => x.id === e.target.value);
        onChange(m ? { id: m.id, nombre: m.nombre } : null);
      }}
      aria-label={ariaLabel}
      className={`${className} appearance-none cursor-pointer`}
    >
      <option value="">Sin responsable</option>
      {lista.map((m) => (
        <option key={m.id} value={m.id}>
          {m.nombre}
        </option>
      ))}
    </select>
  );
}
