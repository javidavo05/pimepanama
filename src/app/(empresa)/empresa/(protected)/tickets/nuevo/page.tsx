import Link from "@/components/empresa/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/empresa/page-header";
import { NuevoTicketEquipo } from "./nuevo-form";

export const metadata = { title: "Nuevo ticket — Pime Suite" };

/** ?clientId=<id>&projectId=<id> precargan cliente y proyecto (desde la ficha o la pestaña Tickets de un proyecto). */
export default async function NuevoTicket({ searchParams }: { searchParams: Promise<{ clientId?: string; projectId?: string }> }) {
  const u = await getEmpresaUser();
  const { clientId, projectId } = await searchParams;
  const [clientes, proyectos] = await Promise.all([
    prisma.client.findMany({ where: { userId: u.id, archivedAt: null }, orderBy: [{ internal: "desc" }, { name: "asc" }], select: { id: true, name: true, company: true, internal: true } }),
    prisma.project.findMany({ where: { userId: u.id, status: { in: ["ACTIVE", "PAUSED", "COMPLETED"] } }, select: { id: true, name: true, clientId: true, clients: { select: { clientId: true } } }, orderBy: { updatedAt: "desc" } }),
  ]);
  const opcionesProyecto = proyectos.map((p) => ({ id: p.id, nombre: p.name, clientes: [p.clientId, ...p.clients.map((x) => x.clientId)].filter(Boolean) as string[] }));
  // Desde un proyecto sin cliente elegido: el cliente sale del proyecto.
  const cliente = clientId ?? (projectId ? opcionesProyecto.find((p) => p.id === projectId)?.clientes[0] : undefined);
  const interno = clientes.find((c) => c.id === cliente)?.internal ?? false;
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        eyebrow={<Link href="/empresa/tickets" className="inline-flex items-center min-h-11 sm:min-h-8 text-sm text-fg-dim hover:text-fg-mute">← Tickets</Link>}
        title="Nuevo ticket"
        description={interno ? "Un error, una mejora o una tarea de un producto de Pime. Queda en el proyecto, ordenado con los demás." : "Para algo que el cliente pidió por teléfono, WhatsApp o en una reunión. Queda en su cuenta igual que si lo hubiera abierto él."}
      />
      <div className="bg-panel border border-line rounded-2xl p-4 sm:p-6">
        <NuevoTicketEquipo clientes={clientes.map((c) => ({ id: c.id, nombre: c.company || c.name, interno: c.internal }))} proyectos={opcionesProyecto} clientId={cliente} projectId={projectId} />
      </div>
    </div>
  );
}
