import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "./push";

export type NotifyInput = {
  userId: string;
  title: string;
  body: string;
  /** Ruta interna del panel a la que lleva el aviso. */
  link: string;
  /** Agrupa avisos del mismo tema en el teléfono. */
  tag?: string;
};

/**
 * Aviso interno en dos canales: la campana del panel (fila en MailNotification,
 * que ya lee el bell) y un push al PWA de cada dispositivo suscrito.
 *
 * Nunca lanza. Se llama desde flujos donde lo importante ya quedó guardado
 * (un lead, una tarea): que falle el aviso no puede tumbar el guardado.
 */
export async function notifyUser({ userId, title, body, link, tag }: NotifyInput) {
  const result = { bell: false, push: 0 };

  try {
    await prisma.mailNotification.create({
      data: { userId, title, body: body.slice(0, 500), link },
    });
    result.bell = true;
  } catch (err) {
    console.error("[notify] no se pudo crear la notificación de campana", err);
  }

  try {
    const push = await sendPushToUser(userId, { title, body, url: link, tag });
    result.push = push.sent;
  } catch (err) {
    console.error("[notify] no se pudo enviar el push", err);
  }

  return result;
}
