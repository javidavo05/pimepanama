"use client";

/**
 * Archivos compartidos con un cliente, para la ficha del cliente o de un proyecto. Lista, subir (hasta 20 MB),
 * mostrar u ocultar en la cuenta del cliente y borrar. Uso: <ArchivosCliente clientId={c.id} projectId={p?.id} />.
 */
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  borrarArchivoClienteAction, cambiarVisibilidadArchivoAction, enlaceArchivoClienteAction, listarArchivosClienteAction,
  prepararSubidaArchivoAction, registrarArchivoPimeAction, type ArchivoPanel,
} from "@/app/(empresa)/empresa/(protected)/acciones-archivos-cliente";
import { btn } from "@/components/empresa/page-header";
import { tamanoLegible } from "@/lib/portal/documentos";

const MAX = 20 * 1024 * 1024;
const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-PA", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Panama" });

function subir(url: string, file: File, tipo: string, avance: (n: number) => void) {
  return new Promise<void>((ok, mal) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", tipo);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) avance(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? ok() : mal(new Error("La subida no se completó.")));
    xhr.onerror = () => mal(new Error("Se cortó la conexión mientras subía."));
    xhr.send(file);
  });
}

export function ArchivosCliente({ clientId, projectId }: { clientId: string; projectId?: string | null }) {
  const [archivos, setArchivos] = useState<ArchivoPanel[] | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tono: "ok" | "error"; texto: string } | null>(null);
  const [subiendo, setSubiendo] = useState<{ nombre: string; avance: number } | null>(null);
  const [visibleNuevo, setVisibleNuevo] = useState(true);
  const [borrando, setBorrando] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const idInput = `archivos-${clientId}-${projectId ?? "todo"}`;

  const cargar = useCallback(async () => {
    setErrorCarga(null);
    try {
      const r = await listarArchivosClienteAction(clientId, projectId ?? null);
      if (r.ok) setArchivos(r.archivos); else setErrorCarga(r.error);
    } catch {
      setErrorCarga("No pude cargar los archivos. Revisa la conexión.");
    }
  }, [clientId, projectId]);
  useEffect(() => { void cargar(); }, [cargar]);

  async function elegir(files: FileList | null) {
    const file = files?.[0];
    if (input.current) input.current.value = "";
    if (!file) return;
    setAviso(null);
    if (file.size > MAX) { setAviso({ tono: "error", texto: "El archivo pasa de 20 MB." }); return; }
    setSubiendo({ nombre: file.name, avance: 0 });
    try {
      const tipo = file.type || "application/octet-stream";
      const p = await prepararSubidaArchivoAction(clientId, { nombre: file.name, tipo, tamano: file.size });
      if (!p.ok) throw new Error(p.error);
      await subir(p.url, file, p.tipo, (n) => setSubiendo({ nombre: file.name, avance: n }));
      const r = await registrarArchivoPimeAction(clientId, { key: p.key, nombre: file.name, tipo, projectId: projectId ?? null, visibleCliente: visibleNuevo });
      if (!r.ok) throw new Error(r.error);
      setAviso({ tono: "ok", texto: r.mensaje });
      await cargar();
    } catch (e) {
      setAviso({ tono: "error", texto: e instanceof Error ? e.message : "No se pudo subir el archivo." });
    } finally {
      setSubiendo(null);
    }
  }

  const accion = (fn: () => Promise<{ ok: true; mensaje: string } | { ok: false; error: string }>) => startTransition(async () => {
    const r = await fn();
    setAviso(r.ok ? { tono: "ok", texto: r.mensaje } : { tono: "error", texto: r.error });
    setBorrando(null);
    await cargar();
  });
  const descargar = (id: string) => startTransition(async () => {
    const r = await enlaceArchivoClienteAction(id);
    if (r.ok) window.location.href = r.url; else setAviso({ tono: "error", texto: r.error });
  });

  return (
    <section className="bg-panel border border-line rounded-2xl p-4 sm:p-6 min-w-0 space-y-4">
      <div className="space-y-1">
        <h2 className="text-fg text-base font-semibold tracking-tight">Archivos compartidos</h2>
        <p className="text-fg-dim text-xs leading-relaxed">Lo que el cliente ve en su cuenta (Documentos → Archivos) y lo que nos manda. Ocultar deja el archivo solo para el equipo.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input ref={input} id={idInput} type="file" className="sr-only" onChange={(e) => void elegir(e.target.files)} disabled={!!subiendo} />
        <label htmlFor={idInput} className={`${btn.primary} cursor-pointer ${subiendo ? "pointer-events-none opacity-60" : ""}`}>Subir archivo para el cliente</label>
        <label className="inline-flex items-center gap-2 min-h-11 text-sm text-fg-mute cursor-pointer">
          <input type="checkbox" checked={visibleNuevo} onChange={(e) => setVisibleNuevo(e.target.checked)} className="h-5 w-5" />
          Que el cliente lo vea
        </label>
      </div>
      <p className="text-fg-faint text-xs">Hasta 20 MB. Documentos, hojas, imágenes o ZIP; nada ejecutable.</p>

      {subiendo && (
        <div className="space-y-2" role="status" aria-live="polite">
          <p className="text-fg text-sm [overflow-wrap:anywhere]">Subiendo {subiendo.nombre}… {subiendo.avance} %</p>
          <div className="h-2 rounded-full bg-fill-2 overflow-hidden"><div className="h-full bg-brand transition-[width]" style={{ width: `${subiendo.avance}%` }} /></div>
        </div>
      )}
      {aviso && <p className={`rounded-lg px-4 py-3 text-sm ${aviso.tono === "ok" ? "bg-ok/10 text-ok" : "bg-danger/10 text-danger"}`} role={aviso.tono === "ok" ? "status" : "alert"}>{aviso.texto}</p>}

      {errorCarga ? (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <span>{errorCarga}</span>
          <button type="button" onClick={() => void cargar()} className={btn.secondary}>Intentar de nuevo</button>
        </div>
      ) : archivos === null ? (
        <div className="space-y-2" aria-busy="true"><span className="sr-only">Cargando archivos…</span>{[0, 1].map((i) => <div key={i} className="h-12 rounded-lg bg-fill animate-pulse" />)}</div>
      ) : archivos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-mid px-4 py-8 text-center space-y-1">
          <p className="text-fg text-sm font-semibold">Todavía no hay archivos</p>
          <p className="text-fg-dim text-xs leading-relaxed max-w-sm mx-auto">Sube una propuesta, un manual o los accesos en PDF para que el cliente los tenga en su cuenta. Lo que el cliente suba también aparece aquí.</p>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {archivos.map((a) => (
            <li key={a.id} className="py-3 flex flex-col gap-3 sm:flex-row sm:items-center min-w-0">
              <div className="min-w-0 flex-1">
                <p className="text-fg text-sm font-semibold [overflow-wrap:anywhere]">{a.nombre}</p>
                <p className="text-fg-dim text-xs">
                  {[tamanoLegible(a.tamano), fecha(a.createdAt), a.subidoPor === "cliente" ? "lo subió el cliente" : "lo subió Pime", a.proyecto].filter(Boolean).join(" · ")}
                  {" · "}<span className={a.visibleCliente ? "text-ok" : "text-fg-faint"}>{a.visibleCliente ? "visible para el cliente" : "oculto para el cliente"}</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => descargar(a.id)} disabled={pendiente} className={btn.secondary}>Descargar</button>
                <button type="button" onClick={() => accion(() => cambiarVisibilidadArchivoAction(a.id, !a.visibleCliente))} disabled={pendiente} className={btn.secondary}>{a.visibleCliente ? "Ocultar al cliente" : "Mostrar al cliente"}</button>
                {borrando === a.id ? (
                  <>
                    <button type="button" onClick={() => accion(() => borrarArchivoClienteAction(a.id))} disabled={pendiente} className={`${btn.secondary} text-danger border-danger/40`}>Sí, borrar</button>
                    <button type="button" onClick={() => setBorrando(null)} disabled={pendiente} className={btn.secondary}>No</button>
                  </>
                ) : (
                  <button type="button" onClick={() => setBorrando(a.id)} disabled={pendiente} className={btn.secondary} aria-label={`Borrar ${a.nombre}`}>Borrar</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
