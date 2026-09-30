import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import {
  verifyAuthenticationResponse,
  type AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";

/**
 * Llaves de acceso (WebAuthn): entrar a la suite y abrir la bóveda de Platforms
 * con Touch ID, Face ID o la huella del teléfono.
 *
 * Sin estado en el servidor: el desafío de cada ceremonia viaja en una cookie
 * firmada que dura 5 minutos y se consume al verificar. El permiso de la bóveda
 * es un token firmado de 15 minutos que reemplaza a la contraseña madre en
 * memoria del navegador.
 */

export const RP_NAME = "Pime Suite";

const CHALLENGE_COOKIE = "pime_webauthn";
const CHALLENGE_TTL_S = 5 * 60;
const VAULT_TOKEN_TTL_MS = 15 * 60 * 1000;

export type CeremonyPurpose = "register" | "login" | "vault";

interface ChallengePayload {
  c: string;
  p: CeremonyPurpose;
  u: string | null;
  e: number;
}

function secret(): string {
  const s = process.env.PASSKEY_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("Falta PASSKEY_SECRET o SUPABASE_SERVICE_ROLE_KEY");
  return s;
}

function sign(data: string, scope: string): string {
  return createHmac("sha256", secret()).update(`${scope}:${data}`).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * RP ID y origen esperado a partir de la petición. El RP ID es el dominio sin
 * www (www redirige al dominio de la app), así la llave sirve en los dos.
 */
export function relyingParty(request: Request): { rpID: string; origin: string } {
  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  const host = new URL(origin).hostname.replace(/^www\./, "");
  const requestHost = new URL(request.url).hostname.replace(/^www\./, "");
  if (host !== requestHost) throw new Error("Origen no coincide");
  return { rpID: host, origin };
}

export async function setChallenge(challenge: string, purpose: CeremonyPurpose, userId: string | null) {
  const payload: ChallengePayload = {
    c: challenge,
    p: purpose,
    u: userId,
    e: Date.now() + CHALLENGE_TTL_S * 1000,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const store = await cookies();
  store.set(CHALLENGE_COOKIE, `${data}.${sign(data, "challenge")}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/empresa/passkeys",
    maxAge: CHALLENGE_TTL_S,
  });
}

/** Lee y borra el desafío; null si no existe, venció o es de otra ceremonia. */
export async function consumeChallenge(
  purpose: CeremonyPurpose,
  userId: string | null
): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(CHALLENGE_COOKIE)?.value;
  store.delete({ name: CHALLENGE_COOKIE, path: "/api/empresa/passkeys" });
  if (!raw) return null;
  const [data, mac] = raw.split(".");
  if (!data || !mac || !safeEqual(mac, sign(data, "challenge"))) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as ChallengePayload;
    if (payload.e < Date.now() || payload.p !== purpose || payload.u !== userId) return null;
    return payload.c;
  } catch {
    return null;
  }
}

/** Permiso temporal para leer y escribir la bóveda sin volver a pedir la clave. */
export function issueVaultToken(userId: string): string {
  const data = `${userId}.${Date.now() + VAULT_TOKEN_TTL_MS}`;
  return `${data}.${sign(data, "vault")}`;
}

export function verifyVaultToken(token: string, userId: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [uid, exp, mac] = parts;
  if (uid !== userId || Number(exp) < Date.now()) return false;
  return safeEqual(mac, sign(`${uid}.${exp}`, "vault"));
}

/** Nombre legible del dispositivo para la lista de llaves. */
export function deviceNameFromUserAgent(ua: string | null): string {
  const s = ua ?? "";
  if (/iPhone/.test(s)) return "iPhone";
  if (/iPad/.test(s)) return "iPad";
  if (/Android/.test(s)) return "Android";
  if (/Macintosh|Mac OS X/.test(s)) return "Mac";
  if (/Windows/.test(s)) return "Windows";
  return "Dispositivo";
}

/**
 * Verifica la firma de la huella contra la llave pública guardada y actualiza
 * el contador. Devuelve la llave o null si no es válida.
 */
export async function verifyPasskeyAssertion(
  request: Request,
  response: AuthenticationResponseJSON,
  expectedChallenge: string,
  userId?: string
) {
  const passkey = await prisma.passkey.findUnique({
    where: { credentialId: response.id },
    include: { user: { select: { id: true, supabaseUid: true, email: true } } },
  });
  if (!passkey || (userId && passkey.userId !== userId)) return null;

  const { rpID, origin } = relyingParty(request);
  try {
    const { verified, authenticationInfo } = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
      credential: {
        id: passkey.credentialId,
        publicKey: new Uint8Array(Buffer.from(passkey.publicKey, "base64url")),
        counter: passkey.counter,
        transports: passkey.transports,
      },
    });
    if (!verified) return null;
    await prisma.passkey.update({
      where: { id: passkey.id },
      data: { counter: authenticationInfo.newCounter, lastUsedAt: new Date() },
    });
    return passkey;
  } catch {
    return null;
  }
}
