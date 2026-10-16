"use client";

/**
 * Subir archivos de hasta 20 MB a la cuenta. El navegador pide un enlace firmado (/api/cliente/archivos), sube
 * directo a R2 mostrando el avance, y al final se registra con registrarArchivoAction, que comprueba el tamaño real.
 */
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { registrarArchivoAction } from "@/app/(cliente)/cliente/(privado)/acciones-documentos";
import { IconSubir } from "./iconos";
import { errorBox, okBox } from "@/components/auth/auth-shell";

const MAX = 20 * 1024 * 1024;
type Estado = { nombre: string; avance: number } | null;

function subirConAvance(url: string, file: File, tipo: string, alAvanzar: (n: number) => void): Promise<void> {
  return new Promise((ok, mal) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", tipo);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) alAvanzar(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? ok() : mal(new Error("La subida no se completó. Revisa tu conexión e inténtalo otra vez.")));
    xhr.onerror = () => mal(new Error("Se cortó la conexión mientras subía. Inténtalo otra vez."));
    xhr.send(file);
  });
}

export function SubirArchivo({ proyectos = [] }: { proyectos?: { id: string; name: string }[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [proyecto, setProyecto] = useState(proyectos.length === 1 ? proyectos[0].id : "");
  const [subiendo, setSubiendo] = useState<Estado>(null);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState<string | null>(null);

  async function elegir(files: FileList | null) {
    const file = files?.[0];
    if (input.current) input.current.value = "";
    if (!file) return;
    setError(null); setListo(null);
    if (file.size > MAX) { setError("El archivo pasa de 20 MB. Comprímelo o divídelo en partes."); return; }
    setSubiendo({ nombre: file.name, avance: 0 });
    try {
      const tipo = file.type || "application/octet-stream";
      const r = await fetch("/api/cliente/archivos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre: file.name, tipo, tamano: file.size }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "No pudimos preparar la subida.");
      await subirConAvance(j.url, file, j.tipo || tipo, (n) => setSubiendo({ nombre: file.name, avance: n }));
      const fd = new FormData();
      fd.set("key", j.key); fd.set("nombre", file.name); fd.set("tipo", tipo); fd.set("proyecto", proyecto);
      const res = await registrarArchivoAction(null, fd);
      if (res?.error) throw new Error(res.error);
      setListo(res?.mensaje ?? "Listo, el archivo quedó guardado.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir el archivo.");
    } finally {
      setSubiendo(null);
    }
  }

  return (
    <div className="space-y-4">
      {proyectos.length > 1 && (
        <label className="block space-y-2">
          <span className="block text-fg-dim text-xs font-semibold uppercase tracking-widest">Proyecto (opcional)</span>
          <select value={proyecto} onChange={(e) => setProyecto(e.target.value)} className="w-full min-h-12 rounded-xl border border-line bg-panel px-4 text-base text-fg">
            <option value="">General, sin proyecto</option>
            {proyectos.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
      )}
      <input ref={input} id="subir-archivo" type="file" className="sr-only" onChange={(e) => void elegir(e.target.files)} disabled={!!subiendo} />
      <label htmlFor="subir-archivo" aria-disabled={subiendo ? "true" : undefined}
        className={`flex flex-col items-center justify-center gap-2 min-h-24 px-4 py-6 rounded-xl border border-dashed border-line-loud text-center text-sm font-semibold text-fg-mute hover:text-fg hover:border-brand cursor-pointer ${subiendo ? "pointer-events-none opacity-60" : ""}`}>
        <IconSubir width={22} height={22} />
        Elegir un archivo para subir
        <span className="text-fg-faint text-xs font-normal">Documentos, hojas, imágenes o ZIP · hasta 20 MB</span>
      </label>
      {subiendo && (
        <div className="space-y-2" role="status" aria-live="polite">
          <p className="text-fg text-sm font-semibold [overflow-wrap:anywhere]">Subiendo {subiendo.nombre}… {subiendo.avance} %</p>
          <div className="p-barra" role="progressbar" aria-valuenow={subiendo.avance} aria-valuemin={0} aria-valuemax={100} aria-label="Avance de la subida" style={{ "--v": subiendo.avance / 100, "--i": 0 } as React.CSSProperties}><i /></div>
        </div>
      )}
      {error && <p className={errorBox} role="alert">{error}</p>}
      {listo && <p className={okBox} role="status">{listo}</p>}
    </div>
  );
}
