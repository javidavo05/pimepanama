/**
 * Pegar credenciales y dejar el sistema armado de una vez (pedido de Javier, 2026-10-17). Lo usan la pantalla
 * /empresa/platforms/credenciales y la skill pime-project-preflight desde Claude Code (llave pmg_ del dispositivo):
 *
 *  1. analizar: detecta qué hay en el texto, prueba cada token contra su servicio y propone a qué sistema va
 *     (proyecto por repo, plataforma ya existente, o parecido de nombre; también cotización si no hay proyecto).
 *  2. aplicar: guarda las cuentas (GitHub, Vercel, Supabase) cifradas, crea o completa el cliente, el proyecto
 *     (desde la cotización si se eligió una) y su plataforma, liga repo/Vercel/Supabase, guarda el resto en la
 *     bóveda y corre la segunda verificación de fases ↔ GitHub.
 *
 * Ningún token sale de aquí: las respuestas llevan solo la vista enmascarada.
 */
import { prisma } from "@/lib/prisma";
import { comprobarToken, guardarCuenta, tokenParaRepo } from "@/lib/github/cuentas";
import { guardarTokenPlataforma, listaDeCuenta } from "@/lib/platforms/cuentas";
import { githubRepos, verificarSupabase, verificarVercel, vercelProjects, type SupabaseProjectItem, type VercelProjectItem } from "@/lib/platforms/externo";
import { mejorCoincidencia } from "@/lib/platforms/enlazar";
import { decryptPlatformVault, encryptPlatformVault, hasPlatformVault } from "@/lib/platform-vault-crypto";
import { bloqueDeBoveda, deTipo, detectarCredenciales, enmascarar, NOMBRE_TIPO, type Hallazgo, type TipoCredencial } from "./detectar";
import { verificarFases, type VerificacionFases } from "./verificar-fases";

export type HallazgoVisible = { tipo: TipoCredencial; nombre: string; servicio: string; clave: string | null; vista: string };
export type CuentaVerificada = { proveedor: "github" | "vercel" | "supabase"; vista: string; ok: boolean; cuenta: string | null; error: string | null; yaGuardada: boolean; proyectos: number | null };
export type VercelOpcion = { id: string; name: string; domain: string | null; repo: string | null; cuenta: string };
export type SupabaseOpcion = { ref: string; name: string; status: string; cuenta: string };
export type Sugerencia = { repo: string | null; vercelProjectId: string | null; supabaseRef: string | null; projectId: string | null; clientId: string | null; quoteId: string | null; motivo: string | null };
export type Opciones = {
  clientes: { id: string; name: string }[];
  proyectos: { id: string; name: string; clientId: string | null; repo: string | null }[];
  cotizaciones: { id: string; title: string; number: string | null; clientId: string | null; projectId: string | null }[];
};
export type Analisis = {
  hallazgos: HallazgoVisible[];
  cuentas: CuentaVerificada[];
  repos: string[];
  vercel: VercelOpcion[];
  supabase: SupabaseOpcion[];
  sugerencia: Sugerencia;
  opciones: Opciones;
};

export type Destino = {
  projectId?: string | null;
  clientId?: string | null;
  quoteId?: string | null;
  nuevoCliente?: { name: string; email?: string | null } | null;
  nuevoProyecto?: { name: string } | null;
  repo?: string | null;
  vercelProjectId?: string | null;
  supabaseRef?: string | null;
};
export type ResultadoAplicar = {
  projectId: string;
  projectName: string;
  clientId: string | null;
  platformId: string;
  guardado: string[];
  avisos: string[];
  /** Lo que la skill escribe en .pime/project.json y .claude/settings.local.json. */
  local: { vercelAccount: string | null; vercelProjectId: string | null; vercelOrgId: string | null; supabaseRef: string | null; githubLogin: string | null; repo: string | null };
  verificacion: VerificacionFases;
};

export class ErrorCredenciales extends Error {}

