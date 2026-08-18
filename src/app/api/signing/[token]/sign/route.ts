import { NextResponse } from "next/server";
import { applySignatureFromToken, declineSigning } from "@/lib/pimesign/workflow";

export const runtime = "nodejs";

function clientMeta(request: Request) {
  return {
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
    userAgent: request.headers.get("user-agent") ?? undefined,
  };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = (await request.json()) as {
      signatureDataUrl?: string;
      accepted?: boolean;
      signerName?: string;
    };

    if (!body.signatureDataUrl) {
      return NextResponse.json({ error: "Firma requerida" }, { status: 400 });
    }

    const result = await applySignatureFromToken({
      rawToken: token,
      signatureDataUrl: body.signatureDataUrl,
      accepted: body.accepted ?? false,
      signerName: body.signerName,
      ...clientMeta(request),
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al firmar";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = (await request.json().catch(() => ({}))) as { reason?: string };
    await declineSigning({ rawToken: token, reason: body.reason, ...clientMeta(request) });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
