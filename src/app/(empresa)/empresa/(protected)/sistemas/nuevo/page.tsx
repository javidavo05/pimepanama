import Link from "@/components/empresa/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { SistemaForm } from "@/components/empresa/sistemas/formularios";

export const metadata = { title: "Conectar sistema — Pime Suite" };

export default async function NuevoSistema({ searchParams }: { searchParams: Promise<{ cliente?: string }> }) {
  const u = await getEmpresaUser();
  const { cliente } = await searchParams;
  const [clientes, proyectos] = await Promise.all([
    prisma.client.findMany({ where: { userId: u.id, archivedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true, company: true } }),
    prisma.project.findMany({ where: { userId: u.id, clientId: { not: null } }, orderBy: [{ status: "asc" }, { updatedAt: "desc" }], select: { id: true, name: true, clientId: true } }),
  ]);
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <nav className="flex items-center gap-2 text-sm text-fg-dim" aria-label="Ruta">
        <Link href="/empresa/sistemas" className="inline-flex items-center min-h-11 sm:min-h-8 hover:text-fg-mute">Sistemas</Link><span aria-hidden>/</span><span className="text-fg-mute">Conectar</span>
      </nav>
      <div>
        <h1 className="text-fg text-2xl font-semibold tracking-tight">Conectar un sistema</h1>
        <p className="text-fg-dim text-sm mt-1">Al guardar ves la key y el secreto para ponerlos en las variables del sistema.</p>
      </div>
      <div className="bg-panel border border-line rounded-2xl p-4 sm:p-6">
        {clientes.length ? (
          <SistemaForm clientes={clientes.map((c) => ({ id: c.id, nombre: c.company || c.name }))} proyectos={proyectos.map((p) => ({ id: p.id, nombre: p.name, clientId: p.clientId! }))} clienteInicial={clientes.some((c) => c.id === cliente) ? cliente : undefined} />
        ) : (
          <div className="text-center space-y-4 py-6">
            <p className="text-fg font-medium">Primero crea el cliente.</p>
            <p className="text-fg-dim text-sm">Cada sistema es de un cliente: así su estado sale en la cuenta del cliente.</p>
            <Link href="/empresa/clientes/nuevo" className="text-brand-fg font-semibold hover:underline">Crear cliente</Link>
          </div>
        )}
      </div>
    </div>
  );
}
