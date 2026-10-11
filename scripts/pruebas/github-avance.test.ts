/** Sincronización de avance desde GitHub con respuestas simuladas, contra la base real. Limpia al final. */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { sincronizarProyecto } from "../../src/lib/portal/github-avance";

const prisma = new PrismaClient();
let clientId = "";
after(async () => {
  if (clientId) { await prisma.project.deleteMany({ where: { clientId } }); await prisma.client.delete({ where: { id: clientId } }).catch(() => {}); }
  await prisma.$disconnect();
});

test("milestone al 60 % mueve la fase y cuenta cada issue una sola vez", async () => {
  const owner = await prisma.empresaUser.findFirstOrThrow({ orderBy: { createdAt: "asc" } });
  const c = await prisma.client.create({ data: { userId: owner.id, name: "[prueba] GitHub" } });
  clientId = c.id;
  const p = await prisma.project.create({ data: { userId: owner.id, clientId, name: "[prueba] Repo", repoOwner: "prueba-org", repoName: "prueba-repo" } });
  const f = await prisma.projectPhase.create({ data: { projectId: p.id, name: "Reportes", githubMilestone: 3, price: 1000 } });

  const original = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL) => {
    const u = String(url);
    const body = u.includes("/milestones")
      ? [{ number: 3, title: "Reportes", state: "open", open_issues: 2, closed_issues: 3 }]
      : [
          { number: 11, title: "Filtro por vendedor", closed_at: "2026-10-10T10:00:00Z", html_url: "" },
          { number: 12, title: "Exportar a Excel", closed_at: "2026-10-10T11:00:00Z", html_url: "" },
          { number: 13, title: "PR interno", closed_at: "2026-10-10T12:00:00Z", html_url: "", pull_request: {} },
        ];
    return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  try {
    const r1 = await sincronizarProyecto(p.id);
    assert.deepEqual(r1, { fases: 1, issues: 2 });
    const fase = await prisma.projectPhase.findUniqueOrThrow({ where: { id: f.id } });
    assert.equal(Number(fase.progress), 60);
    assert.equal(fase.status, "en_curso");
    assert.equal(fase.progressSource, "github");
    const r2 = await sincronizarProyecto(p.id);
    assert.equal(r2.issues, 0, "los mismos issues no se cuentan dos veces");
    const eventos = await prisma.activityEvent.count({ where: { clientId, actorType: "github", visibility: "cliente" } });
    assert.equal(eventos, 2);
  } finally {
    globalThis.fetch = original;
    await prisma.activityEvent.deleteMany({ where: { clientId } });
  }
});
