import Link from "@/components/empresa/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { reglasDe } from "@/lib/crm/seguimientos-reglas";
import { ReglasForm } from "./reglas-form";

export const metadata = { title: "Seguimientos — Pime Suite" };

export default async function ConfigSeguimientosPage() {
  const u = await getEmpresaUser();
  const reglas = reglasDe(u.config?.reglasCrm);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <nav className="flex items-center gap-2 text-sm text-fg-dim" aria-label="Ruta">
        <Link href="/empresa/configuracion" className="inline-flex items-center min-h-11 sm:min-h-8 hover:text-fg-mute">Configuración</Link>
        <span aria-hidden>/</span>
        <span className="text-fg-mute">Seguimientos</span>
      </nav>
      <div>
        <h1 className="text-fg text-2xl font-semibold tracking-tight">Seguimientos automáticos</h1>
        <p className="text-fg-dim text-sm mt-1">
          Cada mañana Pime revisa leads, clientes y contratos, y crea la tarea que toca para su responsable (o para ti si no
          tiene). Nunca repite una tarea que sigue abierta.
        </p>
      </div>
      {u.configId ? (
        <ReglasForm reglas={reglas} />
      ) : (
        <div className="bg-panel border border-line rounded-2xl p-6 text-center space-y-2">
          <p className="text-fg font-medium">Falta guardar los datos de la empresa.</p>
          <p className="text-fg-dim text-sm">Las reglas se guardan junto a la empresa.</p>
          <Link href="/empresa/configuracion" className="inline-flex items-center min-h-11 text-brand-fg font-semibold hover:underline">Ir a Configuración</Link>
        </div>
      )}
      <p className="text-fg-dim text-xs">
        El seguimiento que programas en cada lead (fecha de «Próximo seguimiento») siempre crea su tarea ese día, aunque apagues estas reglas.
      </p>
    </div>
  );
}
