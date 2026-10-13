import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { MeetingRecorder } from "./meeting-recorder";
import { contextoClientes } from "@/lib/meetings/clientes-contexto";

export const metadata = { title: "Grabar reunión — Pime Suite" };
export const dynamic = "force-dynamic";

/**
 * ?proyecto=<id> (o el antiguo ?projectId=) precarga el proyecto, como al entrar desde un proyecto. Sin él
 * se precarga el último proyecto usado en una reunión, si sigue en curso: casi siempre es el mismo.
 */
export default async function NuevaReunionPage({
  searchParams,
}: {
  searchParams: Promise<{ proyecto?: string; projectId?: string; title?: string; source?: string }>;
}) {
  const user = await getEmpresaUser();
  const { proyecto, projectId, title, source } = await searchParams;
  const pedido = proyecto || projectId || null;

  const [ctx, clients, ultima] = await Promise.all([
    // Proyectos con su cliente principal y lo de cada cliente: al elegirlo sale todo al instante.
    contextoClientes(user.id),
    prisma.client.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, company: true },
      orderBy: { name: "asc" },
    }),
    pedido
      ? Promise.resolve(null)
      : prisma.meeting.findFirst({
          where: { userId: user.id, projectId: { not: null }, project: { status: { in: ["ACTIVE", "PAUSED"] } } },
          orderBy: { createdAt: "desc" },
          select: { projectId: true },
        }),
  ]);

  // El pedido por enlace entra aunque esté cerrado: si no, el selector no lo mostraría.
  const projects = ctx.proyectos.filter((p) => p.status === "ACTIVE" || p.status === "PAUSED" || p.id === pedido);
  const desdeEnlace = pedido && projects.some((p) => p.id === pedido) ? pedido : null;
  const inicial = desdeEnlace ?? ultima?.projectId ?? undefined;

  return (
    <div className="max-w-3xl mx-auto">
      <MeetingRecorder
        projects={projects}
        clients={clients}
        resumenes={ctx.resumenes}
        creatorName={user.fullName ?? null}
        initialProjectId={inicial}
        projectPreset={desdeEnlace ? "enlace" : inicial ? "ultimo" : null}
        initialTitle={title}
        initialSource={source}
      />
    </div>
  );
}
