/**
 * Enlaza las plataformas sin cliente con su cliente por coincidencia de nombre, solo si es inequívoca
 * (un único cliente coincide). También su proyecto, si uno solo de ese cliente coincide. El resto queda
 * «Sin cliente» para asignarlo desde Platforms. Idempotente: no toca las que ya tienen cliente.
 *
 *   node --env-file=.env.local --import tsx scripts/platforms-enlazar-clientes.ts            # aplica
 *   node --env-file=.env.local --import tsx scripts/platforms-enlazar-clientes.ts --dry-run  # solo muestra
 */
import { PrismaClient } from "@prisma/client";
import { clienteInequivoco, mejorCoincidencia } from "../src/lib/platforms/enlazar";

const prisma = new PrismaClient();
const dry = process.argv.includes("--dry-run");

async function main() {
  const [platforms, clients, projects] = await Promise.all([
    prisma.platform.findMany({ where: { clientId: null }, select: { id: true, name: true, userId: true } }),
    prisma.client.findMany({ where: { archivedAt: null }, select: { id: true, name: true, company: true, userId: true } }),
    prisma.project.findMany({ select: { id: true, name: true, userId: true, clientId: true, clients: { select: { clientId: true } } } }),
  ]);
  let enlazadas = 0;
  for (const p of platforms) {
    const c = clienteInequivoco(p.name, clients.filter((x) => x.userId === p.userId));
    if (!c) {
      console.log(`  · ${p.name}: sin coincidencia clara`);
      continue;
    }
    const delCliente = projects.filter((x) => x.userId === p.userId && (x.clientId === c.id || x.clients.some((k) => k.clientId === c.id)));
    const proj = mejorCoincidencia([p.name], delCliente, (x) => x.name);
    console.log(`  ✓ ${p.name} → ${c.company || c.name}${proj ? ` · ${proj.name}` : ""}`);
    enlazadas++;
    if (!dry) await prisma.platform.update({ where: { id: p.id }, data: { clientId: c.id, projectId: proj?.id ?? null } });
  }
  console.log(`\n${dry ? "(simulación) " : ""}${enlazadas} de ${platforms.length} plataformas enlazadas.`);
}

main().finally(() => prisma.$disconnect());
