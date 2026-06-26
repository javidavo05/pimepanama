import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { CotizacionBuilder } from "./cotizacion-builder";

export const metadata = { title: "Nueva Cotización — Pime Suite" };

export default async function NuevaCotizacionPage() {
  const user = await getEmpresaUser();
  const [clients, paymentMethods] = await Promise.all([
    prisma.client.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.paymentMethod.findMany({ where: { userId: user.id, isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <CotizacionBuilder
      taxRateDefault={Number(user.config?.taxRatePercent ?? 7)}
      currency={user.config?.currency ?? "USD"}
      clients={clients}
      paymentMethods={paymentMethods}
      mode="create"
    />
  );
}
