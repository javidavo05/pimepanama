"use client";

/**
 * Asistente «Cobrar»: la única forma de empezar una factura. Tres pasos:
 *   1. ¿A quién? (ya elegido si se abre desde un cliente o un proyecto)
 *   2. ¿Qué cobras? Fases sin factura, el proyecto con su plan de cuotas, horas sin facturar u otro monto.
 *   3. Revisar y crear: la factura queda en borrador, ligada a su cliente y su proyecto.
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Asistente, btnAsistente } from "@/components/empresa/asistente/asistente";
import { crearCobroAction, opcionesCobroAction, type OpcionesCobro } from "@/app/(empresa)/empresa/(protected)/acciones-cobro";
import type { Cobro } from "@/lib/motor/cobros";

type Cliente = { id: string; nombre: string };
type Eleccion = { clave: string; titulo: string; detalle: string; monto: number; proyecto: string | null; cobro: Cobro | null };

const usd = (n: number) => `USD ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const PASOS = ["Cliente", "Qué cobras", "Revisar"];
const FRECUENCIA: Record<string, string> = { MONTHLY: "mensuales", BIWEEKLY: "quincenales", WEEKLY: "semanales" };

export function AsistenteCobrar({ abierto, onCerrar, clientes, clienteInicial, proyectoInicial }: {
  abierto: boolean;
  onCerrar: () => void;
  clientes: Cliente[];
  clienteInicial?: string | null;
  proyectoInicial?: string | null;
}) {
  const router = useRouter();
  const [paso, setPaso] = useState(clienteInicial ? 2 : 1);
  const [clientId, setClientId] = useState(clienteInicial ?? "");
  const [busca, setBusca] = useState("");
  const [opciones, setOpciones] = useState<OpcionesCobro | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clave, setClave] = useState<string>("");
  const [libre, setLibre] = useState({ concepto: "", monto: "", proyecto: proyectoInicial ?? "" });
  const [creando, setCreando] = useState(false);

  // Al abrir con un cliente ya elegido, se cargan sus cobros.
  useEffect(() => {
    if (!abierto || !clientId) return;
    let vivo = true;
    setCargando(true); setError(null); setOpciones(null);
    opcionesCobroAction(clientId).then((r) => {
      if (!vivo) return;
      if ("error" in r) setError(r.error); else setOpciones(r);
      setCargando(false);
    });
    return () => { vivo = false; };
  }, [abierto, clientId]);

  const elecciones = useMemo<Eleccion[]>(() => {
    if (!opciones) return [];
    const xs: Eleccion[] = [];
    const orden = [...opciones.proyectos].sort((a, b) => Number(b.id === proyectoInicial) - Number(a.id === proyectoInicial));
    for (const p of orden) {
      for (const f of p.fases) xs.push({ clave: `fase:${f.id}`, titulo: `Fase ${f.name}`, detalle: p.name, monto: f.price, proyecto: p.id, cobro: { tipo: "fase", faseId: f.id } });
      if (p.plan) xs.push({ clave: `plan:${p.id}`, titulo: "Proyecto completo con su plan de pagos", detalle: `${p.name} · ${p.plan.abono ? `abono de ${usd(p.plan.abono)} y ` : ""}${p.plan.cuotas} cuotas ${FRECUENCIA[p.plan.frecuencia] ?? ""}`, monto: p.plan.total, proyecto: p.id, cobro: { tipo: "plan", projectId: p.id } });
    }
    if (opciones.horas.monto > 0) {
      const h = Math.floor(opciones.horas.minutos / 60), m = opciones.horas.minutos % 60;
      xs.push({ clave: "horas", titulo: "Horas de soporte sin facturar", detalle: `${h ? `${h} h ` : ""}${m ? `${m} min` : ""}`.trim(), monto: opciones.horas.monto, proyecto: null, cobro: { tipo: "horas", clientId } });
    }
    xs.push({ clave: "libre", titulo: "Otro monto", detalle: "Escribes el concepto y el monto", monto: 0, proyecto: null, cobro: null });
    return xs;
  }, [opciones, clientId, proyectoInicial]);

  // Lo más probable ya elegido: lo primero de la lista (la fase del proyecto desde donde se abrió).
  useEffect(() => { if (elecciones.length && !elecciones.some((e) => e.clave === clave)) setClave(elecciones[0].clave); }, [elecciones, clave]);

  const elegida = elecciones.find((e) => e.clave === clave) ?? null;
  const montoLibre = Number(libre.monto.replace(/[^\d.]/g, ""));
  const final: Eleccion | null = elegida?.clave === "libre"
    ? { ...elegida, titulo: libre.concepto.trim() || "Otro monto", detalle: opciones?.proyectos.find((p) => p.id === libre.proyecto)?.name ?? "Sin proyecto", monto: montoLibre, proyecto: libre.proyecto || null, cobro: { tipo: "monto", clientId, projectId: libre.proyecto || null, concepto: libre.concepto, monto: montoLibre } }
    : elegida;
  const libreValido = elegida?.clave !== "libre" || (libre.concepto.trim().length > 1 && montoLibre > 0);
  const cliente = clientes.find((c) => c.id === clientId);
  const filtrados = clientes.filter((c) => c.nombre.toLowerCase().includes(busca.trim().toLowerCase()));

  function cerrar() {
    setPaso(clienteInicial ? 2 : 1); setError(null); setClave(""); setLibre({ concepto: "", monto: "", proyecto: proyectoInicial ?? "" });
    onCerrar();
  }

  async function crear() {
    if (!final?.cobro) return;
    setCreando(true); setError(null);
    const r = await crearCobroAction(final.cobro);
    setCreando(false);
    if ("error" in r) { setError(r.error); return; }
    cerrar();
    router.push(`/empresa/facturas/${r.id}`);
  }

  const pie =
    paso === 1 ? (
      <button type="button" className={btnAsistente.principal} disabled={!clientId} onClick={() => setPaso(2)}>Continuar</button>
    ) : paso === 2 ? (
      <>
        <button type="button" className={btnAsistente.secundario} onClick={() => setPaso(1)}>Cambiar cliente</button>
        <button type="button" className={btnAsistente.principal} disabled={!final || !libreValido || cargando} onClick={() => setPaso(3)}>Revisar</button>
      </>
    ) : (
      <>
        <button type="button" className={btnAsistente.secundario} onClick={() => setPaso(2)}>Atrás</button>
        <button type="button" className={btnAsistente.principal} disabled={creando} onClick={() => void crear()}>{creando ? "Creando…" : `Crear factura de ${usd(final?.monto ?? 0)}`}</button>
      </>
    );

  return (
    <Asistente abierto={abierto} onCerrar={cerrar} titulo={paso === 1 ? "¿A quién le cobras?" : paso === 2 ? `¿Qué le cobras a ${cliente?.nombre ?? "este cliente"}?` : "Revisa y crea la factura"} paso={paso} pasos={PASOS} pie={pie}>
      {paso === 1 && (
        <div className="space-y-4">
          <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cliente" aria-label="Buscar cliente" className="w-full min-h-12 rounded-xl border border-line-mid bg-fill px-4 text-base sm:text-sm text-fg placeholder:text-fg-trace focus:border-brand focus:outline-none" />
          {filtrados.length === 0 ? (
            <p className="text-fg-dim text-sm">No hay clientes con ese nombre. Créalo primero en Clientes.</p>
          ) : (
            <ul className="space-y-2" role="radiogroup" aria-label="Cliente">
              {filtrados.slice(0, 50).map((c) => (
                <li key={c.id}>
                  <button type="button" role="radio" aria-checked={clientId === c.id} onClick={() => setClientId(c.id)} onDoubleClick={() => { setClientId(c.id); setPaso(2); }}
                    className={`w-full min-h-12 rounded-xl border px-4 text-left text-sm font-semibold transition-colors ${clientId === c.id ? "border-brand bg-brand/5 text-fg" : "border-line-mid text-fg-mute hover:border-line-loud"}`}>
                    <span className="block truncate">{c.nombre}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {paso === 2 && (
        cargando ? (
          <p className="text-fg-dim text-sm" aria-busy>Buscando lo que se le puede cobrar…</p>
        ) : error ? (
          <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{error}</p>
        ) : (
          <div className="space-y-4">
            <ul className="space-y-2" role="radiogroup" aria-label="Qué cobras">
              {elecciones.map((e) => (
                <li key={e.clave}>
                  <button type="button" role="radio" aria-checked={clave === e.clave} onClick={() => setClave(e.clave)}
                    className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-xl border px-4 py-3 text-left transition-colors ${clave === e.clave ? "border-brand bg-brand/5" : "border-line-mid hover:border-line-loud"}`}>
                    <span className="min-w-0">
                      <span className="block text-fg text-sm font-semibold [overflow-wrap:anywhere]">{e.titulo}</span>
                      <span className="block text-fg-dim text-xs [overflow-wrap:anywhere]">{e.detalle}</span>
                    </span>
                    {e.monto > 0 && <span className="text-fg text-sm font-semibold tabular-nums whitespace-nowrap">{usd(e.monto)}</span>}
                  </button>
                </li>
              ))}
            </ul>
            {opciones && elecciones.length === 1 && <p className="text-fg-dim text-sm">Este cliente no tiene fases, planes ni horas pendientes de facturar.</p>}
            {clave === "libre" && (
              <div className="space-y-3 rounded-xl bg-fill p-4">
                <label className="block"><span className="block text-fg-dim text-xs font-semibold uppercase tracking-widest mb-1.5">Concepto</span>
                  <input value={libre.concepto} onChange={(e) => setLibre({ ...libre, concepto: e.target.value })} placeholder="Ej.: Mantenimiento de octubre" className="w-full min-h-11 rounded-lg border border-line-mid bg-panel px-3 text-base sm:text-sm text-fg focus:border-brand focus:outline-none" /></label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block"><span className="block text-fg-dim text-xs font-semibold uppercase tracking-widest mb-1.5">Monto (USD)</span>
                    <input inputMode="decimal" value={libre.monto} onChange={(e) => setLibre({ ...libre, monto: e.target.value })} placeholder="0.00" className="w-full min-h-11 rounded-lg border border-line-mid bg-panel px-3 text-base sm:text-sm text-fg tabular-nums focus:border-brand focus:outline-none" /></label>
                  <label className="block"><span className="block text-fg-dim text-xs font-semibold uppercase tracking-widest mb-1.5">Proyecto</span>
                    <select value={libre.proyecto} onChange={(e) => setLibre({ ...libre, proyecto: e.target.value })} className="w-full min-h-11 rounded-lg border border-line-mid bg-panel px-3 text-base sm:text-sm text-fg focus:border-brand focus:outline-none">
                      <option value="">Sin proyecto</option>
                      {opciones?.proyectos.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select></label>
                </div>
              </div>
            )}
          </div>
        )
      )}

      {paso === 3 && final && (
        <div className="space-y-6">
          <dl className="divide-y divide-line rounded-xl border border-line">
            {[["Cliente", cliente?.nombre ?? ""], ["Concepto", final.titulo], ["Proyecto", final.proyecto ? opciones?.proyectos.find((p) => p.id === final.proyecto)?.name ?? final.detalle : "Sin proyecto"], ["Monto", usd(final.monto)]].map(([k, v]) => (
              <div key={k} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 px-4 py-3 text-sm">
                <dt className="text-fg-dim">{k}</dt><dd className="text-fg font-semibold [overflow-wrap:anywhere] tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="text-fg-dim text-sm">La factura queda en borrador. La revisas y decides cuándo enviarla.</p>
          {error && <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{error}</p>}
        </div>
      )}
    </Asistente>
  );
}

/** Botón que abre el asistente. */
export function BotonCobrar({ clientes, clienteInicial, proyectoInicial, etiqueta = "Cobrar", className }: { clientes: Cliente[]; clienteInicial?: string | null; proyectoInicial?: string | null; etiqueta?: string; className?: string }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setAbierto(true)} className={className}>{etiqueta}</button>
      <AsistenteCobrar abierto={abierto} onCerrar={() => setAbierto(false)} clientes={clientes} clienteInicial={clienteInicial} proyectoInicial={proyectoInicial} />
    </>
  );
}
