import webpush from "web-push";
import { prisma } from "@/lib/prisma";

export type PushPayload = {
  title: string;
  body: string;
  /** Ruta interna a la que salta el PWA al tocar la notificación. */
  url?: string;
  /** Agrupa notificaciones del mismo tema: la nueva reemplaza la anterior. */
  tag?: string;
};

let configured: boolean | null = null;

/**
 * VAPID vive en variables de entorno (Vercel). Si faltan, el push queda
 * apagado y el resto del sistema de avisos (campana + correo) sigue igual.
 */
function ensureVapid(): boolean {
  if (configured !== null) return configured;

  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) {
    configured = false;
    return false;
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT?.trim() || "mailto:javier@pimepanama.com",
    publicKey,
    privateKey
  );
  configured = true;
  return true;
}

export function isPushConfigured(): boolean {
  return ensureVapid();
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY?.trim() || null;
}

/**
 * Envía un push a todos los dispositivos suscritos del usuario.
 * Nunca lanza: un teléfono con el permiso revocado no puede tumbar el flujo
 * que dispara el aviso. Las suscripciones muertas (404/410) se borran solas.
 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!ensureVapid()) return { sent: 0, removed: 0, skipped: "vapid-missing" as const };

  let subs;
  try {
    subs = await prisma.pushSubscription.findMany({ where: { userId } });
  } catch (err) {
    console.error("[push] no se pudieron leer las suscripciones", err);
    return { sent: 0, removed: 0 };
  }

  if (subs.length === 0) return { sent: 0, removed: 0 };

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/empresa",
    tag: payload.tag,
  });

  let sent = 0;
  const dead: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
          { TTL: 60 * 60 * 24, urgency: "high" }
        );
        sent += 1;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          dead.push(sub.id);
        } else {
          console.error(`[push] fallo al enviar a ${sub.endpoint.slice(0, 48)}…`, status ?? err);
        }
      }
    })
  );

  if (dead.length > 0) {
    try {
      await prisma.pushSubscription.deleteMany({ where: { id: { in: dead } } });
    } catch (err) {
      console.error("[push] no se pudieron borrar suscripciones muertas", err);
    }
  }

  if (sent > 0) {
    try {
      await prisma.pushSubscription.updateMany({
        where: { userId, id: { notIn: dead } },
        data: { lastUsedAt: new Date() },
      });
    } catch {
      /* el sello de uso es informativo, no vale romper el envío por él */
    }
  }

  return { sent, removed: dead.length };
}
