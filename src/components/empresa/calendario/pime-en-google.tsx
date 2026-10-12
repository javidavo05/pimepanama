"use client";

/**
 * Pime en tu Google Calendar, en 3 pasos (migración 0046):
 *   1. Pime crea tu enlace privado con citas, tareas, cobros y pagos.
 *   2. Google lo agrega con un toque (o pegándolo en «Desde URL»).
 *   3. Listo: Google lo vuelve a leer solo, cada pocas horas.
 */
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Asistente, btnAsistente } from "@/components/empresa/asistente/asistente";

const PASOS = ["Tu enlace", "Agregarlo a Google", "Listo"];

type Feed = { activo: false } | { activo: true; https: string; webcal: string; google: string; proximos: number };

async function pedir(method: "GET" | "POST" | "DELETE", body?: unknown): Promise<Feed> {
  const r = await fetch("/api/empresa/calendario/google", {
    method,
    cache: "no-store",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? "No se pudo preparar el calendario.");
  return j as Feed;
}

function CopiarEnlace({ url }: { url: string }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso de portapapeles: el enlace queda a la vista para copiarlo a mano.
    }
  }
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label="Enlace privado del calendario"
          className="min-w-0 flex-1 min-h-11 rounded-lg border border-line-mid bg-fill px-3 text-base sm:text-sm text-fg-mute" />
        <button type="button" onClick={() => void copiar()} className="shrink-0 inline-flex items-center min-h-11 px-4 rounded-lg border border-line-mid text-sm font-semibold text-fg-mute hover:text-fg">
          {copiado ? "Copiado" : "Copiar"}
        </button>
      </div>
    </div>
  );
}

export function AsistenteGoogle({ abierto, onCerrar, onListo }: { abierto: boolean; onCerrar: () => void; onListo?: () => void }) {
  const router = useRouter();
  const [paso, setPaso] = useState(1);
  const [feed, setFeed] = useState<Feed | null>(null);
  const [estado, setEstado] = useState<{ cargando?: boolean; error?: string }>({});

  function cerrar() { setPaso(1); setEstado({}); onCerrar(); }

  async function crear() {
    setEstado({ cargando: true });
    try {
      setFeed(await pedir("POST"));
      setEstado({});
      setPaso(2);
      onListo?.();
      router.refresh();
    } catch (e) {
      setEstado({ error: e instanceof Error ? e.message : "No se pudo crear el enlace." });
    }
  }

  const activo = feed?.activo ? feed : null;

  const pie = paso === 1 ? (
    <button type="button" className={btnAsistente.principal} disabled={estado.cargando} onClick={() => void crear()}>
      {estado.cargando ? "Creando tu enlace…" : "Crear mi enlace"}
    </button>
  ) : paso === 2 && activo ? (
    <>
      <button type="button" className={btnAsistente.secundario} onClick={() => setPaso(3)}>Ya lo agregué</button>
      <a href={activo.google} target="_blank" rel="noreferrer" onClick={() => setPaso(3)} className={btnAsistente.principal}>Agregar a Google Calendar</a>
    </>
  ) : (
    <button type="button" className={btnAsistente.principal} onClick={cerrar}>Terminar</button>
  );

  return (
    <Asistente abierto={abierto} onCerrar={cerrar} titulo={paso === 3 ? "Pime ya está en tu Google Calendar" : "Ver Pime en tu Google Calendar"} paso={paso} pasos={PASOS} pie={pie}>
      {paso === 1 && (
        <div className="space-y-6">
          <p className="text-fg-mute text-sm leading-relaxed">Pime crea un calendario privado que Google lee solo. No tienes que pasar nada a mano.</p>
          <ul className="space-y-3 text-sm">
            {[
              ["Citas", "Las que agendan contigo, con el contacto y el enlace de la llamada."],
              ["Tareas", "Las pendientes con fecha, a su hora o en el día."],
              ["Cobros", "El día que vence cada factura o cuota, con lo que falta."],
              ["Pagos", "Los gastos por pagar, el día que vencen."],
            ].map(([t, d]) => (
              <li key={t} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
                <span className="mt-2 h-2 w-2 rounded-full bg-brand" aria-hidden />
                <span><span className="block text-fg font-semibold">{t}</span><span className="block text-fg-dim">{d}</span></span>
              </li>
            ))}
          </ul>
          <p className="text-fg-dim text-xs">Es solo para ver: lo que cambies en Google no cambia Pime.</p>
          {estado.error && <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{estado.error}</p>}
        </div>
      )}
      {paso === 2 && activo && (
        <div className="space-y-6">
          <p className="text-fg-mute text-sm leading-relaxed">
            Toca «Agregar a Google Calendar» y confirma en Google. {activo.proximos > 0 ? `Van ${activo.proximos} ${activo.proximos === 1 ? "evento" : "eventos"} desde hoy.` : "Por ahora no hay nada agendado; lo nuevo aparece solo."}
          </p>
          <div className="space-y-3">
            <p className="text-fg text-sm font-semibold">Si Google no lo abre</p>
            <ol className="space-y-2 text-sm text-fg-dim list-decimal pl-4">
              <li>Copia tu enlace.</li>
              <li>En Google Calendar, junto a «Otros calendarios», toca «+» y luego «Desde URL».</li>
              <li>Pégalo y toca «Agregar calendario».</li>
            </ol>
            <CopiarEnlace url={activo.https} />
            <p className="text-fg-dim text-xs">En el teléfono, hazlo desde el navegador: la app de Google Calendar no deja agregar calendarios. En iPhone también puedes <a href={activo.webcal} className="underline font-semibold">agregarlo al Calendario del iPhone</a>.</p>
          </div>
          <p className="text-fg-dim text-xs">El enlace es privado: quien lo tenga ve tu agenda de Pime. Si se filtra, cámbialo en Configuración.</p>
        </div>
      )}
      {paso === 3 && (
        <div className="space-y-4 text-center py-4">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-ok/10 text-ok" aria-hidden>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
          </span>
          <p className="text-fg text-base font-semibold">Aparece como «Pime Suite» en tus calendarios</p>
          <p className="text-fg-dim text-sm">Google lo vuelve a leer solo, cada pocas horas. Lo que agregues en Pime llega a Google con ese retraso.</p>
        </div>
      )}
    </Asistente>
  );
}

