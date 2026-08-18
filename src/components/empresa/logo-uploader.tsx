"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { resolveCompanyLogoUrl } from "@/lib/company-logo";

interface LogoUploaderProps {
  value: string;
  onChange: (url: string) => void;
}

export function LogoUploader({ value, onChange }: LogoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Solo se permiten imágenes PNG, JPG o SVG.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const presignRes = await fetch("/api/empresa/r2/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          folder: "branding",
        }),
      });
      const data = await presignRes.json();
      if (!presignRes.ok) {
        throw new Error(data.error ?? "No se pudo preparar la subida");
      }

      const uploadRes = await fetch(data.url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!uploadRes.ok) {
        throw new Error("Error al subir el archivo a R2");
      }

      onChange(data.publicUrl as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir el logo");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="col-span-2">
      <label className="block text-white/50 text-xs uppercase tracking-widest font-medium mb-1.5">
        Logo de la empresa
      </label>
      <div className="flex items-start gap-4">
        <div className="w-28 h-16 rounded-lg bg-white/[0.03] border border-white/[0.07] flex items-center justify-center overflow-hidden shrink-0">
          {value ? (
            <Image
              src={resolveCompanyLogoUrl(value)}
              alt="Logo"
              width={112}
              height={64}
              className="object-contain w-full h-full p-1"
              unoptimized
            />
          ) : (
            <span className="text-white/50 text-[10px] text-center px-2">Sin logo</span>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="px-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white/60 text-sm hover:text-white/80 hover:border-white/20 disabled:opacity-40 transition-all"
          >
            {uploading ? "Subiendo..." : value ? "Cambiar logo" : "Subir logo"}
          </button>
          <p className="text-white/55 text-[10px] leading-relaxed">
            PNG, JPG o SVG. Se guarda en R2. Después de subir, pulsa{" "}
            <span className="text-white/55">Guardar configuración</span>.
          </p>
          {error && <p className="text-red-400/80 text-xs">{error}</p>}
        </div>
      </div>
    </div>
  );
}
