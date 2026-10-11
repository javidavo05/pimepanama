"use client";

/**
 * Adjuntar imágenes o PDF a un ticket o a un pago. Cada archivo se sube apenas se elige (así el envío
 * del formulario es instantáneo) y las fotos de más de 4 MB se achican en el navegador a 2000 px.
 * El valor que viaja con el formulario es un JSON con las llaves subidas, en un input oculto.
 */
import { useRef, useState } from "react";
import { IconClip } from "./iconos";

type Subido = { key: string; fileName: string; contentType: string; sizeBytes: number };
type Item = { id: string; nombre: string; estado: "subiendo" | "listo" | "error"; error?: string; subido?: Subido; vista?: string };

const MAX = 4 * 1024 * 1024;

async function achicar(file: File): Promise<File> {
  if (file.size <= MAX || !/^image\/(png|jpeg|webp)$/.test(file.type)) return file;
  const bmp = await createImageBitmap(file);
  const escala = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * escala); canvas.height = Math.round(bmp.height * escala);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.85));
  return blob ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
}

export function SubirArchivos({ nombre = "adjuntos", max = 6, etiqueta = "Adjuntar imágenes" , aceptar = "image/*,application/pdf" }: { nombre?: string; max?: number; etiqueta?: string; aceptar?: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const listos = items.filter((i) => i.estado === "listo" && i.subido).map((i) => i.subido!);
  const subiendo = items.some((i) => i.estado === "subiendo");

  async function elegir(files: FileList | null) {
    if (!files?.length) return;
    const nuevos = Array.from(files).slice(0, Math.max(0, max - items.length));
    for (const original of nuevos) {
      const id = crypto.randomUUID();
      const vista = original.type.startsWith("image/") ? URL.createObjectURL(original) : undefined;
      setItems((xs) => [...xs, { id, nombre: original.name, estado: "subiendo", vista }]);
      try {
        const f = await achicar(original);
        if (f.size > MAX) throw new Error("El archivo pasa de 4 MB.");
        const body = new FormData(); body.append("archivo", f);
        const r = await fetch("/api/cliente/adjuntos", { method: "POST", body });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "No se pudo subir.");
        setItems((xs) => xs.map((x) => (x.id === id ? { ...x, estado: "listo", subido: j } : x)));
      } catch (e) {
        setItems((xs) => xs.map((x) => (x.id === id ? { ...x, estado: "error", error: e instanceof Error ? e.message : "No se pudo subir." } : x)));
      }
    }
    if (input.current) input.current.value = "";
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={nombre} value={JSON.stringify(listos)} />
      <input type="hidden" name={`${nombre}-subiendo`} value={subiendo ? "1" : ""} />
      <input ref={input} type="file" accept={aceptar} multiple={max > 1} className="sr-only" id={`archivo-${nombre}`} onChange={(e) => void elegir(e.target.files)} />
      {items.length < max && (
        <label htmlFor={`archivo-${nombre}`} className="inline-flex items-center gap-2 min-h-12 px-4 rounded-xl border border-dashed border-line-loud text-sm font-semibold text-fg-mute hover:text-fg hover:border-brand cursor-pointer">
          <IconClip />{etiqueta}<span className="text-fg-faint font-normal">· hasta {max}</span>
        </label>
      )}
      {items.length > 0 && (
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map((i) => (
            <li key={i.id} className="relative rounded-xl border border-line bg-fill overflow-hidden min-w-0">
              {i.vista ? (
                // eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:)
                <img src={i.vista} alt="" className="h-24 w-full object-cover" />
              ) : (
                <div className="h-24 grid place-items-center text-fg-faint text-xs font-semibold">PDF</div>
              )}
              <div className="px-3 py-2 text-xs">
                <p className="truncate text-fg font-semibold">{i.nombre}</p>
                <p className={i.estado === "error" ? "text-danger" : "text-fg-faint"}>{i.estado === "subiendo" ? "Subiendo…" : i.estado === "listo" ? "Listo" : i.error}</p>
              </div>
              <button type="button" onClick={() => setItems((xs) => xs.filter((x) => x.id !== i.id))} className="absolute top-2 right-2 h-8 w-8 rounded-full bg-panel/90 text-fg text-sm font-bold shadow" aria-label={`Quitar ${i.nombre}`}>×</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
