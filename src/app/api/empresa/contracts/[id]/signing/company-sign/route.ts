import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { applyCompanySignatureFromPanel } from "@/lib/pimesign/workflow";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireEmpresaUser(request);
    const body = (await request.json()) as {
      signatureDataUrl?: string;
      accepted?: boolean;
      signerName?: string;
    };

    if (!body.signatureDataUrl) {
      return NextResponse.json({ error: "Firma requerida" }, { status: 400 });
    }

    const result = await applyCompanySignatureFromPanel({
      contractId: id,
      userId: user.id,
      signatureDataUrl: body.signatureDataUrl,
      accepted: body.accepted ?? true,
      signerName: body.signerName,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof Response) return err;
    const message = err instanceof Error ? err.message : "Error al firmar";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
