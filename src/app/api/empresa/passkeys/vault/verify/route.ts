import { NextResponse } from "next/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { withEmpresaRoute } from "@/app/api/empresa/_route";
import { prisma } from "@/lib/prisma";
import {
  consumeChallenge,
  issueVaultToken,
  verifyPasskeyAssertion,
  verifyVaultToken,
} from "@/lib/passkeys";

export const runtime = "nodejs";

/**
 * Abre la bóveda con la huella y devuelve un vaultToken de 15 minutos.
 * Con `enableWith` (un vaultToken obtenido con la contraseña madre) vincula a
 * la bóveda una llave de este dispositivo que antes solo servía para entrar.
 */
export const POST = withEmpresaRoute(async (request) => {
  const user = await requireEmpresaUser(request);
  const body = (await request.json()) as {
    response: AuthenticationResponseJSON;
    enableWith?: string;
  };
  const expectedChallenge = await consumeChallenge("vault", user.id);
  if (!expectedChallenge) {
    return NextResponse.json({ error: "La solicitud venció. Inténtalo de nuevo." }, { status: 400 });
  }

  const passkey = await verifyPasskeyAssertion(request, body.response, expectedChallenge, user.id);
  if (!passkey) {
    return NextResponse.json({ error: "No se pudo verificar la huella." }, { status: 401 });
  }

  if (body.enableWith) {
    if (!verifyVaultToken(body.enableWith, user.id)) {
      return NextResponse.json({ error: "Vuelve a desbloquear con la contraseña madre." }, { status: 403 });
    }
    await prisma.passkey.update({ where: { id: passkey.id }, data: { vaultAccess: true } });
  } else if (!passkey.vaultAccess) {
    return NextResponse.json(
      { error: "Esta huella todavía no abre la bóveda. Desbloquea una vez con la contraseña madre." },
      { status: 403 }
    );
  }

  return NextResponse.json({ vaultToken: issueVaultToken(user.id) });
});
