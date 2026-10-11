import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { conversar, type Mensaje } from "@/lib/asistente/conversar";

/** Asistente de Pime Suite: una vuelta de conversación. Escribir siempre pasa por una propuesta confirmada. */
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    const body = (await request.json().catch(() => ({}))) as { mensajes?: Mensaje[] };
    const mensajes = (body.mensajes ?? []).filter((m) => (m.rol === "usuario" || m.rol === "asistente") && typeof m.texto === "string" && m.texto.trim()).slice(-20);
    if (!mensajes.length || mensajes[mensajes.length - 1].rol !== "usuario") return NextResponse.json({ error: "Escribe o dicta lo que necesitas." }, { status: 400 });
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "Falta la llave de IA en el servidor." }, { status: 503 });
    const r = await conversar({ id: user.id, supabaseUid: user.supabaseUid, fullName: user.fullName ?? null }, mensajes);
    return NextResponse.json(r);
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[asistente]", err);
    return NextResponse.json({ error: "El asistente no pudo responder. Intenta otra vez." }, { status: 500 });
  }
}
