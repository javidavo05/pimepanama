import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sincronizarProyecto } from "@/lib/portal/github-avance";
import { revisarProyecto } from "@/lib/motor/sistemas";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Webhook de GitHub para el avance en vivo. En cada repositorio de cliente:
 * Settings → Webhooks → https://pimepanama.com/api/github/webhook, tipo JSON, secreto
 * GITHUB_WEBHOOK_SECRET, eventos «Issues» y «Milestones». Firma verificada (X-Hub-Signature-256).
 */
export async function POST(request: Request) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook sin configurar" }, { status: 503 });
  const cuerpo = await request.text();
  const firma = request.headers.get("x-hub-signature-256") ?? "";
  const esperada = `sha256=${createHmac("sha256", secret).update(cuerpo).digest("hex")}`;
  if (firma.length !== esperada.length || !timingSafeEqual(Buffer.from(firma), Buffer.from(esperada))) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }
  const evento = request.headers.get("x-github-event");
  if (evento === "ping") return NextResponse.json({ ok: true, pong: true });
  if (evento !== "issues" && evento !== "milestone") return NextResponse.json({ ok: true, ignorado: evento });

  let repo: { name?: string; owner?: { login?: string } } | undefined;
  try { repo = (JSON.parse(cuerpo) as { repository?: typeof repo }).repository; } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  if (!repo?.name || !repo.owner?.login) return NextResponse.json({ ok: true, sinRepo: true });
  const proyectos = await prisma.project.findMany({ where: { repoOwner: { equals: repo.owner.login, mode: "insensitive" }, repoName: { equals: repo.name, mode: "insensitive" } }, select: { id: true } });
  const r = [];
  // Mueve las fases al instante y actualiza el resumen del sistema sin volver a leer todo GitHub.
  for (const p of proyectos) r.push(await sincronizarProyecto(p.id).then(async (x) => { await revisarProyecto(p.id, { github: false, salud: false }); return x; }).catch((e) => ({ error: String(e) })));
  return NextResponse.json({ ok: true, proyectos: proyectos.length, r });
}
