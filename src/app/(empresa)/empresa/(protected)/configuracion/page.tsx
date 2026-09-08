import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { serializePaymentMethod, serializeCompanyConfig } from "@/lib/serializers";
import { ConfigForm } from "./config-form";
import { PaymentMethodsSettings } from "@/components/empresa/payment-methods-settings";
import { ThemeToggleCards } from "@/components/empresa/theme/theme-toggle";

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
        <h1 className="text-fg text-2xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-fg-dim text-sm mt-1">
          Datos de la empresa que aparecen en todos los documentos
        </p>
      </div>

      <section className="bg-panel border border-line rounded-2xl p-6">
        <h2 className="text-fg text-sm font-semibold">Apariencia</h2>
        <p className="text-fg-dim text-xs mt-1 mb-4">
          Cómo se ve la suite en este navegador. No afecta a tus compañeros.
        </p>
        <ThemeToggleCards />
      </section>

      <ConfigForm config={serializeCompanyConfig(user.config)} />
      <PaymentMethodsSettings methods={paymentMethods.map(serializePaymentMethod)} />
    </div>
  );
}
