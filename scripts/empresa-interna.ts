/**
 * Crea la empresa interna «Pime Panamá» (Client.internal, migración 0048) con los productos propios como
 * proyectos y enlaza sus plataformas. Idempotente: si ya existe algo, lo reutiliza y no lo duplica; no pisa
 * plataformas que ya tengan otro cliente.
 *
 *   node --env-file=.env.local --import tsx scripts/empresa-interna.ts            # aplica
 *   node --env-file=.env.local --import tsx scripts/empresa-interna.ts --dry-run  # solo muestra
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const dry = process.argv.includes("--dry-run");

/** Producto → plataformas (por nombre exacto en Platforms). */
const PRODUCTOS: { nombre: string; plataformas: string[] }[] = [
  { nombre: "AcademyX", plataformas: ["Academyx", "Academyx NEW"] },
  { nombre: "CifraApp", plataformas: ["Cifraapp"] },
  { nombre: "GodMode", plataformas: ["Godmode", "GodmodeNew"] },
  { nombre: "Blei y Davo", plataformas: ["Blei y Davo"] },
  { nombre: "Smart Church", plataformas: ["Smart-church"] },
  { nombre: "Sitio y suite Pime", plataformas: ["Pimepanama"] },
];
/**
 * Plataformas de la empresa cuyo producto no es claro: van con la empresa interna pero sin proyecto.
 * «Church Saas» (churchsaas.vercel.app) puede ser Smart Church, pero ni su nombre ni su dirección lo
 * confirman: se deja para enlazarla a mano desde Platforms.
 */
const SOLO_CLIENTE = ["Church Saas"];

async function main() {
  const owner = await prisma.empresaUser.findFirst({ where: { email: "javidavo05@gmail.com" }, select: { id: true } });
  if (!owner) throw new Error("No encontré al usuario dueño.");
  const userId = owner.id;
  const cfg = await prisma.companyConfig.findFirst({ select: { ruc: true, phone: true, email: true, address: true, city: true, country: true } });

  let cliente = await prisma.client.findFirst({ where: { userId, internal: true }, select: { id: true, name: true } });
  if (!cliente) {
    console.log("+ Cliente interno «Pime Panamá»");
    cliente = dry
      ? { id: "(nuevo)", name: "Pime Panamá" }
      : await prisma.client.create({
          data: {
            userId, name: "Pime Panamá", internal: true, portalEnabled: false, brandLine: "normal",
            ruc: cfg?.ruc || null, phone: cfg?.phone || null, email: cfg?.email || null, address: cfg?.address || null,
            city: cfg?.city || null, country: cfg?.country || "Panamá",
            notes: "Empresa interna: nuestros productos. No suma a cobros ni ingresos y no tiene cuenta de cliente.",
          },
          select: { id: true, name: true },
        });
  } else console.log(`= Cliente interno ya existe: ${cliente.id}`);

  const plataformas = await prisma.platform.findMany({ where: { userId }, select: { id: true, name: true, clientId: true, projectId: true, githubRepo: true, githubAccountId: true } });
  const libre = (p: { clientId: string | null }) => !p.clientId || p.clientId === cliente!.id;

  for (const prod of PRODUCTOS) {
    let proyecto = dry && cliente.id === "(nuevo)" ? null : await prisma.project.findFirst({ where: { userId, name: prod.nombre, OR: [{ clientId: cliente.id }, { clients: { some: { clientId: cliente.id } } }] }, select: { id: true, repoOwner: true, repoName: true } });
    if (!proyecto) {
      console.log(`+ Proyecto ${prod.nombre}`);
      if (!dry) {
        proyecto = await prisma.project.create({
          data: { userId, name: prod.nombre, clientId: cliente.id, status: "ACTIVE", kind: "soporte", portalVisible: false, description: "Producto propio de Pime Panamá.", clients: { create: { clientId: cliente.id } } },
          select: { id: true, repoOwner: true, repoName: true },
        });
      }
    } else console.log(`= Proyecto ${prod.nombre} ya existe`);

    for (const nombre of prod.plataformas) {
      const pl = plataformas.find((x) => x.name === nombre);
      if (!pl) { console.log(`  ! plataforma «${nombre}» no existe`); continue; }
      if (!libre(pl)) { console.log(`  · «${nombre}» ya tiene otro cliente: no se toca`); continue; }
      console.log(`  → «${nombre}» → ${prod.nombre}`);
      if (!dry && proyecto) {
        await prisma.platform.update({ where: { id: pl.id }, data: { clientId: cliente.id, projectId: proyecto.id } });
        // El repo de la plataforma pasa al proyecto si este todavía no tiene uno.
        const [owner2, repo] = pl.githubRepo?.split("/") ?? [];
        if (owner2 && repo && !proyecto.repoOwner) {
          await prisma.project.update({ where: { id: proyecto.id }, data: { repoOwner: owner2, repoName: repo, githubAccountId: pl.githubAccountId } });
          proyecto = { ...proyecto, repoOwner: owner2, repoName: repo };
          console.log(`    repo ${pl.githubRepo}`);
        }
      }
    }
  }

  for (const nombre of SOLO_CLIENTE) {
    const pl = plataformas.find((x) => x.name === nombre);
    if (!pl || !libre(pl)) continue;
    console.log(`  → «${nombre}» → solo la empresa interna (sin proyecto: producto no confirmado)`);
    if (!dry) await prisma.platform.update({ where: { id: pl.id }, data: { clientId: cliente.id } });
  }
  console.log(`\n${dry ? "(simulación) " : ""}Cliente interno: ${cliente.id}`);
}

main().finally(() => prisma.$disconnect());
