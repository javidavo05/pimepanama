/** Aplica un cambio de estado a un sistema y dispara la alerta que corresponda (una sola vez por caída). */
import { prisma } from "@/lib/prisma";
import { alertaPorCambio, ESTADO_LABEL, type EstadoSistema } from "./reglas";
import { avisarPulso } from "./alertas";
import { registrarEvento } from "@/lib/portal/eventos";

export const SISTEMA_SELECT = { id: true, userId: true, clientId: true, projectId: true, name: true, status: true, failCount: true, alertedStatus: true, client: { select: { name: true, company: true } } } as const;
type S = { id: string; userId: string; clientId: string; projectId: string | null; name: string; status: string; alertedStatus: string | null; client: { name: string; company: string | null } };

export async function cambiarEstado(s: S, nuevo: EstadoSistema, detalle: string | null, extra: Record<string, unknown> = {}) {
  const alerta = alertaPorCambio(s.alertedStatus, nuevo);
  const cambio = s.status !== nuevo;
  await prisma.monitoredSystem.update({
    where: { id: s.id },
    data: {
      ...extra,
      status: nuevo,
      statusDetail: detalle,
      ...(cambio ? { statusChangedAt: new Date() } : {}),
      ...(alerta ? { alertedStatus: alerta === "recuperado" ? null : alerta } : {}),
    },
  });
  if (!alerta) return { cambio, alerta };
  const eraCaido = s.alertedStatus === "caido";
  const titulo = alerta === "caido" ? "no responde" : alerta === "degradado" ? "funciona con fallas" : "volvió a funcionar";
  await avisarPulso(s, { titulo, detalle, grave: alerta === "caido" || (alerta === "recuperado" && eraCaido), recuperado: alerta === "recuperado" });
  // La caída y la vuelta quedan en la línea de tiempo del cliente, visibles para él (sin detalle técnico).
  if (alerta === "caido" || (alerta === "recuperado" && eraCaido)) {
    await registrarEvento({
      userId: s.userId, clientId: s.clientId, projectId: s.projectId, entityType: "monitored_system", entityId: s.id,
      kind: alerta === "caido" ? "sistema_caido" : "sistema_recuperado",
      title: alerta === "caido" ? `${s.name}: detectamos que no responde` : `${s.name}: volvió a funcionar`,
      detail: alerta === "caido" ? "Pime recibió la alerta y está trabajando en ello." : null,
      visibility: "cliente", actorType: "sistema",
    });
  }
  return { cambio, alerta, etiqueta: ESTADO_LABEL[nuevo] };
}
