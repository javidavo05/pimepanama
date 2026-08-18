import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { cancelBooking } from "@/lib/pimebook/book";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireEmpresaUser(request);
    const { id } = await params;
    const body = (await request.json()) as { action?: string };

    if (body.action === "cancel") {
      await cancelBooking(id, user.id);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
  } catch (err) {
    if (err instanceof Response) return err;
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
