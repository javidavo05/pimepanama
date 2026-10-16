"use client";

/**
 * Formulario de la oportunidad: el mismo para crearla y para editarla. La probabilidad se pre-llena con la
 * de la etapa (mientras nadie la cambie a mano) y el responsable es quien la crea.
 */
import { useActionState, useMemo, useState } from "react";
import Link from "@/components/empresa/link";
import { btn } from "@/components/empresa/page-header";
import { campo, etiqueta } from "@/components/empresa/clientes/formularios";
import { MensajeEstado } from "@/components/empresa/crm/mensaje-estado";
import { crearOportunidadAction, guardarOportunidadAction } from "../acciones-embudo";
import { FUENTES } from "@/lib/crm/embudo";

export type Candidato = { tipo: "lead" | "cliente"; id: string; nombre: string; empresa: string | null; email: string | null; fuente: string | null; valor: number | null };
type Etapa = { id: string; nombre: string; probabilidad: number };
type Persona = { id: string; nombre: string };
export type DatosFormulario = {
  id?: string;
  para?: "lead" | "cliente";
  quienId?: string;
  titulo?: string;
  valor?: string;
  etapaId?: string;
  probabilidad?: number;
  cierreEsperado?: string;
  responsableId?: string;
  fuente?: string;
  notas?: string;
};

const selectCls = `${campo} field-select pr-8`;

