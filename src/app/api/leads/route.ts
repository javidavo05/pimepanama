// Entrada de leads. El sitio no guarda nada: reenvía al sistema de leads del CMS de la empresa (el mismo
// endpoint que hoy alimenta /empresa/leads), que crea o anexa el lead, avisa por correo y lo prioriza.
// LEADS_API_URL se configura en Vercel; por defecto apunta al CMS en producción.
import { NextResponse } from "next/server";


const DESTINO = process.env.LEADS_API_URL ?? "https://pimepanama.com/api/contact";
const MAX = { name: 120, email: 160, company: 160, phone: 40, message: 5000 };
const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid" }, { status: 400 }); }
  const payload = {
    name: clean(body.name, MAX.name), email: clean(body.email, MAX.email).toLowerCase(), company: clean(body.company, MAX.company),
    phone: clean(body.phone, MAX.phone), message: clean(body.message, MAX.message), locale: body.locale === "en" ? "en" : "es",
  };
  if (!payload.name || !payload.email || !payload.message) return NextResponse.json({ error: "missing" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(payload.email)) return NextResponse.json({ error: "email" }, { status: 400 });
  // En local no se crean leads reales: LEADS_DRY_RUN=1 (en .env.local) solo registra en consola.
  if (process.env.LEADS_DRY_RUN === "1") { console.log("[leads] dry-run", payload); return NextResponse.json({ ok: true, leadId: "dry-run" }); }
  try {
    const r = await fetch(DESTINO, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(15000) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) { console.error("[leads] el CMS rechazó el lead", r.status, data); return NextResponse.json({ error: "upstream" }, { status: 502 }); }
    return NextResponse.json({ ok: true, leadId: data.leadId ?? null });
  } catch (err) {
    console.error("[leads] no se pudo entregar el lead al CMS", err);
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
}