export function BotonGoogle({ etiqueta = "Agregar a Google", className }: { etiqueta?: string; className?: string }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setAbierto(true)} className={className}>{etiqueta}</button>
      <AsistenteGoogle abierto={abierto} onCerrar={() => setAbierto(false)} />
    </>
  );
}

/** Tarjeta de Configuración: Pime en Google Calendar (enlace, cambiarlo o quitarlo). */
export function PimeEnGoogleConfig() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [error, setError] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    try { setFeed(await pedir("GET")); setError(false); } catch { setError(true); }
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);

  async function accion(method: "POST" | "DELETE") {
    setOcupado(true);
    try { setFeed(await pedir(method, method === "POST" ? { cambiar: true } : undefined)); } catch { setError(true); } finally { setOcupado(false); }
  }

  return (
    <section className="bg-panel border border-line rounded-2xl p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-fg text-sm font-semibold">Pime en Google Calendar</h2>
          <p className="text-fg-dim text-xs mt-1">Tus citas, tareas, cobros y pagos en tu Google Calendar.</p>
        </div>
        {feed && !feed.activo && (
          <button type="button" onClick={() => setAbierto(true)} className="inline-flex items-center min-h-11 px-4 rounded-lg bg-brand text-on-brand text-sm font-semibold">Agregar a Google</button>
        )}
      </div>
      {error ? <p className="text-sm text-danger">No se pudo leer el estado. <button type="button" className="underline font-semibold min-h-11" onClick={() => void cargar()}>Reintentar</button></p>
        : feed === null ? <p className="text-sm text-fg-dim" aria-busy>Cargando…</p>
        : !feed.activo ? <p className="text-sm text-fg-dim">Sin agregar. Pime crea un enlace privado y Google lo lee solo.</p>
        : (
          <div className="space-y-3">
            <p className="text-sm text-ok">Activo · {feed.proximos} {feed.proximos === 1 ? "evento" : "eventos"} desde hoy.</p>
            <CopiarEnlace url={feed.https} />
            <div className="flex flex-wrap gap-2">
              <a href={feed.google} target="_blank" rel="noreferrer" className="inline-flex items-center min-h-11 px-4 rounded-lg border border-line-mid text-sm font-semibold text-fg-mute hover:text-fg">Abrir en Google</a>
              <button type="button" disabled={ocupado} onClick={() => void accion("POST")} className="inline-flex items-center min-h-11 px-4 rounded-lg text-sm font-semibold text-fg-dim hover:text-fg disabled:opacity-40">Cambiar enlace</button>
              <button type="button" disabled={ocupado} onClick={() => void accion("DELETE")} className="inline-flex items-center min-h-11 px-4 rounded-lg text-sm font-semibold text-fg-dim hover:text-danger disabled:opacity-40">Quitar</button>
            </div>
            <p className="text-fg-dim text-xs">«Cambiar enlace» apaga el anterior: después tienes que agregar el nuevo en Google.</p>
          </div>
        )}
      <AsistenteGoogle abierto={abierto} onCerrar={() => setAbierto(false)} onListo={() => void cargar()} />
    </section>
  );
}
