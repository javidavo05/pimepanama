import { NextResponse } from "next/server";
import { verifyRegistrationResponse, type RegistrationResponseJSON } from "@simplewebauthn/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { withEmpresaRoute } from "@/app/api/empresa/_route";
import { prisma } from "@/lib/prisma";
import {
  consumeChallenge,
  deviceNameFromUserAgent,
  relyingParty,
  verifyVaultToken,
} from "@/lib/passkeys";

export const runtime = "nodejs";

/**
 * Guarda la llave pública del dispositivo. Si llega un vaultToken válido (se
 * acaba de abrir la bóveda con la contraseña madre), la llave también abre la
 * bóveda.
 */
export const POST = withEmpresaRoute(async (request) => {
  const user = await requireEmpresaUser(request);
  const body = (await request.json()) as { response: RegistrationResponseJSON; vaultToken?: string };
  const expectedChallenge = await consumeChallenge("register", user.id);
  if (!expectedChallenge) {
    return NextResponse.json({ error: "El registro venció. Inténtalo de nuevo." }, { status: 400 });
  }

  const { rpID, origin } = relyingParty(request);
  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
  } catch {
    return NextResponse.json({ error: "No se pudo verificar la huella." }, { status: 400 });
  }
  if (!verification.verified) {
    return NextResponse.json({ error: "No se pudo verificar la huella." }, { status: 400 });
  }

  const { credential } = verification.registrationInfo;
  const vaultAccess = Boolean(body.vaultToken && verifyVaultToken(body.vaultToken, user.id));
  const passkey = await prisma.passkey.create({
    data: {
      userId: user.id,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString("base64url"),
      counter: credential.counter,
      transports: credential.transports ?? [],
      name: deviceNameFromUserAgent(request.headers.get("user-agent")),
      vaultAccess,
    },
    select: { id: true, name: true, vaultAccess: true, lastUsedAt: true, createdAt: true },
  });

  return NextResponse.json({ passkey });
});
