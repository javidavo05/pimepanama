import { NextResponse } from "next/server";
import { withEmpresaRoute } from "@/app/api/empresa/_route";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { encryptGithubToken } from "@/lib/github/client";

export const runtime = "nodejs";

/**
 * El token de GitHub del usuario, cifrado con la misma clave que las
 * contraseñas de correo.
 *
 * Vive en el usuario y no en el proyecto porque un PAT sirve para todos sus
 * repositorios: pedirlo una vez por proyecto sería repetir el mismo secreto en
 * varios sitios. Nunca se devuelve al cliente — solo si existe o no.
 */

export const GET = withEmpresaRoute(async (req) => {
  const user = await requireEmpresaUser(req);
  return NextResponse.json({ connected: Boolean(user.githubTokenEnc) });
});

export const POST = withEmpresaRoute(async (req) => {
  const user = await requireEmpresaUser(req);
  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token.trim() : "";

  if (!token) {
    return NextResponse.json({ error: "Pega el token de GitHub." }, { status: 400 });
  }

  // Se comprueba contra GitHub antes de guardarlo: un token inválido guardado en
  // silencio se descubre en el peor momento, sincronizando justo antes de una
  // reunión.
  const res = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "pime-suite",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json(
      {
        error:
          "GitHub rechazó ese token. Debe tener permiso de lectura de repositorios y no estar caducado.",
      },
      { status: 400 }
    );
  }

  const account = (await res.json()) as { login?: string };

  await prisma.empresaUser.update({
    where: { id: user.id },
    data: { githubTokenEnc: encryptGithubToken(token) },
  });

  return NextResponse.json({ ok: true, login: account.login ?? null });
});

export const DELETE = withEmpresaRoute(async (req) => {
  const user = await requireEmpresaUser(req);
  await prisma.empresaUser.update({
    where: { id: user.id },
    data: { githubTokenEnc: null },
  });
  return NextResponse.json({ ok: true });
});
