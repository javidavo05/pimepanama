import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { withEmpresaRoute } from "@/app/api/empresa/_route";
import { prisma } from "@/lib/prisma";
import { RP_NAME, relyingParty, setChallenge } from "@/lib/passkeys";

export const runtime = "nodejs";

/** Opciones para registrar la huella de este dispositivo. */
export const POST = withEmpresaRoute(async (request) => {
  const user = await requireEmpresaUser(request);
  const { rpID } = relyingParty(request);
  const existing = await prisma.passkey.findMany({
    where: { userId: user.id },
    select: { credentialId: true, transports: true },
  });

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID,
    userName: user.email,
    userDisplayName: user.fullName ?? user.email,
    userID: new TextEncoder().encode(user.id),
    attestationType: "none",
    // Un dispositivo ya registrado responde con error y el cliente pasa a
    // vincularlo por autenticación en lugar de duplicarlo.
    excludeCredentials: existing.map((p) => ({ id: p.credentialId, transports: p.transports })),
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "required",
    },
  });

  await setChallenge(options.challenge, "register", user.id);
  return NextResponse.json(options);
});
