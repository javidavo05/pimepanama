/**
 * Enlaza las reuniones sin proyecto con su proyecto, solo si la coincidencia es inequívoca: el cliente de
 * la reunión tiene un solo proyecto, o el título nombra a un único proyecto (o a su cliente) y nada apunta
 * a otro. Si la reunión no tenía cliente y el proyecto tiene uno solo, también se lo pone. Lo dudoso queda
 * «Sin proyecto» para asignarlo desde /empresa/reuniones. Idempotente: no toca las que ya tienen proyecto.
 *
 *   node --env-file=.env.local --import tsx scripts/reuniones-enlazar-proyectos.ts            # aplica
 *   node --env-file=.env.local --import tsx scripts/reuniones-enlazar-proyectos.ts --dry-run  # solo muestra
 */
import { PrismaClient } from "@prisma/client";
import { sugerirProyecto, type ProyectoCandidato } from "../src/lib/proyectos/sugerir-proyecto";

const prisma = new PrismaClient();
const dry = process.argv.includes("--dry-run");

async function main() {
  const [meetings, projects] = await Promise.all([
    prisma.meeting.findMany({ where: { projectId: null }, select: { id: true, title: true, userId: true, clientId: true, manualContext: true }, orderBy: { meetingDate: "asc" } }),
    prisma.project.findMany({ select: { id: true, name: true, userId: true, clientId: true, client: { select: { name: true, company: true } }, clients: { select: { client: { select: { id: true, name: true, company: true } } } } } }),
  ]);
  const candidatos = projects.map((p) => {
    const cs = p.clients.length ? p.clients.map((c) => c.client) : p.client && p.clientId ? [{ id: p.clientId, ...p.client }] : [];
    return { userId: p.userId, c: { id: p.id, name: p.name, clientIds: cs.map((x) => x.id), clientNames: cs.flatMap((x) => [x.name, x.company].filter((n): n is string => !!n)) } satisfies ProyectoCandidato };
  });

  let enlazadas = 0;
  for (const m of meetings) {
    const delEquipo = candidatos.filter((x) => x.userId === m.userId).map((x) => x.c);
    const s = sugerirProyecto(m, delEquipo);
    const p = s && delEquipo.find((x) => x.id === s.projectId);
    if (!s || !p || !s.inequivoca) {
      console.log(`  · ${m.title}: ${s && p ? `solo sugerencia (${p.name}), se deja para revisar` : "sin coincidencia clara"}`);
      continue;
    }
    const cliente = !m.clientId && p.clientIds.length === 1 ? p.clientIds[0] : undefined;
    console.log(`  ✓ ${m.title} → ${p.name} (${s.motivo})${cliente ? " · y su cliente" : ""}`);
    enlazadas++;
    if (!dry) await prisma.meeting.update({ where: { id: m.id }, data: { projectId: p.id, ...(cliente ? { clientId: cliente } : {}) } });
  }
  console.log(`\n${dry ? "(simulación) " : ""}${enlazadas} de ${meetings.length} reuniones sin proyecto quedaron enlazadas; ${meetings.length - enlazadas} siguen sin proyecto.`);
}

main().finally(() => prisma.$disconnect());
