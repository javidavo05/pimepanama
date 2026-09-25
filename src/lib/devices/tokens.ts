import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { EmpresaUser } from "@prisma/client";

/**
 * Llaves de las apps nativas (PIME Guard en la Mac). La app no tiene la cookie
 * de Supabase del navegador: se vincula una vez y manda la llave como Bearer.
 * En la base solo queda el SHA-256; la llave en claro vive solo en la Mac.
 */

const PREFIX = "pmg_";
/** No reescribir lastUsedAt en cada consulta: la app pregunta cada 2 minutos. */
const TOUCH_EVERY_MS = 10 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createDeviceToken(userId: string, name: string) {
  const token = PREFIX + randomBytes(32).toString("base64url");
  const device = await prisma.deviceToken.create({
    data: { userId, name: name.slice(0, 80), tokenHash: hashToken(token) },
    select: { id: true, name: true },
  });
  return { token, device };
}

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

/** Como requireEmpresaUser, pero con la llave del dispositivo. Lanza un 401. */
export async function requireDeviceUser(request: Request): Promise<EmpresaUser> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token.startsWith(PREFIX)) throw unauthorized();

  const device = await prisma.deviceToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!device || device.revokedAt) throw unauthorized();

  if (!device.lastUsedAt || Date.now() - device.lastUsedAt.getTime() > TOUCH_EVERY_MS) {
    await prisma.deviceToken
      .update({ where: { id: device.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);
  }
  return device.user;
}