export function FormularioOportunidad({
  etapas, equipo, yo, candidatos, inicial, cerrada = false,
}: {
  etapas: Etapa[];
  equipo: Persona[];
  yo: string;
  /** Solo al crear: leads y clientes para el buscador. */
  candidatos?: Candidato[];
  inicial: DatosFormulario;
  /** Ganada o perdida: la etapa, probabilidad y cierre ya no se editan. */
  cerrada?: boolean;
}) {
  const editando = !!inicial.id;
  const [estado, enviar, enviando] = useActionState(editando ? guardarOportunidadAction : crearOportunidadAction, null);
  const preelegido = candidatos?.find((c) => c.tipo === inicial.para && c.id === inicial.quienId) ?? null;
  const [elegido, setElegido] = useState<Candidato | null>(preelegido);
  const [busca, setBusca] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [etapaId, setEtapaId] = useState(inicial.etapaId ?? etapas[0]?.id ?? "");
  const [prob, setProb] = useState(String(inicial.probabilidad ?? etapas.find((e) => e.id === (inicial.etapaId ?? etapas[0]?.id))?.probabilidad ?? 10));
  const [probTocada, setProbTocada] = useState(editando);
  const [titulo, setTitulo] = useState(inicial.titulo ?? "");
  const [valor, setValor] = useState(inicial.valor ?? (preelegido?.valor != null ? String(preelegido.valor) : ""));
  const [fuente, setFuente] = useState(inicial.fuente ?? preelegido?.fuente ?? "");

  const resultados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const lista = candidatos ?? [];
    if (!q) return lista.slice(0, 8);
    return lista.filter((c) => [c.nombre, c.empresa, c.email].some((v) => v?.toLowerCase().includes(q))).slice(0, 8);
  }, [busca, candidatos]);

  function elegir(c: Candidato) {
    setElegido(c);
    setBusca("");
    setAbierto(false);
    if (!fuente && c.fuente) setFuente(c.fuente);
    if (!valor && c.valor != null) setValor(String(c.valor));
    if (!titulo && c.empresa) setTitulo(`Proyecto para ${c.empresa}`);
  }

  function cambiarEtapa(id: string) {
    setEtapaId(id);
    if (!probTocada) {
      const e = etapas.find((x) => x.id === id);
      if (e) setProb(String(e.probabilidad));
    }
  }

  return (
    <form action={enviar} className="space-y-6">
      {inicial.id && <input type="hidden" name="id" value={inicial.id} />}

      {candidatos && (
        <fieldset className="space-y-2">
          <legend className={etiqueta}>Para quién</legend>
          {elegido ? (
            <div className="flex flex-col gap-3 rounded-lg border border-brand/30 bg-brand/5 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-fg [overflow-wrap:anywhere]">{elegido.nombre}{elegido.empresa ? ` · ${elegido.empresa}` : ""}</p>
                <p className="text-xs text-fg-dim">{elegido.tipo === "lead" ? "Lead" : "Cliente"}{elegido.email ? ` · ${elegido.email}` : ""}</p>
              </div>
              <button type="button" className={btn.secondary} onClick={() => { setElegido(null); setAbierto(true); }}>Cambiar</button>
              <input type="hidden" name="para" value={elegido.tipo} />
              <input type="hidden" name={elegido.tipo === "lead" ? "leadId" : "clientId"} value={elegido.id} />
            </div>
          ) : (
            <div className="relative">
              <input
                type="search"
                value={busca}
                onChange={(e) => { setBusca(e.target.value); setAbierto(true); }}
                onFocus={() => setAbierto(true)}
                placeholder="Busca un lead o cliente por nombre, empresa o correo"
                aria-label="Buscar lead o cliente"
                aria-expanded={abierto}
                aria-controls="candidatos"
                role="combobox"
                className={campo}
                autoComplete="off"
              />
              {abierto && (
                <ul id="candidatos" role="listbox" className="mt-2 max-h-80 overflow-y-auto rounded-lg border border-line bg-panel p-1">
                  {!busca && resultados.length > 0 && <li className="px-3 py-2 text-xs text-fg-faint">Los más recientes</li>}
                  {resultados.length === 0 ? (
                    <li className="px-3 py-3 text-sm text-fg-dim">
                      {candidatos.length === 0 ? "Todavía no tienes leads ni clientes. " : "Nadie coincide con esa búsqueda. "}
                      <Link href="/empresa/leads/nuevo" className="font-semibold text-brand-fg underline">Crear un lead</Link>
                    </li>
                  ) : (
                    resultados.map((c) => (
                      <li key={`${c.tipo}-${c.id}`} role="option" aria-selected={false}>
                        <button type="button" onClick={() => elegir(c)} className="flex min-h-11 w-full flex-col items-start rounded-md px-3 py-2 text-left hover:bg-fill focus:bg-fill focus:outline-none">
                          <span className="text-sm font-medium text-fg [overflow-wrap:anywhere]">{c.nombre}{c.empresa ? ` · ${c.empresa}` : ""}</span>
                          <span className="text-xs text-fg-dim">{c.tipo === "lead" ? "Lead" : "Cliente"}{c.email ? ` · ${c.email}` : ""}</span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          )}
        </fieldset>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="titulo" className={etiqueta}>Título</label>
          <input id="titulo" name="titulo" required maxLength={140} value={titulo} onChange={(e) => setTitulo(e.target.value)} className={campo} placeholder="Por ejemplo, Tienda en línea" autoComplete="off" />
        </div>
        <div>
          <label htmlFor="valor" className={etiqueta}>Valor estimado (USD)</label>
          <input id="valor" name="valor" required inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} className={campo} placeholder="0.00" autoComplete="off" />
        </div>
        {!cerrada && (
          <div>
            <label htmlFor="cierre" className={etiqueta}>Cierre esperado</label>
            <input id="cierre" name="cierreEsperado" type="date" defaultValue={inicial.cierreEsperado ?? ""} className={campo} />
          </div>
        )}
        {!cerrada && (
          <div>
            <label htmlFor="etapa" className={etiqueta}>Etapa</label>
            <select id="etapa" name="etapaId" value={etapaId} onChange={(e) => cambiarEtapa(e.target.value)} className={selectCls}>
              {etapas.map((e) => <option key={e.id} value={e.id}>{e.nombre} · {e.probabilidad} %</option>)}
            </select>
          </div>
        )}
        {!cerrada && (
          <div>
            <label htmlFor="prob" className={etiqueta}>Probabilidad (%)</label>
            <input id="prob" name="probabilidad" inputMode="numeric" value={prob} onChange={(e) => { setProb(e.target.value); setProbTocada(true); }} className={campo} />
            <p className="mt-1 text-xs text-fg-faint">Viene de la etapa; cámbiala si este negocio va mejor o peor.</p>
          </div>
        )}
        <div>
          <label htmlFor="resp" className={etiqueta}>Responsable</label>
          <select id="resp" name="responsableId" defaultValue={inicial.responsableId ?? yo} className={selectCls}>
            {equipo.map((p) => <option key={p.id} value={p.id}>{p.id === yo ? `${p.nombre} (tú)` : p.nombre}</option>)}
            <option value="">Sin responsable</option>
          </select>
        </div>
        <div>
          <label htmlFor="fuente" className={etiqueta}>Fuente</label>
          <select id="fuente" name="fuente" value={fuente} onChange={(e) => setFuente(e.target.value)} className={selectCls}>
            <option value="">Sin fuente</option>
            {FUENTES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="notas" className={etiqueta}>Notas</label>
          <textarea id="notas" name="notas" rows={4} defaultValue={inicial.notas ?? ""} className={`${campo} py-2`} placeholder="Qué necesita, quién decide, próximos pasos" />
        </div>
      </div>

      <MensajeEstado estado={estado} />
      <div className="flex justify-end">
        <button type="submit" className={`${editando ? btn.secondary : btn.primary} w-full sm:w-auto`} disabled={enviando || (!!candidatos && !elegido)}>
          {enviando ? "Guardando…" : editando ? "Guardar cambios" : "Crear oportunidad"}
        </button>
      </div>
    </form>
  );
}
