import Link from "@/components/empresa/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { RestaurarBoton } from "@/components/empresa/crm-ficha/archivar";
import { card, fechaHora } from "@/components/empresa/crm-ficha/comun";

export const metadata = { title: "Clientes archivados — Pime Suite" };

export default async function ClientesArchivados() {
  const u = await getEmpresaUser();
  const clientes = await prisma.client
    .findMany({ where: { userId: u.id, archivedAt: { not: null } }, orderBy: { archivedAt: "desc" }, select: { id: true, name: true, company: true, email: true, archivedAt: true } })
    .catch(() => null);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <nav className="flex items-center gap-2 text-sm text-fg-dim" aria-label="Ruta">
        <Link href="/empresa/clientes" className="inline-flex items-center min-h-11 sm:min-h-8 hover:text-fg-mute">Clientes</Link><span aria-hidden>/</span><span className="text-fg-mute">Archivados</span>
      </nav>
      <div>
        <h1 className="text-fg text-2xl font-semibold tracking-tight">Clientes archivados</h1>
        <p className="text-fg-dim text-sm mt-1">No salen en la lista de clientes, pero conservan su historia, facturas y proyectos. Restáuralos cuando vuelvas a trabajar con ellos.</p>
      </div>
      <section className={card}>
        {clientes === null ? (
          <p className="text-sm text-danger" role="alert">No se pudieron cargar los clientes archivados. Recarga la página.</p>
        ) : clientes.length ? (
          <ul className="divide-y divide-line">
            {clientes.map((c) => (
              <li key={c.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
                <Link href={`/empresa/clientes/${c.id}`} className="min-w-0 hover:underline">
                  <span className="block text-fg text-sm font-medium [overflow-wrap:anywhere]">{c.company || c.name}</span>
                  <span className="block text-fg-dim text-xs [overflow-wrap:anywhere]">{[c.company ? c.name : null, c.email, c.archivedAt ? `archivado el ${fechaHora(c.archivedAt, false)}` : null].filter(Boolean).join(" · ")}</span>
                </Link>
                <RestaurarBoton clientId={c.id} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-fg-dim">No hay clientes archivados. Para archivar uno, ábrelo y usa «Más» → «Archivar cliente».</p>
            <Link href="/empresa/clientes" className="inline-flex items-center min-h-11 sm:min-h-8 text-sm text-brand-fg hover:underline">Ir a Clientes</Link>
          </div>
        )}
      </section>
    </div>
  );
}
