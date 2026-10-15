import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { withEmpresaIdRoute } from "@/app/api/empresa/_route";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { GithubError, parseRepoRef } from "@/lib/github/client";
import { tokenParaRepo } from "@/lib/github/cuentas";
import { describeRepoShort } from "@/lib/github/describe";
import { estadoRepo } from "@/lib/github/estado-repo";
import { buildRepoSnapshot } from "@/lib/github/snapshot";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * El repositorio del proyecto: lo que le permite al sistema aconsejar sobre el
 * código que existe en vez de sobre uno imaginario.
 *
 * Se guarda un snapshot —el mapa del repo, no el código— y ese snapshot entra al
 * contexto de cada reunión del proyecto. Volver a sincronizar es re-leer el
 * mapa; se hace a mano porque un repo activo cambia todos los días y no tiene
 * sentido pagarlo en cada análisis.
 */

export const GET = withEmpresaIdRoute(async (req, { params }) => {
  const user = await requireEmpresaUser(req);
  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { id, userId: user.id },
    select: {
      repoOwner: true,
      repoName: true,
      repoBranch: true,
      repoSnapshot: true,
      repoSyncedAt: true,
      githubAccount: { select: { login: true } },
    },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const cuentas = await prisma.githubAccount.count({ where: { userId: user.id } });

  return NextResponse.json(estadoRepo(project, cuentas > 0 || Boolean(user.githubTokenEnc)));

});

/** Conecta (o vuelve a leer) el repositorio del proyecto. */
export const POST = withEmpresaIdRoute(async (req, { params }) => {
  const user = await requireEmpresaUser(req);
  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { id, userId: user.id },
    select: { id: true, repoOwner: true, repoName: true, repoBranch: true, githubAccountId: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));

  // Sin `repo` en el cuerpo es un re-sync del que ya estaba conectado.
  const ref =
    typeof body.repo === "string" && body.repo.trim()
      ? parseRepoRef(body.repo)
      : project.repoOwner && project.repoName
        ? { owner: project.repoOwner, repo: project.repoName }
        : null;

  if (!ref) {
    return NextResponse.json(
      { error: "Escribe el repositorio como «owner/repo» o pega su URL de GitHub." },
      { status: 400 }
    );
  }

  const branch =
    typeof body.branch === "string" && body.branch.trim()
      ? body.branch.trim()
      : project.repoBranch;

  try {
    const elegido = await tokenParaRepo({ userId: user.id, owner: ref.owner, repo: ref.repo, projectId: id, cuentaId: project.githubAccountId });
    const snapshot = await buildRepoSnapshot(ref.owner, ref.repo, elegido.token, branch);

    await prisma.project.update({
      where: { id },
      data: {
        repoOwner: snapshot.owner,
        repoName: snapshot.repo,
        repoBranch: snapshot.branch,
        repoSnapshot: snapshot as unknown as object,
        repoSyncedAt: new Date(),
      },
    });

    // Repo recién conectado: cada fase recibe su marcador en GitHub y el webhook queda puesto (el avance se mueve solo).
    const marcadores = await import("@/lib/portal/github-marcadores").then((m) => m.prepararMarcadores(id)).catch((e) => ({ error: e instanceof Error ? e.message : "error" }));

    return NextResponse.json({
      ok: true,
      marcadores,
      summary: describeRepoShort(snapshot),
      owner: snapshot.owner,
      repo: snapshot.repo,
      branch: snapshot.branch,
      files: snapshot.totalFiles,
      dataModels: snapshot.dataModels.length,
      docs: snapshot.docs.map((d) => d.path),
      account: elegido.login,
    });
  } catch (err) {
    if (err instanceof GithubError) {
      return NextResponse.json({ error: err.message }, { status: err.status === 404 ? 404 : 400 });
    }
    throw err;
  }
});

/** Desconecta el repositorio. El snapshot se borra con él. */
export const DELETE = withEmpresaIdRoute(async (req, { params }) => {
  const user = await requireEmpresaUser(req);
  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.project.update({
    where: { id },
    data: {
      repoOwner: null,
      repoName: null,
      repoBranch: null,
      // `undefined` le diría a Prisma "no toques la columna"; para vaciarla de
      // verdad hace falta el NULL de base de datos.
      repoSnapshot: Prisma.DbNull,
      repoSyncedAt: null,
      githubAccountId: null,
    },
  });

  return NextResponse.json({ ok: true });
});
