import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { cargarPlatforms } from "@/lib/platforms/cargar";
import { PlatformsBoard } from "./platforms-board";

export const metadata = { title: "Accesos y cuentas — Pime Suite" };
export const dynamic = "force-dynamic";

/**
 * ?abrir=<id> abre esa plataforma · ?nueva=1&cliente=<id> abre el asistente con el cliente elegido (desde la
 * ficha del cliente) · ?nueva=1&proyecto=<id> lo abre con el proyecto y su cliente (desde «Qué le falta» del
 * proyecto) · ?tab=cuentas abre Cuentas.
 */
export default async function PlatformsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [user, sp] = await Promise.all([getEmpresaUser(), searchParams]);
  const data = await cargarPlatforms(user.id);
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : null);
  const proyecto = one("proyecto");
  const clienteDelProyecto = proyecto ? (data.clients.find((c) => c.projects.some((p) => p.id === proyecto))?.id ?? null) : null;

  return (
    <div className="w-full max-w-6xl">
      <PlatformsBoard
        data={data}
        abrir={one("abrir")}
        nueva={one("nueva") === "1"}
        clienteNueva={clienteDelProyecto ?? one("cliente")}
        proyectoNueva={clienteDelProyecto ? proyecto : null}
        tabInicial={one("tab") === "cuentas" ? "cuentas" : "plataformas"}
      />
    </div>
  );
}
