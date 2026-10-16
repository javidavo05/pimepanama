"use client";

/**
 * Enviar una campaña con confirmación en la misma página. El primer toque muestra a cuántos le llega y pide
 * confirmar; el envío va por tandas y, si quedan pendientes, el botón pasa a «Continuar envío».
 */
import { useActionState, useState } from "react";
import { btn } from "@/components/empresa/page-header";
import { enviarCampanaAction } from "../../acciones-campanas";

export function EnviarCampana({ id, total, faltan, empezada }: { id: string; total: number; faltan: number; empezada: boolean }) {
  const [estado, accion, enviando] = useActionState(enviarCampanaAction, null);
  const [confirmar, setConfirmar] = useState(false);
  const pendientes = estado?.faltan ?? faltan;
  const etiqueta = empezada ? `Continuar envío (faltan ${pendientes})` : `Enviar a ${total} ${total === 1 ? "contacto" : "contactos"}`;

  return (
    <div className="grid gap-3">
      {estado?.error && <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{estado.error}</p>}
      {estado?.ok && estado.mensaje && <p className="rounded-lg border border-ok/30 bg-ok/10 px-3 py-2 text-sm text-ok" role="status">{estado.mensaje}</p>}
      {enviando ? (
        <p className="rounded-lg border border-line bg-fill px-3 py-3 text-sm text-fg" role="status">
          Enviando… no cierres esta página. Cada tanda manda hasta 150 correos y tarda unos minutos.
        </p>
      ) : empezada || confirmar ? (
        <form action={accion} className="grid gap-3 rounded-xl border border-line-mid bg-fill p-4">
          <input type="hidden" name="id" value={id} />
          {!empezada && (
            <p className="text-sm text-fg">
              Se envía ahora a <strong>{total} {total === 1 ? "contacto" : "contactos"}</strong>. Un correo que ya salió no se puede retirar.
            </p>
          )}
          <div className="grid grid-flow-col auto-cols-fr gap-2 sm:flex">
            {!empezada && <button type="button" onClick={() => setConfirmar(false)} className={btn.secondary}>Cancelar</button>}
            <button type="submit" className={btn.primary}>{empezada ? etiqueta : `Sí, enviar a ${total}`}</button>
          </div>
        </form>
      ) : (
        <div className="grid sm:flex">
          <button type="button" onClick={() => setConfirmar(true)} className={btn.primary} disabled={total === 0}>{etiqueta}</button>
        </div>
      )}
    </div>
  );
}