const corto = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const visible = (h: Hallazgo): HallazgoVisible => ({ tipo: h.tipo, nombre: NOMBRE_TIPO[h.tipo], servicio: h.servicio, clave: h.clave, vista: enmascarar(h) });

type Verificadas = {
  github: { h: Hallazgo; login: string | null; error: string | null; repos: string[] }[];
  vercel: { h: Hallazgo; email: string | null; label: string | null; teamId: string | null; error: string | null; proyectos: VercelProjectItem[] }[];
  supabase: { h: Hallazgo; email: string | null; label: string | null; error: string | null; proyectos: SupabaseProjectItem[] }[];
};

const mensaje = (e: unknown) => (e instanceof Error ? e.message : "No se pudo comprobar.");

/** Prueba cada token contra su servicio, en paralelo. Nunca lanza. */
async function verificarTokens(hs: Hallazgo[]): Promise<Verificadas> {
  const [github, vercel, supabase] = await Promise.all([
    Promise.all(deTipo(hs, "github_token").map(async (h) => {
      const c = await comprobarToken(h.valor);
      if (!c.ok) return { h, login: null, error: c.error, repos: [] };
      const repos = await githubRepos(h.valor).then((rs) => rs.map((r) => r.fullName)).catch(() => []);
      return { h, login: c.login, error: null, repos };
    })),
    Promise.all(deTipo(hs, "vercel_token").map(async (h) => {
      try {
        const v = await verificarVercel(h.valor);
        return { h, email: v.email, label: v.label, teamId: v.teamId, error: null, proyectos: await vercelProjects(h.valor, v.teamId).catch(() => []) };
      } catch (e) {
        return { h, email: null, label: null, teamId: null, error: mensaje(e), proyectos: [] };
      }
    })),
    Promise.all(deTipo(hs, "supabase_token").map(async (h) => {
      try {
        const s = await verificarSupabase(h.valor);
        return { h, email: s.email, label: s.label, error: null, proyectos: s.projects };
      } catch (e) {
        return { h, email: null, label: null, error: mensaje(e), proyectos: [] };
      }
    })),
  ]);
  return { github, vercel, supabase };
}

async function opcionesDe(userId: string): Promise<Opciones> {
  const [clientes, proyectos, cotizaciones] = await Promise.all([
    prisma.client.findMany({ where: { userId, archivedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true, company: true } }),
    prisma.project.findMany({ where: { userId, status: { in: ["ACTIVE", "PAUSED"] } }, orderBy: { updatedAt: "desc" }, select: { id: true, name: true, clientId: true, repoOwner: true, repoName: true } }),
    prisma.document.findMany({ where: { userId, type: "COTIZACION", status: { in: ["DRAFT", "SENT", "ACCEPTED"] } }, orderBy: { createdAt: "desc" }, take: 60, select: { id: true, title: true, number: true, clientId: true, projectId: true } }),
  ]);
  return {
    clientes: clientes.map((c) => ({ id: c.id, name: c.company || c.name })),
    proyectos: proyectos.map((p) => ({ id: p.id, name: p.name, clientId: p.clientId, repo: p.repoOwner && p.repoName ? `${p.repoOwner}/${p.repoName}` : null })),
    cotizaciones,
  };
}

