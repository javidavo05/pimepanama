import { NextResponse } from "next/server";
import { resolveSigningToken } from "@/lib/pimesign/workflow";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const resolved = await resolveSigningToken(token);
    if (!resolved) {
      return NextResponse.json({ error: "Enlace inválido" }, { status: 404 });
    }

    if ("expired" in resolved) {
      return NextResponse.json({ error: "Enlace expirado", expired: true }, { status: 410 });
    }
    if ("used" in resolved) {
      return NextResponse.json({ error: "Enlace ya utilizado", used: true }, { status: 410 });
    }

    const { record } = resolved;
    const req = record.request;

    return NextResponse.json({
      role: record.role,
      status: req.status,
      contractTitle: req.contract.title,
      companyName: req.companyName,
      clientName: req.clientName,
      signerLabel: record.role === "CLIENT" ? req.clientName : req.companyName,
      expiresAt: req.expiresAt.toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
