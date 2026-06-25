import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { FacturaBuilder } from "./factura-builder";

export const metadata = { title: "Nueva Factura — Pime Suite" };

export default async function NuevaFacturaPage() {
  const user = await getEmpresaUser();
  return (
    <FacturaBuilder
      taxRateDefault={Number(user.config?.taxRatePercent ?? 7)}
      currency={user.config?.currency ?? "USD"}
    />
  );
}
