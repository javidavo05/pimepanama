import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { serializePaymentMethod, serializeProject, serializeContract, serializeLead } from "@/lib/serializers";
import { CotizacionBuilder } from "./cotizacion-builder";

export const metadata = { title: "Nueva Cotización — Pime Suite" };

export default async function NuevaCotizacionPage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string; projectId?: string; clientId?: string }>;
}) {
  const user = await getEmpresaUser();
  const { leadId, projectId, clientId } = await searchParams;
  const [clients, paymentMethods, projects, contracts, leads] = await Promise.all([
    prisma.client.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.paymentMethod.findMany({ where: { userId: user.id, isActive: true }, orderBy: { name: "asc" } }),
    prisma.project.findMany({ where: { userId: user.id, status: "ACTIVE" }, orderBy: { name: "asc" } }),
    prisma.contract.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    prisma.lead.findMany({ where: { userId: user.id, status: { notIn: ["GANADO", "PERDIDO"] } }, orderBy: { name: "asc" } }),
  ]);

  return (
    <CotizacionBuilder
      taxRateDefault={Number(user.config?.taxRatePercent ?? 7)}
      currency={user.config?.currency ?? "USD"}
      clients={clients}
      leads={leads.map(serializeLead)}
      paymentMethods={paymentMethods.map(serializePaymentMethod)}
      projects={projects.map(serializeProject)}
      contracts={contracts.map(serializeContract)}
      mode="create"
      initialLeadId={leadId}
      initialProjectId={projectId}
      initialClientId={clientId}
    />
  );
}
