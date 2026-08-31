import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { MeetingRecorder } from "./meeting-recorder";

export const metadata = { title: "Grabar reunión — Pime Suite" };
export const dynamic = "force-dynamic";

export default async function NuevaReunionPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const user = await getEmpresaUser();
  const { projectId } = await searchParams;

  const [projects, clients] = await Promise.all([
    prisma.project.findMany({
      where: { userId: user.id, status: { in: ["ACTIVE", "PAUSED"] } },
      select: { id: true, name: true, clientId: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.client.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, company: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="max-w-3xl mx-auto">
      <MeetingRecorder
        projects={projects}
        clients={clients}
        creatorName={user.fullName ?? null}
        initialProjectId={projectId}
      />
    </div>
  );
}
