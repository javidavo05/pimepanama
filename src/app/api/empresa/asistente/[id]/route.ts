import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { cancelarAccion, confirmarAccion, deshacerAccion } from "@/lib/asistente/acciones";

/** Confirmar, cancelar o deshacer lo que propuso o hizo el asistente. */
export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireEmpresaUser(request);
    const { id } = await params;
    const { accion } = (await request.json().catch(() => ({}))) as { accion?: string };
    if (accion === "confirmar") {
      const a = await confirmarAccion(user, id);
      ["/empresa", "/empresa/tareas", "/empresa/dinero", "/empresa/facturas", "/empresa/clientes", "/empresa/proyectos", "/empresa/cuentas-por-cobrar"].forEach((p) => revalidatePath(p, "layout"));
      return NextResponse.json({ estado: a.status, href: a.resultHref });
    }
    if (accion === "cancelar") { await cancelarAccion(user.id, id); return NextResponse.json({ estado: "cancelada" }); }
    if (accion === "deshacer") { await deshacerAccion(user.id, id); revalidatePath("/empresa", "layout"); return NextResponse.json({ estado: "deshecha" }); }
    return NextResponse.json({ error: "Acción desconocida." }, { status: 400 });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: err instanceof Error ? err.message : "No se pudo." }, { status: 400 });
  }
}
