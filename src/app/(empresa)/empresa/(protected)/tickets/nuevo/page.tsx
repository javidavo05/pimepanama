import Link from "@/components/empresa/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/empresa/page-header";
import { NuevoTicketEquipo } from "./nuevo-form";

export const metadata = { title: "Nuevo ticket — Pime Suite" };

export default async function NuevoTicket({ searchParams }: { searchParams: Promise<{ clientId?: string }> }) {
  const u = await getEmpresaUser();
  const { clientId } = await searchParams;
  const [clientes, proyectos] = await Promise.all([
    prisma.client.findMany({ where: { userId: u.id, archivedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true, company: true } }),
    prisma.project.findMany({ where: { userId: u.id, status: { in: ["ACTIVE", "PAUSED", "COMPLETED"] } }, select: { id: true, name: true, clientId: true, clients: { select: { clientId: true } } }, orderBy: { updatedAt: "desc" } }),
  ]);
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader eyebrow={<Link href="/empresa/tickets" className="text-sm text-fg-dim hover:text-fg-mute">← Tickets</Link>} title="Nuevo ticket" description="Para algo que el cliente pidió por teléfono, WhatsApp o en una reunión. Queda en su cuenta igual que si lo hubiera abierto él." />
      <div className="bg-panel border border-line rounded-2xl p-4 sm:p-6">
        <NuevoTicketEquipo clientes={clientes.map((c) => ({ id: c.id, nombre: c.company || c.name }))} proyectos={proyectos.map((p) => ({ id: p.id, nombre: p.name, clientes: [p.clientId, ...p.clients.map((x) => x.clientId)].filter(Boolean) as string[] }))} clientId={clientId} />
      </div>
    </div>
  );
}
