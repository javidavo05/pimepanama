import Link from "next/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { MacDevices } from "./mac-devices";

export const metadata = { title: "PIME Guard en la Mac — Pime Suite" };
export const dynamic = "force-dynamic";

export default async function MacPage({
  searchParams,
}: {
  searchParams: Promise<{ conectar?: string }>;
}) {
  const user = await getEmpresaUser();
  const { conectar } = await searchParams;
  const devices = await prisma.deviceToken.findMany({
    where: { userId: user.id, revokedAt: null },
    select: { id: true, name: true, createdAt: true, lastUsedAt: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/empresa/configuracion" className="text-fg-faint hover:text-fg-mute text-xs">
          ← Configuración
        </Link>
        <h1 className="text-fg text-2xl font-semibold tracking-tight mt-2">PIME Guard en la Mac</h1>
        <p className="text-fg-dim text-sm mt-1 leading-relaxed">
          La barra de menú muestra cuántos correos te faltan leer, con los importantes primero, y
          prepara una grabación de reunión en un clic. Vincúlala una vez; la llave queda guardada
          solo en esa Mac y aquí solo se guarda su huella.
        </p>
      </div>

      <MacDevices
        autoConnect={conectar === "1"}
        devices={devices.map((d) => ({
          id: d.id,
          name: d.name,
          createdAt: d.createdAt.toISOString(),
          lastUsedAt: d.lastUsedAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
