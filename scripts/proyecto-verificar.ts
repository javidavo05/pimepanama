/**
 * Estado de un proyecto verificado con GitHub, en palabras, para definir su avance real.
 *   node --env-file=.env.local --import tsx scripts/proyecto-verificar.ts "Nombre del proyecto"
 *   ... --todos   → todos los proyectos activos con repositorio
 * Guarda la foto en el proyecto (se ve en /empresa). Solo lee de GitHub; no le escribe a nadie.
 */
import { PrismaClient } from "@prisma/client";
import { verificarConGithub } from "../src/lib/motor/verificar-github";

const prisma = new PrismaClient();
const dias = (iso: string) => Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);

async function uno(p: { id: string; name: string; userId: string }) {
  console.log(`\n━━ ${p.name}`);
  try {
    const v = await verificarConGithub(p.userId, p.id);
    console.log(`Repo ${v.repo} · rama ${v.rama} · leído con ${v.cuenta ?? "sin token"}`);
    console.log(v.ultimoCommit ? `Último commit hace ${dias(v.ultimoCommit.fecha)} días: «${v.ultimoCommit.mensaje}» (${v.ultimoCommit.autor})` : "Sin commits en la rama");
    console.log(`Commits: ${v.commits7} en 7 días · ${v.commits30} en 30 días · por semana (8 sem.): ${v.semanas.join(" ")}`);
    console.log(`Issues: ${v.issues.abiertas} abiertas · ${v.issues.cerradas} cerradas · PRs abiertos: ${v.prsAbiertos.length}`);
    if (v.milestones.length) for (const m of v.milestones) { const t = m.abiertas + m.cerradas; console.log(`  Milestone #${m.numero} ${m.titulo}: ${t ? Math.round((m.cerradas / t) * 100) : 0} % (${m.cerradas}/${t}) · ${m.estado}${m.vence ? ` · vence ${m.vence.slice(0, 10)}` : ""}`); }
    else console.log("Sin milestones: el avance por fase no se puede leer solo todavía.");
    if (v.despliegue) console.log(`Último despliegue: ${v.despliegue.entorno} hace ${dias(v.despliegue.fecha)} días`);
    console.log("Recientes:"); for (const c of v.recientes.slice(0, 8)) console.log(`  ${c.fecha.slice(0, 10)} ${c.sha} ${c.mensaje}`);
  } catch (e) {
    console.log(`No se pudo verificar: ${e instanceof Error ? e.message : e}`);
  }
}

(async () => {
  const todos = process.argv.includes("--todos");
  const nombre = process.argv.slice(2).find((a) => !a.startsWith("--"));
  const ps = await prisma.project.findMany({ where: { repoName: { not: null }, ...(todos ? { status: { in: ["ACTIVE", "PAUSED"] } } : { name: { contains: nombre ?? "", mode: "insensitive" } }), NOT: { name: { startsWith: "[prueba]" } } }, select: { id: true, name: true, userId: true } });
  if (!ps.length) console.log("No encontré proyectos con repositorio con ese nombre.");
  for (const p of ps) await uno(p);
  await prisma.$disconnect();
})();
