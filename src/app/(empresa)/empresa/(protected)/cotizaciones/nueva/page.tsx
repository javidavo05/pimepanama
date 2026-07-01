import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { serializePaymentMethod, serializeProject, serializeContract } from "@/lib/serializers";
import { CotizacionBuilder } from "./cotizacion-builder";

export const metadata = { title: "Nueva Cotización — Pime Suite" };

export default async function NuevaCotizacionPage() {
  const user = await getEmpresaUser();
  const [clients, paymentMethods, projects, contracts] = await Promise.all([
    prisma.client.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.paymentMethod.findMany({ where: { userId: user.id, isActive: true }, orderBy: { name: "asc" } }),
    prisma.project.findMany({ where: { userId: user.id, status: "ACTIVE" }, orderBy: { name: "asc" } }),
    prisma.contract.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <CotizacionBuilder
      taxRateDefault={Number(user.config?.taxRatePercent ?? 7)}
      currency={user.config?.currency ?? "USD"}
      clients={clients}
      paymentMethods={paymentMethods.map(serializePaymentMethod)}
      projects={projects.map(serializeProject)}
      contracts={contracts.map(serializeContract)}
      mode="create"
    />
  );
}
