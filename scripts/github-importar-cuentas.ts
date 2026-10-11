/**
 * Trae al sitio de gestión (/empresa) las cuentas de GitHub que ya usa Git PIME en esta Mac.
 * Los tokens salen de la CLI de GitHub (`gh auth token -u <cuenta>`, igual que Git PIME), se comprueban
 * contra GitHub y se guardan CIFRADOS en GithubAccount. Nunca se imprimen.
 *
 *   node --env-file=.env.local --import tsx scripts/github-importar-cuentas.ts
 *   node --env-file=.env.local --import tsx scripts/github-importar-cuentas.ts --ligar "Nombre del proyecto=owner/repo" ...
 *   ... --solo-revisar   → no guarda nada, solo muestra
 *
 * Al ligar, el proyecto queda con su repo y, si alguna cuenta puede leerlo, con el mapa del repo leído.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { guardarCuenta, tokenParaRepo } from "../src/lib/github/cuentas";
import { buildRepoSnapshot } from "../src/lib/github/snapshot";

const prisma = new PrismaClient();
const soloRevisar = process.argv.includes("--solo-revisar");
const ligar = process.argv.flatMap((a, i, xs) => (a === "--ligar" && xs[i + 1] ? [xs[i + 1]] : []));

type Perfil = { id: string; label: string; githubUser?: string; sshHost?: string };
type Config = { profiles: Perfil[]; mappings: { path: string; profileId: string }[] };

function sh(cmd: string, args: string[], cwd?: string): string | null {
  try { return execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return null; }
}

function cuentasDeLaCli(): string[] {
  let out = "";
  try { execFileSync("gh", ["auth", "status"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); } catch (e) { out = String((e as { stdout?: string; stderr?: string }).stdout ?? "") + String((e as { stderr?: string }).stderr ?? ""); }
  if (!out) out = sh("gh", ["auth", "status"]) ?? "";
  return [...out.matchAll(/account ([A-Za-z0-9-]+)/g)].map((m) => m[1]);
}

/** owner/repo desde el remoto (ssh con alias de Git PIME o https). */
function repoDe(dir: string): string | null {
  const url = sh("git", ["remote", "get-url", "origin"], dir);
  const m = url?.match(/[:/]([^/:]+)\/([^/]+?)(?:\.git)?$/);
  return m ? `${m[1]}/${m[2]}` : null;
}

async function main() {
  const owner = await prisma.empresaUser.findFirstOrThrow({ where: { email: { equals: process.env.PIME_OWNER_EMAIL ?? "javidavo05@gmail.com", mode: "insensitive" } }, select: { id: true, email: true } });
  const cfg = JSON.parse(readFileSync(path.join(homedir(), ".pime-git/config.json"), "utf8")) as Config;

  // 1. Cuentas: las de los perfiles de Git PIME más las que tienen sesión en la CLI.
  const enCli = new Set(cuentasDeLaCli().map((x) => x.toLowerCase()));
  const logins = [...new Set([...cfg.profiles.map((p) => p.githubUser).filter((x): x is string => !!x), ...enCli])];
  console.log(`\n1) Cuentas de GitHub ${soloRevisar ? "(solo revisión)" : "→ guardadas cifradas en /empresa"}`);
  const sinSesion: string[] = [];
  for (const login of logins) {
    const perfil = cfg.profiles.find((p) => p.githubUser?.toLowerCase() === login.toLowerCase());
    const etiqueta = perfil ? `${login} (${perfil.label})` : login;
    const token = enCli.has(login.toLowerCase()) ? sh("gh", ["auth", "token", "-u", login]) : null;
    if (!token) { sinSesion.push(login); console.log(`   ✗ ${etiqueta}: sin sesión en la CLI de GitHub`); continue; }
    if (soloRevisar) { console.log(`   · ${etiqueta}: token disponible`); continue; }
    const r = await guardarCuenta(owner.id, token, "gh-cli");
    console.log(r.ok ? `   ✓ ${etiqueta}: ${r.nueva ? "agregada" : "token renovado"}` : `   ✗ ${etiqueta}: ${r.error}`);
  }
  for (const p of cfg.profiles.filter((p) => !p.githubUser)) console.log(`   ? ${p.label}: el perfil de Git PIME no dice su usuario de GitHub (${p.sshHost})`);

  // 2. Repos que Git PIME tiene en esta Mac.
  console.log("\n2) Repositorios locales de Git PIME");
  const vistos = new Set<string>();
  for (const m of cfg.mappings.filter((m) => !m.path.startsWith("/private/tmp"))) {
    const r = repoDe(m.path);
    if (!r || vistos.has(r)) continue;
    vistos.add(r);
    console.log(`   ${r.padEnd(52)} ${m.path.replace(path.join(homedir(), "Documents/Websites/"), "")}`);
  }

  // 3. Ligar proyectos con su repo.
  if (ligar.length) console.log(`\n3) Proyectos ligados ${soloRevisar ? "(solo revisión)" : ""}`);
  for (const par of ligar) {
    const [nombre, ref] = par.split("=").map((x) => x.trim());
    const [o, n] = (ref ?? "").split("/");
    const proyecto = await prisma.project.findFirst({ where: { userId: owner.id, name: { equals: nombre, mode: "insensitive" } }, select: { id: true, name: true, githubAccountId: true, repoBranch: true } });
    if (!proyecto || !o || !n) { console.log(`   ✗ «${nombre}»: ${proyecto ? "escribe el repo como owner/repo" : "no encontré ese proyecto"}`); continue; }
    if (soloRevisar) { console.log(`   · ${proyecto.name} → ${o}/${n}`); continue; }
    await prisma.project.update({ where: { id: proyecto.id }, data: { repoOwner: o, repoName: n } });
    const t = await tokenParaRepo({ userId: owner.id, owner: o, repo: n, projectId: proyecto.id, cuentaId: proyecto.githubAccountId });
    try {
      const snap = await buildRepoSnapshot(o, n, t.token, proyecto.repoBranch);
      await prisma.project.update({ where: { id: proyecto.id }, data: { repoBranch: snap.branch, repoSnapshot: snap as unknown as object, repoSyncedAt: new Date() } });
      console.log(`   ✓ ${proyecto.name} → ${o}/${n} · leído con ${t.login ?? "sin token"} · ${snap.totalFiles} archivos`);
    } catch (e) {
      console.log(`   ◐ ${proyecto.name} → ${o}/${n} · ligado, pero ninguna cuenta puede leerlo todavía (${e instanceof Error ? e.message : e})`);
    }
  }
  if (sinSesion.length) console.log(`\nPara traer las que faltan: gh auth login (una vez por cuenta) y vuelve a correr este script.\n   Faltan: ${sinSesion.join(", ")}`);
  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e instanceof Error ? e.message : e); await prisma.$disconnect(); process.exit(1); });
