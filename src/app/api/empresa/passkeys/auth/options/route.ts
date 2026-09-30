import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { withEmpresaRoute } from "@/app/api/empresa/_route";
import { prisma } from "@/lib/prisma";
import { relyingParty, setChallenge } from "@/lib/passkeys";

export const runtime = "nodejs";

/**
 * Opciones para pedir la huella.
 * - login: pública, sin lista de llaves (el dispositivo ofrece la suya).
 * - vault: con sesión; solo las llaves del usuario. También sirve para
 *   vincular a la bóveda una llave que ya existe en este dispositivo.
 */
export const POST = withEmpresaRoute(async (request) => {
  const body = (await request.json().catch(() => ({}))) as { purpose?: string };
  const purpose = body.purpose === "vault" ? "vault" : "login";
  const { rpID } = relyingParty(request);

  if (purpose === "login") {
    const options = await generateAuthenticationOptions({ rpID, userVerification: "required" });
    await setChallenge(options.challenge, "login", null);
    return NextResponse.json(options);
  }

  const user = await requireEmpresaUser(request);
  const passkeys = await prisma.passkey.findMany({
    where: { userId: user.id },
    select: { credentialId: true, transports: true },
  });
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
    allowCredentials: passkeys.map((p) => ({ id: p.credentialId, transports: p.transports })),
  });
  await setChallenge(options.challenge, "vault", user.id);
  return NextResponse.json(options);
});
