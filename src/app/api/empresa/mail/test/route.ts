import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { testConnection } from "@/lib/mail/imap-sync";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireEmpresaUser(request);
    const { host, port, tls, username, password } = await request.json();
    if (!host || !username || !password) {
      return NextResponse.json({ ok: false, error: "host, username y password son requeridos" }, { status: 400 });
    }
    const result = await testConnection(host, Number(port) || 993, Boolean(tls), username, password);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
