import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { serializePaymentMethod } from "@/lib/serializers";
import { ImportarCotizacionForm } from "./importar-form";

export const metadata = { title: "Importar Cotización — Pime Suite" };

export default async function ImportarCotizacionPage() {
  const user = await getEmpresaUser();
  const [clients, paymentMethods] = await Promise.all([
    prisma.client.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.paymentMethod.findMany({ where: { userId: user.id, isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-white text-2xl font-semibold tracking-tight">Importar cotización antigua</h1>
        <p className="text-white/40 text-sm mt-1">
          Digitaliza el registro de una cotización anterior. Sube el PDF (opcional) y completa los datos.
        </p>
      </div>
      <ImportarCotizacionForm clients={clients} paymentMethods={paymentMethods.map(serializePaymentMethod)} />
    </div>
  );
}
