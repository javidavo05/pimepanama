"use client";

import { useState, type InputHTMLAttributes } from "react";
import { REGLAS_CLAVE } from "@/lib/auth/reglas-clave";
import { campo, etiqueta } from "@/components/auth/auth-shell";

type CampoClaveProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { id: string };

/** Campo de contraseña con el ojo para ver u ocultar lo escrito. */
export function CampoClave({ className, ...props }: CampoClaveProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={visible ? "text" : "password"} className={`${className ?? campo} pr-12`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-pressed={visible}
        aria-controls={props.id}
        className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center rounded-r-lg text-fg-faint hover:text-fg focus:outline-none focus-visible:text-fg focus-visible:ring-2 focus-visible:ring-brand/30"
      >
        <svg aria-hidden viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {visible && <path d="M4 4l16 16" />}
        </svg>
      </button>
    </div>
  );
}

function Requisito({ cumple, texto }: { cumple: boolean; texto: string }) {
  return (
    <li className={`flex items-center gap-2 text-xs transition-colors ${cumple ? "text-ok" : "text-fg-faint"}`}>
      <span
        aria-hidden
        className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
          cumple ? "border-ok bg-ok text-on-brand" : "border-line-loud"
        }`}
      >
        {cumple && (
          <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 6.2 5 8.5l4.5-5" />
          </svg>
        )}
      </span>
      <span>
        {texto}
        <span className="sr-only">{cumple ? ": listo" : ": falta"}</span>
      </span>
    </li>
  );
}

/**
 * Contraseña nueva y su repetición, con los requisitos a la vista: cada uno se marca mientras se escribe y
 * «Las dos coinciden» aparece al empezar a repetirla. Los nombres de los campos son `clave` y `repetir`.
 */
export function ClaveNueva({ etiquetaClave = "Contraseña", etiquetaRepetir = "Repite la contraseña" }: { etiquetaClave?: string; etiquetaRepetir?: string }) {
  const [clave, setClave] = useState("");
  const [repetir, setRepetir] = useState("");
  return (
    <>
      <div>
        <label htmlFor="clave" className={etiqueta}>{etiquetaClave}</label>
        <CampoClave
          id="clave"
          name="clave"
          autoComplete="new-password"
          minLength={10}
          required
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          aria-describedby="clave-requisitos"
        />
        <ul id="clave-requisitos" className="mt-3 grid gap-2 sm:grid-cols-2" aria-live="polite">
          {REGLAS_CLAVE.map((r) => (
            <Requisito key={r.id} cumple={r.cumple(clave)} texto={r.texto} />
          ))}
        </ul>
      </div>
      <div>
        <label htmlFor="repetir" className={etiqueta}>{etiquetaRepetir}</label>
        <CampoClave
          id="repetir"
          name="repetir"
          autoComplete="new-password"
          minLength={10}
          required
          value={repetir}
          onChange={(e) => setRepetir(e.target.value)}
          aria-describedby="repetir-estado"
        />
        <ul id="repetir-estado" className="mt-3" aria-live="polite">
          {repetir.length > 0 && <Requisito cumple={repetir === clave} texto="Las dos coinciden" />}
        </ul>
      </div>
    </>
  );
}
