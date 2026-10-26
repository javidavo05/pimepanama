import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { conversar, type Mensaje } from "@/lib/asistente/conversar";
import { cerebroDeLaPlataforma } from "@/lib/ai/cerebro";

/** Asistente de Pime Suite: una vuelta de conversación. Hace al instante lo chico y deja propuesto lo grande. */
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    const body = (await request.json().catch(() => ({}))) as { mensajes?: Mensaje[] };
    const mensajes = (body.mensajes ?? []).filter((m) => (m.rol === "usuario" || m.rol === "asistente") && typeof m.texto === "string" && m.texto.trim()).slice(-20);
    if (!mensajes.length || mensajes[mensajes.length - 1].rol !== "usuario") return NextResponse.json({ error: "Escribe o dicta lo que necesitas." }, { status: 400 });
    const cerebro = await cerebroDeLaPlataforma();
    if (!cerebro) return NextResponse.json({ error: "Falta la llave de IA en el servidor." }, { status: 503 });
    const r = await conversar(user, mensajes, cerebro);
    const rutas = ["/empresa", "/empresa/tareas", "/empresa/dinero", "/empresa/facturas", "/empresa/clientes", "/empresa/proyectos", "/empresa/cuentas-por-cobrar"];
    if (r.acciones.some((a) => a.estado === "hecha")) rutas.forEach((x) => revalidatePath(x, "layout"));
    return NextResponse.json(r);
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[asistente]", err);
    return NextResponse.json({ error: "El asistente no pudo responder. Intenta otra vez." }, { status: 500 });
  }
}