/** A qué sistema va todo: lo que el texto dice primero, lo que ya está en Pime después, y el nombre al final. */
async function sugerir(userId: string, hs: Hallazgo[], ver: Verificadas, op: Opciones): Promise<Sugerencia> {
  const vercelTodos = ver.vercel.flatMap((v) => v.proyectos);
  const refs = deTipo(hs, "supabase_ref").map((h) => h.valor);
  const prjs = deTipo(hs, "vercel_project_id").map((h) => h.valor);

  const vercelDetectado = vercelTodos.find((p) => prjs.includes(p.id)) ?? null;
  let repo = deTipo(hs, "repo")[0]?.valor ?? vercelDetectado?.repo ?? null;
  const supabaseRef = refs[0] ?? null;

  const plataformas = await prisma.platform.findMany({
    where: { userId, OR: [...(repo ? [{ githubRepo: { equals: repo, mode: "insensitive" as const } }] : []), ...(supabaseRef ? [{ supabaseProjectRef: supabaseRef }] : []), ...(prjs.length ? [{ vercelProjectId: { in: prjs } }] : [])] },
    select: { projectId: true, clientId: true, githubRepo: true, vercelProjectId: true },
  });
  const plat = plataformas.find((p) => p.projectId) ?? plataformas[0] ?? null;
  repo = repo ?? plat?.githubRepo ?? null;
  const vercel = vercelDetectado ?? (repo ? vercelTodos.find((p) => p.repo?.toLowerCase() === repo!.toLowerCase()) : undefined) ?? (plat?.vercelProjectId ? vercelTodos.find((p) => p.id === plat.vercelProjectId) : undefined) ?? null;

  const base: Sugerencia = { repo, vercelProjectId: vercel?.id ?? null, supabaseRef, projectId: null, clientId: null, quoteId: null, motivo: null };
  const porRepo = repo ? op.proyectos.find((p) => p.repo?.toLowerCase() === repo!.toLowerCase()) : undefined;
  if (porRepo) return { ...base, projectId: porRepo.id, clientId: porRepo.clientId, motivo: `El proyecto ya tiene el repo ${repo}.` };
  if (plat?.projectId) {
    const pr = op.proyectos.find((p) => p.id === plat.projectId);
    if (pr) return { ...base, projectId: pr.id, clientId: pr.clientId ?? plat.clientId, motivo: "Ya hay una plataforma con estas cuentas ligada a ese proyecto." };
  }

  const supabaseNombre = ver.supabase.flatMap((s) => s.proyectos).find((p) => p.ref === supabaseRef)?.name;
  const nombres = [repo?.split("/")[1], vercel?.name, supabaseNombre].filter((n): n is string => !!n);
  const pr = nombres.length ? mejorCoincidencia(nombres, op.proyectos, (p) => p.name) : null;
  if (pr) return { ...base, projectId: pr.id, clientId: pr.clientId, motivo: `El nombre se parece a «${pr.name}».` };
  const cot = nombres.length ? mejorCoincidencia(nombres, op.cotizaciones, (c) => c.title) : null;
  if (cot) return { ...base, quoteId: cot.id, projectId: cot.projectId, clientId: cot.clientId, motivo: `El nombre se parece a la cotización «${cot.title}».` };
  const cli = nombres.length ? mejorCoincidencia(nombres, op.clientes, (c) => c.name) : null;
  if (cli) return { ...base, clientId: cli.id, motivo: `El nombre se parece al cliente «${cli.name}».` };
  return base;
}

