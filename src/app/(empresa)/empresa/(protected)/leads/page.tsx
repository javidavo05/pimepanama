import Link from "@/components/empresa/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { serializeLead } from "@/lib/serializers";
import { LeadsView } from "./leads-view";
import { PageHeader, btn, seg } from "@/components/empresa/page-header";
import { RespuestasView } from "./respuestas-view";
import { respuestasDelPanel, buzonesParaEnviar } from "@/lib/leads/respuestas";
import { estadoEnvio } from "@/lib/leads/envio-automatico";
import { puedeVer } from "@/lib/auth/permisos";
import { fechaCorta } from "@/lib/format-datetime";
import type { SolicitudCotizacion } from "@/lib/mail/ai-analyze";

export const metadata = { title: "Leads — Pime Suite" };
export const dynamic = "force-dynamic";
// Enviar una tanda y redactar propuestas corre en las acciones de esta página.
export const maxDuration = 300;

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  const user = await getEmpresaUser();
  const vistaRespuestas = (await searchParams).vista === "respuestas";

  const veCorreos = puedeVer(user.miembro.area, "correos");
  const [porRevisar, respuestas, buzones, envio] = await Promise.all([
    prisma.respuestaLead.count({ where: { userId: user.id, estado: { in: ["borrador", "fallo"] } } }).catch(() => 0),
    vistaRespuestas ? respuestasDelPanel(user.id).catch((e) => { console.error("[leads] respuestas", e); return null; }) : Promise.resolve(null),
    vistaRespuestas ? buzonesParaEnviar(user.id, user.miembro.email).catch(() => []) : Promise.resolve([]),
    vistaRespuestas ? estadoEnvio(user.id).catch(() => null) : Promise.resolve(null),
  ]);

  const pestanas = (
    <nav className={`${seg.group} mb-6`} aria-label="Secciones de leads">
      <Link href="/empresa/leads" aria-current={vistaRespuestas ? undefined : "page"} className={seg.item(!vistaRespuestas)}>Prospectos</Link>
      <Link href="/empresa/leads?vista=respuestas" aria-current={vistaRespuestas ? "page" : undefined} className={seg.item(vistaRespuestas)}>
        Respuestas{porRevisar > 0 && <span className="rounded-full bg-sand/15 px-2 text-xs font-semibold text-sand-fg tabular-nums">{porRevisar}</span>}
      </Link>
    </nav>
  );

  const encabezado = (
    <PageHeader
      className="mb-6"
      title="Leads"
      description={vistaRespuestas ? "Correos, propuestas en PDF y mensajes de LinkedIn que el agente dejó redactados, por tanda" : "Seguimiento de posibles clientes"}
      actions={
        <Link href="/empresa/leads/nuevo" className={vistaRespuestas ? btn.secondary : btn.primary}>
          + Nuevo lead
        </Link>
      }
    />
  );

  if (vistaRespuestas) {
    return (
      <div className="max-w-7xl mx-auto">
        {encabezado}
        {pestanas}
        {respuestas ? (
          <RespuestasView inicial={respuestas} buzones={buzones} envioInicial={envio} />
        ) : (
          <div className="rounded-xl border border-danger/25 bg-danger/[0.08] px-6 py-12 text-center" role="alert">
            <p className="text-sm font-medium text-danger">No se pudieron cargar las respuestas.</p>
            <Link href="/empresa/leads?vista=respuestas" className={`${btn.secondary} mt-6`}>Volver a intentar</Link>
          </div>
        )}
      </div>
    );
  }

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
      {encabezado}
      {pestanas}

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
