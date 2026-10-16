import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { equipoDeLaEmpresa } from "@/lib/auth/equipo-lista";
import { puedeVer } from "@/lib/auth/permisos";

export const runtime = "nodejs";

/**
 * Lo que el panel de tareas necesita saber del equipo: a quién se le puede asignar una tarea, quién entró
 * (para «Mis tareas» y el responsable por defecto) y qué vínculos del CRM puede buscar según su área.
 */
export async function GET(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    const equipo = await equipoDeLaEmpresa(user.id);
    return NextResponse.json({
      equipo,
      miembroId: user.miembro.id,
      puede: { leads: puedeVer(user.miembro.area, "leads"), oportunidades: puedeVer(user.miembro.area, "ventas") },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
