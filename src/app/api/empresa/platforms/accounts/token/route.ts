import { NextResponse } from "next/server";
import { withEmpresaRoute } from "@/app/api/empresa/_route";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { guardarTokenPlataforma, quitarTokenPlataforma } from "@/lib/platforms/cuentas";

export const runtime = "nodejs";

/**
 * Conecta (o reemplaza) el token de una cuenta de Vercel o Supabase. Se verifica contra la API real antes
 * de guardarlo cifrado; la respuesta nunca incluye el token.
 */
export const POST = withEmpresaRoute(async (req) => {
  const user = await requireEmpresaUser(req);
  const body = await req.json().catch(() => ({}));
  const provider = body.provider === "vercel" || body.provider === "supabase" ? body.provider : null;
  if (!provider) return NextResponse.json({ error: "Proveedor inválido." }, { status: 400 });
  const token = typeof body.token === "string" ? body.token : "";
  const email = typeof body.email === "string" && body.email.trim() ? body.email.trim() : null;
  const r = await guardarTokenPlataforma(user.id, provider, token, email);
  if (!r.ok) return NextResponse.json({ error: r.error, necesitaCorreo: r.necesitaCorreo ?? false }, { status: 400 });
  return NextResponse.json(r);
});

/** Quita el token de una cuenta (?id=). La cuenta y su plan se quedan. */
export const DELETE = withEmpresaRoute(async (req) => {
  const user = await requireEmpresaUser(req);
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const ok = await quitarTokenPlataforma(user.id, id);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Esa cuenta ya no existe." }, { status: 404 });
});
