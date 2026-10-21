import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { pdfDePropuesta } from "@/lib/leads/respuestas";
import { PropuestaError } from "@/lib/leads/propuesta-prospecto";

export const runtime = "nodejs";
// La primera vez la IA redacta la propuesta: puede tardar unos segundos.
export const maxDuration = 60;

/** La propuesta en PDF de una respuesta a un lead. `?inline=1` la abre en el navegador. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireEmpresaUser(request);
    const { id } = await params;
    const { pdf, nombre } = await pdfDePropuesta({ userId: user.id, supabaseUid: user.supabaseUid, id });
    const inline = new URL(request.url).searchParams.get("inline") === "1";
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${nombre}"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    if (err instanceof PropuestaError) return NextResponse.json({ error: err.message }, { status: 502 });
    if (err instanceof Error && err.message === "No encontré esa respuesta.") return NextResponse.json({ error: err.message }, { status: 404 });
    console.error("[respuestas] pdf", err);
    return NextResponse.json({ error: "No se pudo armar el PDF." }, { status: 500 });
  }
}
