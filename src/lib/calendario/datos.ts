/** El calendario de la persona del equipo: dirección cifrada en EmpresaUser (migración 0044). */
import { prisma } from "@/lib/prisma";
import { decryptPassword, encryptPassword } from "@/lib/mail/crypto";
import { direccionValida, leerCalendario, type EventoCalendario } from "./ics";

export async function eventosDelEquipo(userId: string, desde: Date, hasta: Date): Promise<{ estado: "sin" | "ok" | "error"; eventos: EventoCalendario[]; error?: string }> {
  const u = await prisma.empresaUser.findUnique({ where: { id: userId }, select: { calendarIcsEnc: true } });
  if (!u?.calendarIcsEnc) return { estado: "sin", eventos: [] };
  try {
    return { estado: "ok", eventos: await leerCalendario(decryptPassword(u.calendarIcsEnc), desde, hasta) };
  } catch (e) {
    return { estado: "error", eventos: [], error: e instanceof Error ? e.message : "No se pudo leer el calendario." };
  }
}

/** Comprueba la dirección leyendo la agenda de hoy y la guarda cifrada. */
export async function conectarCalendario(userId: string, url: string, desde: Date, hasta: Date) {
  const limpia = url.trim();
  if (!direccionValida(limpia)) throw new Error("Esa no parece la dirección secreta de Google Calendar. Debe empezar con https://calendar.google.com/calendar/ical/ y terminar en .ics.");
  const eventos = await leerCalendario(limpia, desde, hasta);
  await prisma.empresaUser.update({ where: { id: userId }, data: { calendarIcsEnc: encryptPassword(limpia), calendarCheckedAt: new Date(), calendarError: null } });
  return eventos;
}
