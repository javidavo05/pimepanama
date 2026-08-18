import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { serializePaymentMethod, serializeProject, serializeContract } from "@/lib/serializers";
import { getReceivablesForInvoice } from "@/lib/receivables-for-invoice";
import { FacturaBuilder } from "./factura-builder";

export const metadata = { title: "Nueva Factura — Pime Suite" };

export default async function NuevaFacturaPage({
  searchParams,
}: {
  searchParams: Promise<{ cobrar?: string; clientId?: string }>;
}) {
  const user = await getEmpresaUser();
  const { cobrar, clientId } = await searchParams;

  const [clients, paymentMethods, projects, contracts, receivables] = await Promise.all([
    prisma.client.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.paymentMethod.findMany({ where: { userId: user.id, isActive: true }, orderBy: { name: "asc" } }),
    prisma.project.findMany({
      where: { userId: user.id, status: "ACTIVE" },
      include: { clients: { select: { clientId: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.contract.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    getReceivablesForInvoice(user.id),
  ]);

  return (
    <FacturaBuilder
      taxRateDefault={Number(user.config?.taxRatePercent ?? 7)}
      currency={user.config?.currency ?? "USD"}
      clients={clients}
      paymentMethods={paymentMethods.map(serializePaymentMethod)}
      projects={projects.map((p) => ({
        ...serializeProject(p),
        clientIds: p.clients.map((c) => c.clientId),
        financingPlan: p.financingPlan,
      }))}
      contracts={contracts.map(serializeContract)}
      receivables={receivables}
      preselectReceivableId={cobrar}
      preselectClientId={clientId}
    />
  );
}
