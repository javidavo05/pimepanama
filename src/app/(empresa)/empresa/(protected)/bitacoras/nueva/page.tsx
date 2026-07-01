import { BitacoraBuilder } from "./bitacora-builder";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Nueva Bitácora — Pime Suite" };

export default async function NuevaBitacoraPage() {
  const user = await getEmpresaUser();
  const clients = await prisma.client.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });

  return <BitacoraBuilder clients={clients} creatorName={user.fullName} />;
}