export async function analizarCredenciales(userId: string, texto: string): Promise<Analisis> {
  const hs = detectarCredenciales(texto);
  if (!hs.length) throw new ErrorCredenciales("No encontré ninguna credencial en el texto. Pega los tokens tal como te los dieron (un .env, una lista o el chat).");
  const [ver, op, ghGuardadas, ptGuardadas] = await Promise.all([
    verificarTokens(hs),
    opcionesDe(userId),
    prisma.githubAccount.findMany({ where: { userId }, select: { login: true } }),
    prisma.platformAccount.findMany({ where: { userId, tokenEnc: { not: null } }, select: { provider: true, email: true } }),
  ]);
  const ya = (prov: string, email: string | null) => !!email && ptGuardadas.some((a) => a.provider === prov && a.email === email);
  const cuentas: CuentaVerificada[] = [
    ...ver.github.map((g) => ({ proveedor: "github" as const, vista: enmascarar(g.h), ok: !g.error, cuenta: g.login, error: g.error, yaGuardada: ghGuardadas.some((c) => c.login.toLowerCase() === g.login?.toLowerCase()), proyectos: g.error ? null : g.repos.length })),
    ...ver.vercel.map((v) => ({ proveedor: "vercel" as const, vista: enmascarar(v.h), ok: !v.error, cuenta: v.label ?? v.email, error: v.error, yaGuardada: ya("vercel", v.email), proyectos: v.error ? null : v.proyectos.length })),
    ...ver.supabase.map((s) => ({ proveedor: "supabase" as const, vista: enmascarar(s.h), ok: !s.error, cuenta: s.label ?? s.email, error: s.error, yaGuardada: ya("supabase", s.email), proyectos: s.error ? null : s.proyectos.length })),
  ];
  return {
    hallazgos: hs.map(visible),
    cuentas,
    repos: [...new Set(ver.github.flatMap((g) => g.repos))],
    vercel: ver.vercel.flatMap((v) => v.proyectos.map((p) => ({ id: p.id, name: p.name, domain: p.domain, repo: p.repo, cuenta: v.label ?? v.email ?? "Vercel" }))),
    supabase: ver.supabase.flatMap((s) => s.proyectos.map((p) => ({ ref: p.ref, name: p.name, status: p.status, cuenta: s.label ?? s.email ?? "Supabase" }))),
    sugerencia: await sugerir(userId, hs, ver, op),
    opciones: op,
  };
}

/** Proyecto destino: el elegido, el de la cotización (o uno nuevo desde ella), o uno nuevo. */
async function resolverProyecto(userId: string, d: Destino, nombrePorDefecto: string): Promise<{ id: string; name: string; clientId: string | null; creado: boolean }> {
  let clientId = corto(d.clientId, 64) || null;
  if (d.nuevoCliente?.name?.trim()) {
    const name = corto(d.nuevoCliente.name, 120);
    const email = corto(d.nuevoCliente.email, 160) || null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ErrorCredenciales("El correo del cliente nuevo no es válido.");
    clientId = (await prisma.client.create({ data: { userId, name, company: name, email }, select: { id: true } })).id;
  } else if (clientId && !(await prisma.client.findFirst({ where: { id: clientId, userId }, select: { id: true } }))) {
    throw new ErrorCredenciales("Ese cliente no existe.");
  }

  const pid = corto(d.projectId, 64);
  if (pid && !d.nuevoProyecto) {
    const p = await prisma.project.findFirst({ where: { id: pid, userId }, select: { id: true, name: true, clientId: true } });
    if (!p) throw new ErrorCredenciales("Ese proyecto no existe.");
    if (d.quoteId) await prisma.document.updateMany({ where: { id: d.quoteId, userId, projectId: null }, data: { projectId: p.id } });
    return { id: p.id, name: p.name, clientId: p.clientId ?? clientId, creado: false };
  }

  if (d.quoteId) {
    const q = await prisma.document.findFirst({ where: { id: d.quoteId, userId, type: "COTIZACION" }, select: { id: true, title: true, clientId: true, projectId: true } });
    if (!q) throw new ErrorCredenciales("Esa cotización no existe.");
    if (q.projectId && !d.nuevoProyecto) {
      const p = await prisma.project.findFirst({ where: { id: q.projectId, userId }, select: { id: true, name: true, clientId: true } });
      if (p) return { id: p.id, name: p.name, clientId: p.clientId ?? q.clientId, creado: false };
    }
    clientId = clientId ?? q.clientId;
    const name = corto(d.nuevoProyecto?.name, 160) || q.title;
    const p = await prisma.project.create({ data: { userId, name, clientId, status: "ACTIVE", ...(clientId ? { clients: { create: [{ clientId }] } } : {}) }, select: { id: true, name: true } });
    await prisma.document.update({ where: { id: q.id }, data: { projectId: p.id } });
    return { id: p.id, name: p.name, clientId, creado: true };
  }

  if (!d.nuevoProyecto) throw new ErrorCredenciales("Elige a qué proyecto o cotización van estas credenciales.");
  const name = corto(d.nuevoProyecto.name, 160) || nombrePorDefecto;
  if (!name) throw new ErrorCredenciales("Escribe el nombre del proyecto nuevo.");
  const p = await prisma.project.create({ data: { userId, name, clientId, status: "ACTIVE", ...(clientId ? { clients: { create: [{ clientId }] } } : {}) }, select: { id: true, name: true } });
  return { id: p.id, name: p.name, clientId, creado: true };
}

