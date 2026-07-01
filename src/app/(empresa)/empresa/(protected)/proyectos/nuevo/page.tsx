import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { ProjectBuilder } from "./project-builder";

export const metadata = { title: "Nuevo Proyecto — Pime Suite" };

export default async function NuevoProyectoPage() {
  const user = await getEmpresaUser();
  const clients = await prisma.client.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-3xl mx-auto">
      <ProjectBuilder clients={clients} creatorName={user.fullName ?? null} />
    </div>
  );
}
