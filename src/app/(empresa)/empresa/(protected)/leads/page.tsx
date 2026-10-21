import Link from "@/components/empresa/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { serializeLead } from "@/lib/serializers";
import { LeadsView } from "./leads-view";
import { PageHeader, btn } from "@/components/empresa/page-header";
import { puedeVer } from "@/lib/auth/permisos";
import { fechaCorta } from "@/lib/format-datetime";
import type { SolicitudCotizacion } from "@/lib/mail/ai-analyze";

export const metadata = { title: "Leads — Pime Suite" };
export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const user = await getEmpresaUser();

  const veCorreos = puedeVer(user.miembro.area, "correos");
  const [leads, solicitudes] = await Promise.all([
    prisma.lead.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    }),
    // Solicitudes de cotización que la IA vio en el correo y nadie aprobó ni descartó todavía.
    veCorreos
      ? prisma.inboxEmail.findMany({
          where: {
            userId: user.id, folder: "INBOX", leadId: null, clientId: null, vinculo: null,
            NOT: { solicitud: { equals: Prisma.DbNull } },
            receivedAt: { gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) },
          },
          orderBy: { receivedAt: "desc" },
          take: 10,
          select: { id: true, fromName: true, fromEmail: true, subject: true, receivedAt: true, solicitud: true },
        }).catch(() => [])
      : Promise.resolve([]),
  ]);

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        className="mb-6"
        title="Leads"
        description="Seguimiento de posibles clientes"
        actions={
          <Link href="/empresa/leads/nuevo" className={btn.primary}>
            + Nuevo lead
          </Link>
        }
      />

      {solicitudes.length > 0 && (
        <section className="mb-6 rounded-2xl border border-sand/40 bg-sand/5 p-4 sm:p-6" aria-labelledby="solicitudes-titulo">
          <h2 id="solicitudes-titulo" className="text-fg text-base font-semibold tracking-tight">
            {solicitudes.length === 1 ? "1 solicitud por correo espera tu visto bueno" : `${solicitudes.length} solicitudes por correo esperan tu visto bueno`}
          </h2>
          <p className="mt-1 text-sm text-fg-dim">La IA cree que piden cotización. Ábrela, revisa los datos y crea el lead, lígala a uno que ya existe o descártala.</p>
          <ul className="mt-4 divide-y divide-line">
            {solicitudes.map((m) => {
              const s = m.solicitud as unknown as SolicitudCotizacion;
              const quien = [s.nombre || m.fromName || m.fromEmail, s.empresa].filter(Boolean).join(" · ");
              return (
                <li key={m.id}>
                  <Link href={`/empresa/correos/hub/${m.id}`} className="grid gap-1 py-3 min-h-11 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4 group">
                    <span className="min-w-0">
                      <span className="block text-fg text-sm font-medium group-hover:underline [overflow-wrap:anywhere]">{quien}</span>
                      <span className="block text-fg-dim text-sm [overflow-wrap:anywhere]">{s.necesidad}</span>
                    </span>
                    <span className="text-fg-faint text-xs whitespace-nowrap">{fechaCorta(m.receivedAt)} · Revisar →</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <LeadsView leads={leads.map(serializeLead)} />
    </div>
  );
}
