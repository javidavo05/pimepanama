import { after, NextResponse } from "next/server";
import { withEmpresaRoute } from "@/app/api/empresa/_route";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { requireDeviceUser } from "@/lib/devices/tokens";
import { puedeVer } from "@/lib/auth/permisos";
import { prisma } from "@/lib/prisma";
import { aplicarCredenciales, analizarCredenciales, ErrorCredenciales, type Destino } from "@/lib/credenciales/vincular";
import { verificarFases } from "@/lib/credenciales/verificar-fases";
import { prepararMarcadores } from "@/lib/portal/github-marcadores";
import { revisarProyecto } from "@/lib/motor/sistemas";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Pegar credenciales (2026-10-17). Lo llama la pantalla /empresa/platforms/credenciales con la sesión, y la skill
 * pime-project-preflight desde Claude Code con la llave del dispositivo (Bearer pmg_…, la de PIME Guard).
 *
 * accion: "analizar" (texto) · "aplicar" (texto + destino) · "verificar" (projectId) · "reparar" (projectId:
 * crea los marcadores que faltan y vuelve a verificar). Ningún token vuelve en la respuesta.
 */
async function quien(req: Request): Promise<string> {
  if ((req.headers.get("authorization") ?? "").startsWith("Bearer ")) {
    const u = await requireDeviceUser(req);
    if (!u.activo || !puedeVer(u.ownerId ? u.area : "dueno", "sistemas")) {
      throw NextResponse.json({ error: "Tu área del equipo no tiene acceso a los sistemas." }, { status: 403 });
    }
    // Un miembro trabaja sobre los datos del dueño (migración 0056).
    return u.ownerId ?? u.id;
  }
  return (await requireEmpresaUser(req)).id;
}

const MAX_TEXTO = 40_000;

export const POST = withEmpresaRoute(async (req) => {
  const userId = await quien(req);
  const body = (await req.json().catch(() => ({}))) as { accion?: string; texto?: unknown; destino?: Destino; projectId?: unknown };
  const texto = String(body.texto ?? "").slice(0, MAX_TEXTO);
  const projectId = String(body.projectId ?? "").trim();

  try {
    switch (body.accion) {
      case "analizar":
        return NextResponse.json(await analizarCredenciales(userId, texto));
      case "aplicar": {
        const r = await aplicarCredenciales(userId, texto, body.destino ?? {});
        // Primera revisión del sistema (salud, GitHub, avance) sin hacer esperar.
        after(() => revisarProyecto(r.projectId).then(() => undefined).catch((e) => console.error("[credenciales] revisar", e)));
        return NextResponse.json(r);
      }
      case "verificar":
      case "reparar": {
        if (!projectId || !(await prisma.project.findFirst({ where: { id: projectId, userId }, select: { id: true } }))) {
          return NextResponse.json({ error: "Ese proyecto no existe." }, { status: 404 });
        }
        let reparado: Awaited<ReturnType<typeof prepararMarcadores>> | null = null;
        if (body.accion === "reparar") reparado = await prepararMarcadores(projectId);
        return NextResponse.json({ verificacion: await verificarFases(userId, projectId), reparado });
      }
      default:
        return NextResponse.json({ error: "Acción desconocida." }, { status: 400 });
    }
  } catch (e) {
    if (e instanceof ErrorCredenciales) return NextResponse.json({ error: e.message }, { status: 400 });
    if (e instanceof Error && body.accion === "reparar") return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
});
