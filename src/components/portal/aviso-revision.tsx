/**
 * Franja de la vista de revisión: recuerda al equipo que mira la cuenta del cliente en solo lectura, qué revisar
 * antes de mandarle sus credenciales y cómo confirmar que está en orden. Va arriba de cada pantalla del portal.
 */
import { marcarCuentaRevisadaAction } from "@/app/(cliente)/cliente/(privado)/acciones-revision";
import { btnPrincipal, btnSecundario, haceCuanto } from "./ui";

export function AvisoRevision({ empresa, revisadaAt, revisadaPor, sinPersonas }: { empresa: string; revisadaAt: Date | null; revisadaPor: string | null; sinPersonas: boolean }) {
  return (
    <section className="p-card p-aviso p-4 sm:p-6 min-w-0" aria-label="Vista de revisión">
      <p className="p-eyebrow">Vista de revisión · solo lectura</p>
      <h2 className="mt-2 text-fg text-lg font-bold tracking-tight break-words">Así verá {empresa} su cuenta</h2>
      <p className="mt-2 text-fg-dim text-sm leading-relaxed max-w-3xl">
        Revisa proyectos y fases, facturas y montos, documentos y los datos de la empresa antes de mandarle sus credenciales.
        Aquí nada se guarda ni le llega al cliente.{sinPersonas ? " Todavía no hay nadie invitado: la cuenta se muestra con los datos del cliente." : ""}
      </p>
      {revisadaAt && <p className="mt-2 text-fg-faint text-xs">Última revisión {haceCuanto(revisadaAt)}{revisadaPor ? ` por ${revisadaPor}` : ""}.</p>}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <form action={marcarCuentaRevisadaAction}>
          <button type="submit" className={`${btnPrincipal} w-full sm:w-auto`}>Todo está en orden: habilitar la invitación</button>
        </form>
        <a href="/api/empresa/vista-cliente/salir" className={`${btnSecundario} w-full sm:w-auto`}>Volver a la ficha sin confirmar</a>
      </div>
    </section>
  );
}
