"use client";

/**
 * Editor de un correo (plantillas y campañas): asunto, cuerpo, botones para insertar variables donde está el
 * cursor y la vista previa con datos de ejemplo, armada con el mismo HTML que sale por correo.
 */
import { useRef, useState } from "react";
import { campo, etiqueta } from "@/components/empresa/clientes/formularios";
import { correoHtml, cuerpoHtml, DATOS_EJEMPLO, rellenarTexto, VARIABLES, variablesDesconocidas, type DatosCorreo } from "@/lib/crm/correo";

type Props = {
  asunto: string;
  cuerpo: string;
  onAsunto: (v: string) => void;
  onCuerpo: (v: string) => void;
  logoUrl: string;
  siteUrl: string;
  /** Datos para la vista previa; si no vienen, los de ejemplo. */
  datos?: DatosCorreo;
  conBaja?: boolean;
};

export function EditorCorreo({ asunto, cuerpo, onAsunto, onCuerpo, logoUrl, siteUrl, datos = DATOS_EJEMPLO, conBaja }: Props) {
  const asuntoRef = useRef<HTMLInputElement>(null);
  const cuerpoRef = useRef<HTMLTextAreaElement>(null);
  const [ultimo, setUltimo] = useState<"asunto" | "cuerpo">("cuerpo");
  const raras = variablesDesconocidas(`${asunto} ${cuerpo}`);

  function insertar(clave: string) {
    const el = ultimo === "asunto" ? asuntoRef.current : cuerpoRef.current;
    const valor = ultimo === "asunto" ? asunto : cuerpo;
    const poner = ultimo === "asunto" ? onAsunto : onCuerpo;
    const tag = `{{${clave}}}`;
    const ini = el?.selectionStart ?? valor.length;
    const fin = el?.selectionEnd ?? valor.length;
    poner(valor.slice(0, ini) + tag + valor.slice(fin));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(ini + tag.length, ini + tag.length);
    });
  }

  const html = correoHtml({
    cuerpo: cuerpo.trim() ? cuerpoHtml(cuerpo, datos) : `<p style="color:#8792A8;font-family:sans-serif;">Aquí se ve el cuerpo del correo.</p>`,
    logoUrl,
    siteUrl,
    bajaUrl: conBaja ? "#" : null,
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="grid gap-4 content-start min-w-0">
        <div>
          <label htmlFor="asunto" className={etiqueta}>Asunto</label>
          <input id="asunto" name="asunto" ref={asuntoRef} value={asunto} onChange={(e) => onAsunto(e.target.value)} onFocus={() => setUltimo("asunto")} required maxLength={200} className={campo} placeholder="Ej.: {{nombre}}, una idea para {{empresa}}" autoComplete="off" />
        </div>
        <div>
          <label htmlFor="cuerpo" className={etiqueta}>Mensaje</label>
          <textarea id="cuerpo" name="cuerpo" ref={cuerpoRef} value={cuerpo} onChange={(e) => onCuerpo(e.target.value)} onFocus={() => setUltimo("cuerpo")} required rows={12} maxLength={20000} className={`${campo} py-3 min-h-48 leading-relaxed`} placeholder={"Hola, {{nombre}}:\n\nTe escribo porque…\n\nSaludos,\n{{mi_nombre}}"} />
          <p className="text-fg-faint text-xs mt-2">Escribe como en un correo normal. Deja una línea en blanco entre párrafos; los enlaces que empiezan con https:// quedan tocables.</p>
        </div>
        <div>
          <p className={etiqueta} id="vars-label">Insertar variable</p>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="vars-label">
            {VARIABLES.map((v) => (
              <button key={v.clave} type="button" onClick={() => insertar(v.clave)} title={v.ayuda} className="inline-flex items-center min-h-11 px-3 rounded-lg border border-line-mid bg-fill text-sm text-fg-soft hover:border-line-loud hover:text-fg">
                {v.label}
              </button>
            ))}
          </div>
          <p className="text-fg-faint text-xs mt-2">Se inserta donde está el cursor, en el asunto o en el mensaje. Al enviar se cambia por el dato de cada persona.</p>
          {raras.length > 0 && (
            <p className="mt-2 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-warn" role="alert">
              Estas variables no existen: {raras.map((r) => `{{${r}}}`).join(", ")}. Bórralas o usa los botones.
            </p>
          )}
        </div>
      </div>
      <div className="grid gap-2 content-start min-w-0">
        <p className={etiqueta}>Vista previa</p>
        <div className="rounded-xl border border-line bg-fill overflow-hidden">
          <p className="px-4 py-3 border-b border-line text-sm text-fg [overflow-wrap:anywhere]">
            <span className="text-fg-dim">Asunto: </span>{asunto.trim() ? rellenarTexto(asunto, datos) : <span className="text-fg-faint">sin asunto</span>}
          </p>
          <iframe title="Vista previa del correo" srcDoc={html} sandbox="" className="block w-full h-[480px] bg-white" />
        </div>
        <p className="text-fg-faint text-xs [overflow-wrap:anywhere]">Se ve con los datos de {datos.contacto} ({datos.empresa}).</p>
      </div>
    </div>
  );
}
