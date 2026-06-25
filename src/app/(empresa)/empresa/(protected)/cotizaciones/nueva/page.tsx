import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { CotizacionBuilder } from "./cotizacion-builder";

export const metadata = { title: "Nueva Cotización — Pime Suite" };

export default async function NuevaCotizacionPage() {
  const user = await getEmpresaUser();
  return (
    <CotizacionBuilder
      taxRateDefault={Number(user.config?.taxRatePercent ?? 7)}
      currency={user.config?.currency ?? "USD"}
    />
  );
}