/** Agrega a la bóveda las líneas que no estaban. Nunca devuelve el contenido. */
async function guardarEnBoveda(platformId: string, actual: string | null, bloque: string): Promise<number> {
  if (!bloque) return 0;
  let previo = "";
  if (hasPlatformVault(actual)) {
    try { previo = decryptPlatformVault(actual!); } catch { previo = ""; }
  }
  const nuevas = bloque.split("\n").filter((l) => l.startsWith("#") || !previo.includes(l));
  if (nuevas.filter((l) => !l.startsWith("#")).length === 0) return 0;
  const contenido = [previo.trim(), nuevas.join("\n")].filter(Boolean).join("\n\n");
  await prisma.platform.update({ where: { id: platformId }, data: { confidentialVault: encryptPlatformVault(contenido) } });
  return nuevas.filter((l) => !l.startsWith("#")).length;
}

export async function aplicarCredenciales(userId: string, texto: string, destino: Destino = {}): Promise<ResultadoAplicar> {
  const hs = detectarCredenciales(texto);
  if (!hs.length) throw new ErrorCredenciales("No encontré ninguna credencial en el texto.");
  const guardado: string[] = [];
  const avisos: string[] = [];

  // 1. Cuentas: cada token se guarda cifrado en la cuenta que su servicio dice (no la que se escribe).
  const ghCuentas: { id: string; login: string }[] = [];
  for (const h of deTipo(hs, "github_token")) {
    const r = await guardarCuenta(userId, h.valor);
    if (r.ok) { ghCuentas.push({ id: r.id, login: r.login }); guardado.push(`GitHub: cuenta ${r.login} ${r.nueva ? "guardada" : "actualizada"}`); }
    else avisos.push(`GitHub (${enmascarar(h)}): ${r.error}`);
  }
  const vercelCuentas: { id: string; email: string; label: string | null }[] = [];
  for (const h of deTipo(hs, "vercel_token")) {
    const r = await guardarTokenPlataforma(userId, "vercel", h.valor, null);
    if (r.ok) { vercelCuentas.push({ id: r.id, email: r.email, label: r.label }); guardado.push(`Vercel: cuenta ${r.label ?? r.email} con ${r.proyectos} proyecto${r.proyectos === 1 ? "" : "s"}`); }
    else avisos.push(`Vercel (${enmascarar(h)}): ${r.error}`);
  }
  const supabaseCuentas: { id: string; email: string; label: string | null }[] = [];
  for (const h of deTipo(hs, "supabase_token")) {
    const r = await guardarTokenPlataforma(userId, "supabase", h.valor, deTipo(hs, "email")[0]?.valor ?? null);
    if (r.ok) { supabaseCuentas.push({ id: r.id, email: r.email, label: r.label }); guardado.push(`Supabase: cuenta ${r.label ?? r.email} con ${r.proyectos} proyecto${r.proyectos === 1 ? "" : "s"}`); }
    else avisos.push(`Supabase (${enmascarar(h)}): ${r.error}`);
  }

  // 2. Listas recién leídas (quedaron en caché al guardar): proyectos de Vercel y de Supabase con su cuenta.
  const vercelTodos = (await Promise.all(vercelCuentas.map(async (c) => ((await listaDeCuenta(userId, "vercel", c.id))?.data ?? []).map((p) => ({ ...p, cuenta: c }))))).flat();
  const supabaseTodos = (await Promise.all(supabaseCuentas.map(async (c) => ((await listaDeCuenta(userId, "supabase", c.id))?.data ?? []).map((p) => ({ ...p, cuenta: c }))))).flat();

  // 3. Lo que no se eligió se completa con la sugerencia (así la skill puede aplicar sin preguntar).
  const faltaAlgo = !destino.projectId && !destino.quoteId && !destino.nuevoProyecto;
  const sug = faltaAlgo || destino.repo === undefined || destino.vercelProjectId === undefined || destino.supabaseRef === undefined
    ? await sugerir(userId, hs, {
        github: [],
        vercel: [{ h: hs[0], email: null, label: null, teamId: null, error: null, proyectos: vercelTodos }],
        supabase: [{ h: hs[0], email: null, label: null, error: null, proyectos: supabaseTodos }],
      }, await opcionesDe(userId))
    : null;
  const d: Destino = {
    ...destino,
    repo: destino.repo === undefined ? sug?.repo : destino.repo,
    vercelProjectId: destino.vercelProjectId === undefined ? sug?.vercelProjectId : destino.vercelProjectId,
    supabaseRef: destino.supabaseRef === undefined ? sug?.supabaseRef : destino.supabaseRef,
    ...(faltaAlgo && sug ? { projectId: sug.projectId, quoteId: sug.quoteId, clientId: destino.clientId ?? sug.clientId } : {}),
  };
  if (!d.projectId && !d.quoteId && !d.nuevoProyecto) {
    throw new ErrorCredenciales(`Las cuentas quedaron guardadas (${guardado.length}), pero no sé a qué proyecto van. Elige el proyecto o la cotización.`);
  }

  const vercel = d.vercelProjectId ? vercelTodos.find((p) => p.id === d.vercelProjectId) ?? null : null;
  if (d.vercelProjectId && !vercel) avisos.push("El proyecto de Vercel elegido no está en ninguna de las cuentas pegadas.");
  const supabase = d.supabaseRef ? supabaseTodos.find((p) => p.ref === d.supabaseRef) ?? null : null;
  const repo = d.repo && /^[\w.-]+\/[\w.-]+$/.test(d.repo) ? d.repo : null;

  // 4. Proyecto (y cliente) destino.
  const proyecto = await resolverProyecto(userId, d, repo?.split("/")[1] ?? vercel?.name ?? "");
  guardado.push(proyecto.creado ? `Proyecto «${proyecto.name}» creado` : `Ligado al proyecto «${proyecto.name}»`);

  // 5. Cuenta de GitHub que lee el repo: la que se acaba de pegar si es del dueño, si no la que tenga acceso.
  let githubAccountId: string | null = null;
  let githubLogin: string | null = null;
  if (repo) {
    const [owner, name] = repo.split("/");
    const delDueno = ghCuentas.find((c) => c.login.toLowerCase() === owner.toLowerCase());
    const t = delDueno ? { cuentaId: delDueno.id, login: delDueno.login } : await tokenParaRepo({ userId, owner, repo: name });
    githubAccountId = t.cuentaId;
    githubLogin = t.login;
    if (!githubAccountId) avisos.push(`Ninguna cuenta de GitHub guardada puede leer ${repo}: el avance no se moverá hasta pegar el token de esa cuenta.`);
  } else if (!deTipo(hs, "repo").length) {
    avisos.push("No vino el repositorio: elígelo en la ficha del proyecto para que el avance se mueva solo.");
  }

  // 6. Proyecto: repo, cuenta y enlace, sin pisar lo que ya tenía.
  const actual = await prisma.project.findUnique({ where: { id: proyecto.id }, select: { repoOwner: true, repoName: true, liveUrl: true, githubAccountId: true } });
  const repoActual = actual?.repoOwner && actual.repoName ? `${actual.repoOwner}/${actual.repoName}` : null;
  const liveUrl = vercel?.domain ? `https://${vercel.domain}` : null;
  if (repo && repoActual && repoActual.toLowerCase() !== repo.toLowerCase()) avisos.push(`El proyecto ya tenía el repo ${repoActual}; no lo cambié por ${repo}.`);
  await prisma.project.update({
    where: { id: proyecto.id },
    data: {
      ...(repo && !repoActual ? { repoOwner: repo.split("/")[0], repoName: repo.split("/")[1] } : {}),
      ...(githubAccountId && (!repoActual || repoActual.toLowerCase() === repo?.toLowerCase()) ? { githubAccountId } : {}),
      ...(liveUrl && !actual?.liveUrl ? { liveUrl } : {}),
    },
  });
  if (repo && !repoActual) guardado.push(`Repo ${repo} ligado`);
  if (liveUrl && !actual?.liveUrl) guardado.push(`Enlace del sistema: ${liveUrl}`);

  // 7. Plataforma del proyecto: una sola, se completa si ya existe.
  const plataforma = (await prisma.platform.findFirst({ where: { userId, projectId: proyecto.id }, orderBy: { sortOrder: "asc" } }))
    // Una plataforma suelta (sin proyecto) con ese repo se adopta; nunca se le quita la suya a otro proyecto.
    ?? (repo ? await prisma.platform.findFirst({ where: { userId, projectId: null, githubRepo: { equals: repo, mode: "insensitive" } } }) : null);
  const datos = {
    clientId: proyecto.clientId,
    projectId: proyecto.id,
    ...(repo ? { githubRepo: repo } : {}),
    ...(githubAccountId ? { githubAccountId } : {}),
    ...(vercel ? { vercelEmail: vercel.cuenta.email, vercelProjectId: vercel.id, vercelProjectName: vercel.name } : vercelCuentas[0] ? { vercelEmail: vercelCuentas[0].email } : {}),
    ...(supabase ? { supabaseEmail: supabase.cuenta.email, supabaseProjectRef: supabase.ref } : d.supabaseRef ? { supabaseProjectRef: d.supabaseRef } : supabaseCuentas[0] ? { supabaseEmail: supabaseCuentas[0].email } : {}),
  };
  let platform;
  if (plataforma) {
    platform = await prisma.platform.update({ where: { id: plataforma.id }, data: { ...datos, ...(liveUrl && !plataforma.accessUrl ? { accessUrl: liveUrl } : {}) } });
    guardado.push(`Plataforma «${platform.name}» completada`);
  } else {
    const max = await prisma.platform.aggregate({ where: { userId }, _max: { sortOrder: true } });
    platform = await prisma.platform.create({ data: { ...datos, userId, name: proyecto.name, accessUrl: liveUrl, sortOrder: (max._max.sortOrder ?? -1) + 1 } });
    guardado.push(`Plataforma «${platform.name}» creada`);
  }

  // 8. Lo demás (llaves de servicio, contraseña de la base, otras APIs) a la bóveda cifrada.
  const enBoveda = await guardarEnBoveda(platform.id, platform.confidentialVault, bloqueDeBoveda(hs));
  if (enBoveda) guardado.push(`${enBoveda} llave${enBoveda === 1 ? "" : "s"} más en la bóveda`);

  // 9. Segunda verificación: fases de Pime ↔ marcadores y tareas de GitHub.
  const verificacion = await verificarFases(userId, proyecto.id);

  const vc = vercel ? vercelCuentas.find((c) => c.id === vercel.cuenta.id) : vercelCuentas[0];
  const vcRow = vc ? await prisma.platformAccount.findUnique({ where: { id: vc.id }, select: { teamId: true } }) : null;
  return {
    projectId: proyecto.id,
    projectName: proyecto.name,
    clientId: proyecto.clientId,
    platformId: platform.id,
    guardado,
    avisos,
    local: { vercelAccount: vc?.label ?? null, vercelProjectId: vercel?.id ?? null, vercelOrgId: vcRow?.teamId ?? null, supabaseRef: supabase?.ref ?? d.supabaseRef ?? null, githubLogin, repo },
    verificacion,
  };
}
