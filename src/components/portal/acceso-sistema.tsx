"use client";

/**
 * «Tu sistema»: el enlace al sistema en producción y los accesos (usuario y clave) que Pime le entregó al
 * cliente. La clave se pide al servidor solo cuando la persona toca «Ver» y se puede copiar de un toque.
 */
import { useState } from "react";
import { verClaveAction } from "@/app/(cliente)/cliente/(privado)/acciones";
import { IconCheck, IconFlecha } from "./iconos";
import { BloqueOscuro, Eyebrow, Swap } from "./ui";

type Acceso = { id: string; label: string; url: string | null; username: string | null; notes: string | null; conClave: boolean };

function Copiar({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  const [listo, setListo] = useState(false);
  return (
    <button type="button" className="inline-flex items-center gap-1 rounded-lg px-3 min-h-11 text-xs font-semibold p-ink-acc hover:bg-white/5 transition-colors" aria-label={`Copiar ${etiqueta}`}
      onClick={async () => { try { await navigator.clipboard.writeText(valor); setListo(true); setTimeout(() => setListo(false), 1600); } catch { /* sin permiso de portapapeles */ } }}>
      {listo ? <><IconCheck width={14} height={14} />Copiado</> : "Copiar"}
    </button>
  );
}

function Clave({ id }: { id: string }) {
  const [valor, setValor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  if (valor) return <span className="flex flex-wrap items-center gap-2"><code className="font-mono text-sm select-all break-all">{valor}</code><Copiar valor={valor} etiqueta="la clave" /><button type="button" className="text-xs font-semibold p-ink-3 min-h-11 px-2" onClick={() => setValor(null)}>Ocultar</button></span>;
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="font-mono tracking-[0.3em] p-ink-2" aria-hidden>••••••••</span>
      <button type="button" aria-busy={cargando} className="inline-flex items-center rounded-lg px-3 min-h-11 text-xs font-semibold p-ink-acc hover:bg-white/5 transition-colors" disabled={cargando}
        onClick={async () => { setCargando(true); setError(null); const fd = new FormData(); fd.append("acceso", id); const r = await verClaveAction(null, fd); setCargando(false); if (r?.valor) setValor(r.valor); else setError(r?.error ?? "No se pudo."); }}>
        {cargando ? "Abriendo…" : "Ver clave"}
      </button>
      {error && <span className="text-xs text-[#FF8A80]" role="alert">{error}</span>}
    </span>
  );
}

export function AccesoSistema({ liveUrl, accesos, i }: { liveUrl: string | null; accesos: Acceso[]; i?: number }) {
  if (!liveUrl && !accesos.length) return null;
  return (
    <BloqueOscuro i={i}>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-2">
          <Eyebrow>Tu sistema</Eyebrow>
          {liveUrl && <p className="text-2xl sm:text-3xl font-extrabold tracking-tight break-all">{liveUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}</p>}
        </div>
        {liveUrl && <a href={liveUrl} target="_blank" rel="noopener" className="p-btn p-btn-1 shrink-0"><Swap>Abrir mi sistema</Swap><IconFlecha width={18} height={18} /></a>}
      </div>
      {accesos.length > 0 && (
        <ul className="mt-6 grid gap-3 md:grid-cols-2">
          {accesos.map((a) => (
            <li key={a.id} className="p-ink-celda p-celda p-4 space-y-3 min-w-0" data-tono="marca">
              <div className="flex items-start justify-between gap-3">
                <p className="font-bold break-words">{a.label}</p>
                {a.url && <a href={a.url} target="_blank" rel="noopener" className="p-link shrink-0 -my-3">Abrir<IconFlecha width={14} height={14} /></a>}
              </div>
              <dl className="grid gap-2 text-sm">
                {a.username && <div className="flex flex-wrap items-center justify-between gap-2"><dt className="p-ink-3">Usuario</dt><dd className="flex items-center gap-1 min-w-0"><span className="font-semibold break-all">{a.username}</span><Copiar valor={a.username} etiqueta="el usuario" /></dd></div>}
                {a.conClave && <div className="flex flex-wrap items-center justify-between gap-2"><dt className="p-ink-3">Clave</dt><dd className="min-w-0"><Clave id={a.id} /></dd></div>}
              </dl>
              {a.notes && <p className="p-ink-3 text-xs leading-relaxed">{a.notes}</p>}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 p-ink-3 text-xs">Guárdalas en un lugar seguro. Si necesitas cambiar una clave o un acceso nuevo, pídelo en un ticket.</p>
    </BloqueOscuro>
  );
}
