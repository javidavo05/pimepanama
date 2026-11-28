import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { canalDeControl, realtimeConfig } from "@/lib/devices/control";
import { ControlSlides } from "./control-slides";

export const metadata = { title: "Control de slides" };
export const dynamic = "force-dynamic";

/**
 * Control de slides: el celular manda Siguiente/Anterior y mueve el puntero de
 * una Mac con PIME Guard (pestaña Control encendida). Cada Mac vinculada tiene
 * su propio canal; se ofrece primero la que se usó por última vez.
 */
export default async function ControlSlidesPage() {
  const user = await getEmpresaUser();
  const devices = await prisma.deviceToken.findMany({
    where: { userId: user.miembro.id, revokedAt: null, alcance: "dispositivo" },
    select: { id: true, name: true, lastUsedAt: true, createdAt: true },
    orderBy: [{ lastUsedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
  });
  const { url, anonKey } = realtimeConfig();
  const fecha = new Intl.DateTimeFormat("es-PA", { day: "numeric", month: "short", timeZone: "America/Panama" });

  return (
    <ControlSlides
      realtime={{ url, anonKey }}
      macs={devices.map((d) => ({
        id: d.id,
        name: d.name,
        canal: canalDeControl(d.id),
        detalle: d.lastUsedAt ? `usada ${fecha.format(d.lastUsedAt)}` : `vinculada ${fecha.format(d.createdAt)}`,
      }))}
    />
  );
}
