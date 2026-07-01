import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { serializePaymentMethod } from "@/lib/serializers";
import { ConfigForm } from "./config-form";
import { PaymentMethodsSettings } from "@/components/empresa/payment-methods-settings";

export const metadata = { title: "Configuración — Pime Suite" };

export default async function ConfiguracionPage() {
  const user = await getEmpresaUser();
  const paymentMethods = await prisma.paymentMethod.findMany({
    where: { userId: user.id, isActive: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-white text-2xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-white/40 text-sm mt-1">
          Datos de la empresa que aparecen en todos los documentos
        </p>
      </div>

      <ConfigForm config={user.config} />
      <PaymentMethodsSettings methods={paymentMethods.map(serializePaymentMethod)} />
    </div>
  );
}
