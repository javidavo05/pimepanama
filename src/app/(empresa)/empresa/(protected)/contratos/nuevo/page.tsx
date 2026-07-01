import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { ContractForm } from "./contract-form";
import { serializeProject } from "@/lib/serializers";

export const metadata = { title: "Nuevo Contrato — Pime Suite" };

export default async function NuevoContratoPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string; clientId?: string }>;
}) {
  const user = await getEmpresaUser();
  const sp = await searchParams;

  const [clients, projects] = await Promise.all([
    prisma.client.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.project.findMany({ where: { userId: user.id, status: "ACTIVE" }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="max-w-3xl mx-auto">
      <ContractForm
        clients={clients}
        projects={projects.map(serializeProject)}
        defaultProjectId={sp.projectId}
        defaultClientId={sp.clientId}
      />
    </div>
  );
}
