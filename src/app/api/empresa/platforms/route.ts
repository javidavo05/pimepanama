import { after, NextResponse } from "next/server";
import { withEmpresaRoute } from "@/app/api/empresa/_route";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { ensurePlatformsSeeded } from "@/lib/platforms-bootstrap";
import { datosDePlataforma, DatosInvalidos, serializarPlataforma } from "@/lib/platforms/datos";
import { revisarProyecto } from "@/lib/motor/sistemas";

const corto = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/**
 * El asistente puede pedir crear el cliente y el proyecto en el mismo paso (nuevoCliente / nuevoProyecto), así
 * el proceso se termina sin salir a otra pantalla. El proyecto nuevo queda ligado a su cliente.
 */
async function crearClienteYProyecto(userId: string, body: Record<string, unknown>) {
  const nc = body.nuevoCliente as { name?: unknown; email?: unknown } | undefined;
  if (nc) {
    const name = corto(nc.name, 120);
    if (!name) throw new DatosInvalidos("Escribe el nombre del cliente nuevo.");
    const email = corto(nc.email, 160) || null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new DatosInvalidos("El correo del cliente no es válido.");
    const c = await prisma.client.create({ data: { userId, name, company: name, email }, select: { id: true } });
    body.clientId = c.id;
  }
  const np = body.nuevoProyecto as { name?: unknown } | undefined;
  if (np) {
    const name = corto(np.name, 160) || corto(body.name, 160);
    if (!name) throw new DatosInvalidos("Escribe el nombre del proyecto nuevo.");
    const clientId = corto(body.clientId, 64) || null;
    if (clientId && !(await prisma.client.findFirst({ where: { id: clientId, userId }, select: { id: true } }))) throw new DatosInvalidos("Ese cliente no existe.");
    const pr = await prisma.project.create({
      data: { userId, name, clientId, status: "ACTIVE", ...(clientId ? { clients: { create: [{ clientId }] } } : {}) },
      select: { id: true },
    });
    body.projectId = pr.id;
  }
}

/** Plataforma ligada a un proyecto sin repo: el proyecto toma el repo, así el motor lo revisa y mueve sus fases. */
async function ligarRepoAlProyecto(userId: string, projectId: string | null, githubRepo: string | null, githubAccountId: string | null) {
  if (!projectId || !githubRepo) return;
  const [owner, repo] = githubRepo.split("/");
  await prisma.project.updateMany({ where: { id: projectId, userId, repoName: null }, data: { repoOwner: owner, repoName: repo, githubAccountId } });
}

export const runtime = "nodejs";

export const GET = withEmpresaRoute(async (req) => {
  const user = await requireEmpresaUser(req);
  await ensurePlatformsSeeded(user.id);
  const platforms = await prisma.platform.findMany({ where: { userId: user.id }, orderBy: { sortOrder: "asc" } });
  return NextResponse.json(platforms.map(serializarPlataforma));
});

/** Crea una plataforma con todo lo del asistente: cliente, proyecto, repo, Vercel, Supabase y accesos. */
export const POST = withEmpresaRoute(async (req) => {
  const user = await requireEmpresaUser(req);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (!String(body.name ?? "").trim()) return NextResponse.json({ error: "Ponle un nombre a la plataforma." }, { status: 400 });
  try {
    await crearClienteYProyecto(user.id, body);
    const [data, maxOrder] = await Promise.all([
      datosDePlataforma(user.id, body),
      prisma.platform.aggregate({ where: { userId: user.id }, _max: { sortOrder: true } }),
    ]);
    const platform = await prisma.platform.create({
      data: { ...data, name: String(data.name), userId: user.id, sortOrder: (maxOrder._max.sortOrder ?? -1) + 1 },
    });
    await ligarRepoAlProyecto(user.id, platform.projectId, platform.githubRepo, platform.githubAccountId);
    // Primera revisión del sistema (salud, GitHub) sin hacer esperar al asistente.
    if (platform.projectId) { const pid = platform.projectId; after(() => revisarProyecto(pid).then(() => undefined).catch((e) => console.error("[platforms] revisar", e))); }
    return NextResponse.json(serializarPlataforma(platform), { status: 201 });
  } catch (e) {
    if (e instanceof DatosInvalidos) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
});
