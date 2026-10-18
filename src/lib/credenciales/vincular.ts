/**
 * Pegar credenciales y dejar el sistema armado de una vez (pedidos de Javier, 2026-10-17). Lo usan la pantalla
 * /empresa/platforms/credenciales y la skill pime-project-preflight desde Claude Code (llave pmg_ del dispositivo).
 *
 * Nada se escribe sin que una persona valide a quién se le sube. Tres pasos:
 *  1. analizar: detecta qué hay en el texto, prueba cada token y propone el destino. No escribe.
 *  2. planificar: con un destino explícito (proyecto existente de un cliente, proyecto nuevo de un cliente
 *     existente o nuevo —con o sin cotización—, o proyecto interno de Pime) arma el plan completo: cliente,
 *     proyecto, fases que el cliente va a ver y lo que se crea en GitHub. Marca lo que bloquea y devuelve un
 *     código de confirmación atado a ese texto y ese destino. No escribe.
 *  3. aplicar: solo con el código del plan. Vuelve a validar todo y recién entonces crea cliente, proyecto y
 *     fases, guarda las cuentas, la plataforma y la bóveda, liga el repo, crea los marcadores de cada fase en
 *     GitHub (la información que ve el cliente) y corre la segunda verificación.
 *
 * Ningún token sale de aquí: las respuestas llevan solo la vista enmascarada.
 */
import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { comprobarToken, guardarCuenta } from "@/lib/github/cuentas";
import { decryptGithubToken } from "@/lib/github/client";
import { guardarTokenPlataforma } from "@/lib/platforms/cuentas";
import { githubRepos, verificarSupabase, verificarVercel, vercelProjects, type SupabaseProjectItem, type VercelProjectItem } from "@/lib/platforms/externo";
import { mejorCoincidencia, nombresCoinciden } from "@/lib/platforms/enlazar";
import { decryptPlatformVault, encryptPlatformVault, hasPlatformVault } from "@/lib/platform-vault-crypto";
import { prepararMarcadores, type ResultadoMarcadores } from "@/lib/portal/github-marcadores";
import { bloqueDeBoveda, deTipo, detectarCredenciales, enmascarar, NOMBRE_TIPO, type Hallazgo, type TipoCredencial } from "./detectar";
import { verificarFases, type VerificacionFases } from "./verificar-fases";

// ─── Tipos públicos ──────────────────────────────────────────────────────────

export type HallazgoVisible = { tipo: TipoCredencial; nombre: string; servicio: string; clave: string | null; vista: string };
export type CuentaVerificada = { proveedor: "github" | "vercel" | "supabase"; vista: string; ok: boolean; cuenta: string | null; error: string | null; yaGuardada: boolean; proyectos: number | null };
export type VercelOpcion = { id: string; name: string; domain: string | null; repo: string | null; cuenta: string };
export type SupabaseOpcion = { ref: string; name: string; status: string; cuenta: string };

export type TipoDestino = "existente" | "nuevo" | "interno";
export type Sugerencia = {
  tipo: TipoDestino | null;
  projectId: string | null;
  clientId: string | null;
  quoteId: string | null;
  repo: string | null;
  vercelProjectId: string | null;
  supabaseRef: string | null;
  /** Por qué se propone. */
  motivo: string | null;
  /** true solo con evidencia fuerte (repo o plataforma ya ligados): aun así se confirma. */
  fuerte: boolean;
};
export type Opciones = {
  clientes: { id: string; name: string; email: string | null }[];
  proyectos: { id: string; name: string; clientId: string | null; cliente: string | null; repo: string | null; fases: number; interno: boolean }[];
  cotizaciones: { id: string; title: string; number: string | null; clientId: string | null; cliente: string | null; projectId: string | null; lineas: { nombre: string; precio: number }[] }[];
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

export type FaseNueva = { nombre: string; descripcion?: string | null; precio?: number | null; entregables: string[] };
export type Destino = {
  tipo: TipoDestino;
  /** existente: el proyecto. interno: un proyecto interno ya creado (opcional). */
  projectId?: string | null;
  /** nuevo: cliente existente. existente: cliente a asignar si el proyecto no tiene. */
  clientId?: string | null;
  /** nuevo: cliente que se crea. */
  nuevoCliente?: { name: string; email?: string | null } | null;
  /** Crear el cliente aunque haya uno con nombre parecido. */
  forzarClienteNuevo?: boolean;
  /** nuevo: cotización de la que nace el proyecto (debe ser de ese cliente). */
  quoteId?: string | null;
  /** nuevo / interno: nombre del proyecto. */
  nombreProyecto?: string | null;
  /** Fases que el cliente va a ver, si el proyecto todavía no tiene. */
  fases?: FaseNueva[] | null;
  repo?: string | null;
  vercelProjectId?: string | null;
  supabaseRef?: string | null;
};

export type FasePlan = { nombre: string; entregables: string[]; origen: "pime" | "nueva"; marcador: "existe" | "se_crea" | "no_aplica" };
export type Plan = {
  tipo: TipoDestino;
  cliente: { id: string | null; nombre: string; correo: string | null; nuevo: boolean } | null;
  proyecto: { id: string | null; nombre: string; nuevo: boolean; cotizacion: { id: string; titulo: string } | null };
  visibleCliente: boolean;
  repo: { nombre: string; cuenta: string | null; escribe: boolean; webhook: boolean } | null;
  vercel: { nombre: string; dominio: string | null; cuenta: string } | null;
  supabase: { nombre: string; ref: string; cuenta: string } | null;
  cuentas: { proveedor: "github" | "vercel" | "supabase"; cuenta: string | null; ok: boolean }[];
  boveda: number;
  fases: FasePlan[];
  github: { marcadoresNuevos: number; tareasNuevas: number; webhook: "ya" | "se_crea" | "sin_permiso" | "no_aplica" };
  bloqueantes: string[];
  avisos: string[];
  /** Código para aplicar exactamente este plan. null si algo bloquea. */
  confirmacion: string | null;
};

export type ResultadoAplicar = {
  projectId: string;
  projectName: string;
  clientId: string | null;
  platformId: string;
  guardado: string[];
  avisos: string[];
  marcadores: ResultadoMarcadores | null;
  local: { vercelProjectId: string | null; supabaseRef: string | null; githubLogin: string | null; repo: string | null };
  verificacion: VerificacionFases;
};

export class ErrorCredenciales extends Error {}

// ─── Utilidades ──────────────────────────────────────────────────────────────

const corto = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const visible = (h: Hallazgo): HallazgoVisible => ({ tipo: h.tipo, nombre: NOMBRE_TIPO[h.tipo], servicio: h.servicio, clave: h.clave, vista: enmascarar(h) });
const mensaje = (e: unknown) => (e instanceof Error ? e.message : "No se pudo comprobar.");
const mismoRepo = (a: string | null | undefined, b: string | null | undefined) => !!a && !!b && a.toLowerCase() === b.toLowerCase();
const REPO_RE = /^[\w.-]+\/[\w.-]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** JSON con las claves ordenadas: el mismo destino da siempre el mismo código. */
function canonico(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonico).join(",")}]`;
  if (v && typeof v === "object") {
    return `{${Object.keys(v).filter((k) => (v as Record<string, unknown>)[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canonico((v as Record<string, unknown>)[k])}`).join(",")}}`;
  }
  return JSON.stringify(v ?? null);
}

function secreto(): string {
  const s = process.env.PIME_MFA_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("Falta PIME_MFA_SECRET o SUPABASE_SERVICE_ROLE_KEY para firmar la confirmación.");
  return s;
}

/** Código del plan: quién, qué texto y qué destino. Cambia cualquier cosa y deja de valer. */
function codigoDe(userId: string, texto: string, destino: Destino): string {
  const h = createHash("sha256").update(texto).digest("hex");
  return createHmac("sha256", secreto()).update(`cred1:${userId}:${h}:${canonico(normalizarDestino(destino))}`).digest("base64url").slice(0, 16);
}

function codigoValido(esperado: string, recibido: string | null | undefined): boolean {
  if (!recibido) return false;
  const a = Buffer.from(esperado), b = Buffer.from(recibido.trim());
  return a.length === b.length && timingSafeEqual(a, b);
}

function normalizarFases(fs: FaseNueva[] | null | undefined): FaseNueva[] {
  return (fs ?? [])
    .map((f) => ({
      nombre: corto(f.nombre, 160),
      descripcion: corto(f.descripcion, 2000) || null,
      precio: f.precio != null && Number.isFinite(Number(f.precio)) ? Math.max(0, Number(f.precio)) : null,
      entregables: (f.entregables ?? []).map((e) => corto(e, 300)).filter(Boolean),
    }))
    .filter((f) => f.nombre);
}

export function normalizarDestino(d: Destino): Destino {
  const tipo: TipoDestino = d.tipo === "nuevo" || d.tipo === "interno" ? d.tipo : "existente";
  return {
    tipo,
    projectId: corto(d.projectId, 64) || null,
    clientId: corto(d.clientId, 64) || null,
    nuevoCliente: d.nuevoCliente?.name?.trim() ? { name: corto(d.nuevoCliente.name, 120), email: corto(d.nuevoCliente.email, 160).toLowerCase() || null } : null,
    forzarClienteNuevo: !!d.forzarClienteNuevo,
    quoteId: corto(d.quoteId, 64) || null,
    nombreProyecto: corto(d.nombreProyecto, 160) || null,
    fases: normalizarFases(d.fases),
    repo: corto(d.repo, 140) || null,
    vercelProjectId: corto(d.vercelProjectId, 64) || null,
    supabaseRef: corto(d.supabaseRef, 40) || null,
  };
}

// ─── Verificación de tokens ──────────────────────────────────────────────────

type Verificadas = {
  github: { h: Hallazgo; login: string | null; error: string | null; repos: string[] }[];
  vercel: { h: Hallazgo; email: string | null; label: string | null; error: string | null; proyectos: VercelProjectItem[] }[];
  supabase: { h: Hallazgo; email: string | null; label: string | null; error: string | null; proyectos: SupabaseProjectItem[] }[];
};

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
        return { h, email: v.email, label: v.label, error: null, proyectos: await vercelProjects(h.valor, v.teamId).catch(() => []) };
      } catch (e) {
        return { h, email: null, label: null, error: mensaje(e), proyectos: [] };
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

type Permisos = { login: string | null; lee: boolean; escribe: boolean; admin: boolean };

/** Qué puede hacer un token en un repo (leer, escribir issues, poner webhooks). */
async function permisosEn(token: string, repo: string): Promise<{ lee: boolean; escribe: boolean; admin: boolean }> {
  try {
    const r = await fetch(`https://api.github.com/repos/${repo.split("/").map(encodeURIComponent).join("/")}`, {
      headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "User-Agent": "pime-suite", "X-GitHub-Api-Version": "2022-11-28" },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) return { lee: false, escribe: false, admin: false };
    const j = (await r.json()) as { permissions?: { admin?: boolean; push?: boolean; triage?: boolean } };
    // Un token fino (github_pat_) sin el bloque permissions se trata como lectura; crear marcadores lo confirmará.
    return { lee: true, escribe: !!(j.permissions?.push || j.permissions?.admin || j.permissions?.triage), admin: !!j.permissions?.admin };
  } catch {
    return { lee: false, escribe: false, admin: false };
  }
}

/** La mejor cuenta para el repo: primero las pegadas, luego las guardadas; la del dueño antes que las demás. */
async function cuentaParaRepo(userId: string, repo: string, pegadas: Verificadas["github"]): Promise<Permisos> {
  const owner = repo.split("/")[0].toLowerCase();
  const guardadas = await prisma.githubAccount.findMany({ where: { userId }, select: { login: true, tokenEnc: true } });
  const candidatas: { login: string; token: string }[] = [
    ...pegadas.filter((g) => g.login).map((g) => ({ login: g.login!, token: g.h.valor })),
    ...guardadas.flatMap((c) => { try { return [{ login: c.login, token: decryptGithubToken(c.tokenEnc) }]; } catch { return []; } }),
  ].sort((a, b) => Number(b.login.toLowerCase() === owner) - Number(a.login.toLowerCase() === owner));
  let mejor: Permisos = { login: null, lee: false, escribe: false, admin: false };
  const vistos = new Set<string>();
  for (const c of candidatas) {
    if (vistos.has(c.token)) continue;
    vistos.add(c.token);
    const p = await permisosEn(c.token, repo);
    if (p.lee && (!mejor.lee || (p.escribe && !mejor.escribe) || (p.admin && !mejor.admin))) mejor = { login: c.login, ...p };
    if (mejor.admin) break;
  }
  return mejor;
}

// ─── Opciones y sugerencia ───────────────────────────────────────────────────

type LineaCotizacion = { description?: string; quantity?: number; unitPrice?: number; discount?: number };

async function opcionesDe(userId: string): Promise<Opciones> {
  const [clientes, proyectos, cotizaciones] = await Promise.all([
    prisma.client.findMany({ where: { userId, archivedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true, company: true, email: true } }),
    prisma.project.findMany({
      where: { userId, status: { in: ["ACTIVE", "PAUSED"] } },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, clientId: true, portalVisible: true, repoOwner: true, repoName: true, client: { select: { name: true, company: true } }, clients: { select: { clientId: true } }, _count: { select: { phases: true } } },
    }),
    prisma.document.findMany({
      where: { userId, type: "COTIZACION", status: { in: ["DRAFT", "SENT", "ACCEPTED"] } },
      orderBy: { createdAt: "desc" },
      take: 60,
      select: { id: true, title: true, number: true, clientId: true, projectId: true, content: true, client: { select: { name: true, company: true } } },
    }),
  ]);
  return {
    clientes: clientes.map((c) => ({ id: c.id, name: c.company || c.name, email: c.email })),
    proyectos: proyectos.map((p) => ({
      id: p.id, name: p.name, clientId: p.clientId ?? p.clients[0]?.clientId ?? null,
      cliente: p.client ? p.client.company || p.client.name : null,
      repo: p.repoOwner && p.repoName ? `${p.repoOwner}/${p.repoName}` : null,
      fases: p._count.phases,
      interno: !p.clientId && !p.clients.length,
    })),
    cotizaciones: cotizaciones.map((q) => {
      const items = ((q.content as { lineItems?: LineaCotizacion[] } | null)?.lineItems ?? []).filter((l) => l.description?.trim());
      return {
        id: q.id, title: q.title, number: q.number, clientId: q.clientId, projectId: q.projectId,
        cliente: q.client ? q.client.company || q.client.name : null,
        lineas: items.map((l) => ({ nombre: String(l.description).trim().slice(0, 160), precio: Math.max(0, (Number(l.unitPrice) || 0) * (Number(l.quantity) || 1) - (Number(l.discount) || 0)) })),
      };
    }),
  };
}

/** Destino propuesto. Solo es «fuerte» si el repo o la plataforma ya están ligados; el nombre parecido es una pista. */
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
  const vercel = vercelDetectado ?? (repo ? vercelTodos.find((p) => mismoRepo(p.repo, repo)) : undefined) ?? (plat?.vercelProjectId ? vercelTodos.find((p) => p.id === plat.vercelProjectId) : undefined) ?? null;

  const base: Sugerencia = { tipo: null, projectId: null, clientId: null, quoteId: null, repo, vercelProjectId: vercel?.id ?? null, supabaseRef, motivo: null, fuerte: false };
  const deProyecto = (p: Opciones["proyectos"][number], motivo: string, fuerte: boolean): Sugerencia =>
    ({ ...base, tipo: p.interno ? "interno" : "existente", projectId: p.id, clientId: p.clientId, motivo, fuerte });

  const porRepo = repo ? op.proyectos.find((p) => mismoRepo(p.repo, repo)) : undefined;
  if (porRepo) return deProyecto(porRepo, `El proyecto «${porRepo.name}»${porRepo.cliente ? ` de ${porRepo.cliente}` : ""} ya tiene el repo ${repo}.`, true);
  const porPlat = plat?.projectId ? op.proyectos.find((p) => p.id === plat.projectId) : undefined;
  if (porPlat) return deProyecto(porPlat, `Ya hay una plataforma con estas cuentas ligada a «${porPlat.name}»${porPlat.cliente ? ` de ${porPlat.cliente}` : ""}.`, true);

  const supabaseNombre = ver.supabase.flatMap((s) => s.proyectos).find((p) => p.ref === supabaseRef)?.name;
  const nombres = [repo?.split("/")[1], vercel?.name, supabaseNombre].filter((n): n is string => !!n);
  const pr = nombres.length ? mejorCoincidencia(nombres, op.proyectos, (p) => p.name) : null;
  if (pr) return deProyecto(pr, `Solo por el nombre se parece a «${pr.name}»${pr.cliente ? ` de ${pr.cliente}` : ""}. Confírmalo.`, false);
  const cot = nombres.length ? mejorCoincidencia(nombres.filter(Boolean), op.cotizaciones.filter((c) => !c.projectId), (c) => c.title) : null;
  if (cot) return { ...base, tipo: "nuevo", quoteId: cot.id, clientId: cot.clientId, motivo: `Solo por el nombre se parece a la cotización «${cot.title}»${cot.cliente ? ` de ${cot.cliente}` : ""}. Confírmalo.` };
  const cli = nombres.length ? mejorCoincidencia(nombres, op.clientes, (c) => c.name) : null;
  if (cli) return { ...base, tipo: "nuevo", clientId: cli.id, motivo: `Solo por el nombre se parece al cliente ${cli.name}. Confírmalo.` };
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
  return {
    hallazgos: hs.map(visible),
    cuentas: [
      ...ver.github.map((g) => ({ proveedor: "github" as const, vista: enmascarar(g.h), ok: !g.error, cuenta: g.login, error: g.error, yaGuardada: ghGuardadas.some((c) => c.login.toLowerCase() === g.login?.toLowerCase()), proyectos: g.error ? null : g.repos.length })),
      ...ver.vercel.map((v) => ({ proveedor: "vercel" as const, vista: enmascarar(v.h), ok: !v.error, cuenta: v.label ?? v.email, error: v.error, yaGuardada: ya("vercel", v.email), proyectos: v.error ? null : v.proyectos.length })),
      ...ver.supabase.map((s) => ({ proveedor: "supabase" as const, vista: enmascarar(s.h), ok: !s.error, cuenta: s.label ?? s.email, error: s.error, yaGuardada: ya("supabase", s.email), proyectos: s.error ? null : s.proyectos.length })),
    ],
    repos: [...new Set(ver.github.flatMap((g) => g.repos))],
    vercel: ver.vercel.flatMap((v) => v.proyectos.map((p) => ({ id: p.id, name: p.name, domain: p.domain, repo: p.repo, cuenta: v.label ?? v.email ?? "Vercel" }))),
    supabase: ver.supabase.flatMap((s) => s.proyectos.map((p) => ({ ref: p.ref, name: p.name, status: p.status, cuenta: s.label ?? s.email ?? "Supabase" }))),
    sugerencia: await sugerir(userId, hs, ver, op),
    opciones: op,
  };
}

// ─── Plan (sin escribir) ─────────────────────────────────────────────────────

type ProyectoActual = {
  id: string; name: string; clientId: string | null; portalVisible: boolean; repoOwner: string | null; repoName: string | null; githubHookId: string | null;
  clients: { clientId: string }[];
  phases: { name: string; status: string; progressSource: string; githubMilestone: number | null; deliverables: { name: string }[] }[];
};

type Contexto = { hs: Hallazgo[]; ver: Verificadas; d: Destino; proyecto: ProyectoActual | null; permisos: Permisos | null };

async function armarPlan(userId: string, texto: string, destino: Destino): Promise<{ plan: Plan; ctx: Contexto }> {
  const hs = detectarCredenciales(texto);
  if (!hs.length) throw new ErrorCredenciales("No encontré ninguna credencial en el texto.");
  const d = normalizarDestino(destino);
  const ver = await verificarTokens(hs);
  const bloqueantes: string[] = [];
  const avisos: string[] = [];

  // Cuentas que se van a guardar: solo las que autentican.
  const cuentas: Plan["cuentas"] = [
    ...ver.github.map((g) => ({ proveedor: "github" as const, cuenta: g.login, ok: !g.error })),
    ...ver.vercel.map((v) => ({ proveedor: "vercel" as const, cuenta: v.label ?? v.email, ok: !v.error })),
    ...ver.supabase.map((s) => ({ proveedor: "supabase" as const, cuenta: s.label ?? s.email, ok: !s.error })),
  ];
  for (const c of cuentas.filter((c) => !c.ok)) avisos.push(`Un token de ${c.proveedor === "github" ? "GitHub" : c.proveedor === "vercel" ? "Vercel" : "Supabase"} no funciona: no se guarda.`);

  // 1. Cliente y proyecto.
  let cliente: Plan["cliente"] = null;
  let proyectoPlan: Plan["proyecto"] = { id: null, nombre: "", nuevo: true, cotizacion: null };
  let proyecto: ProyectoActual | null = null;
  const leerProyecto = (id: string) => prisma.project.findFirst({
    where: { id, userId },
    select: { id: true, name: true, clientId: true, portalVisible: true, repoOwner: true, repoName: true, githubHookId: true, clients: { select: { clientId: true } },
      phases: { where: { OR: [{ changeOrderId: null }, { changeOrder: { status: "aprobada" } }] }, orderBy: { sortOrder: "asc" }, select: { name: true, status: true, progressSource: true, githubMilestone: true, deliverables: { orderBy: { sortOrder: "asc" }, select: { name: true } } } } },
  });
  const leerCliente = async (id: string) => {
    const c = await prisma.client.findFirst({ where: { id, userId }, select: { id: true, name: true, company: true, email: true, archivedAt: true } });
    if (c?.archivedAt) avisos.push(`El cliente ${c.company || c.name} está archivado.`);
    return c ? { id: c.id, nombre: c.company || c.name, correo: c.email, nuevo: false } : null;
  };

  if (d.tipo === "existente") {
    if (!d.projectId) bloqueantes.push("Elige el proyecto.");
    else {
      proyecto = await leerProyecto(d.projectId);
      if (!proyecto) bloqueantes.push("Ese proyecto no existe.");
      else {
        proyectoPlan = { id: proyecto.id, nombre: proyecto.name, nuevo: false, cotizacion: null };
        const delProyecto = [proyecto.clientId, ...proyecto.clients.map((c) => c.clientId)].filter((x): x is string => !!x);
        if (d.clientId && delProyecto.length && !delProyecto.includes(d.clientId)) bloqueantes.push(`El cliente elegido no es el de «${proyecto.name}». Revisa a quién va.`);
        const clienteId = delProyecto[0] ?? d.clientId;
        if (clienteId) cliente = await leerCliente(clienteId);
        else bloqueantes.push(`«${proyecto.name}» no tiene cliente: elige a qué cliente pertenece, o súbelo como proyecto interno de Pime.`);
      }
    }
  } else if (d.tipo === "nuevo") {
    if (d.clientId && d.nuevoCliente) bloqueantes.push("Elige un cliente existente o uno nuevo, no los dos.");
    if (d.clientId) {
      cliente = await leerCliente(d.clientId);
      if (!cliente) bloqueantes.push("Ese cliente no existe.");
    } else if (d.nuevoCliente) {
      if (d.nuevoCliente.email && !EMAIL_RE.test(d.nuevoCliente.email)) bloqueantes.push("El correo del cliente nuevo no es válido.");
      const parecidos = await prisma.client.findMany({ where: { userId, archivedAt: null }, select: { name: true, company: true, email: true } });
      const igual = parecidos.find((c) => (d.nuevoCliente!.email && c.email?.toLowerCase() === d.nuevoCliente!.email) || nombresCoinciden(d.nuevoCliente!.name, c.company || c.name));
      if (igual && !d.forzarClienteNuevo) bloqueantes.push(`Ya existe el cliente ${igual.company || igual.name}${igual.email ? ` (${igual.email})` : ""}. Elígelo, o confirma que es otro cliente distinto.`);
      cliente = { id: null, nombre: d.nuevoCliente.name, correo: d.nuevoCliente.email ?? null, nuevo: true };
    } else bloqueantes.push("Elige el cliente del proyecto nuevo (existente o nuevo).");

    let nombre = d.nombreProyecto ?? "";
    if (d.quoteId) {
      const q = await prisma.document.findFirst({ where: { id: d.quoteId, userId, type: "COTIZACION" }, select: { id: true, title: true, clientId: true, projectId: true, project: { select: { name: true } } } });
      if (!q) bloqueantes.push("Esa cotización no existe.");
      else {
        if (q.projectId) bloqueantes.push(`La cotización «${q.title}» ya tiene el proyecto «${q.project?.name}»: elige «Proyecto existente».`);
        if (q.clientId && cliente?.id && q.clientId !== cliente.id) bloqueantes.push(`La cotización «${q.title}» es de otro cliente.`);
        if (q.clientId && cliente?.nuevo) bloqueantes.push(`La cotización «${q.title}» ya tiene cliente: elígelo en vez de crear uno nuevo.`);
        proyectoPlan.cotizacion = { id: q.id, titulo: q.title };
        nombre = nombre || q.title;
      }
    }
    if (!nombre) bloqueantes.push("Escribe el nombre del proyecto nuevo.");
    proyectoPlan = { ...proyectoPlan, nombre, nuevo: true };
  } else {
    // Interno de Pime: sin cliente y sin portal.
    if (d.clientId || d.nuevoCliente) bloqueantes.push("Un proyecto interno no lleva cliente.");
    if (d.projectId) {
      proyecto = await leerProyecto(d.projectId);
      if (!proyecto) bloqueantes.push("Ese proyecto no existe.");
      else if (proyecto.clientId || proyecto.clients.length) bloqueantes.push(`«${proyecto.name}» es de un cliente: súbelo como «Proyecto existente».`);
      else proyectoPlan = { id: proyecto.id, nombre: proyecto.name, nuevo: false, cotizacion: null };
    } else {
      if (!d.nombreProyecto) bloqueantes.push("Escribe el nombre del proyecto interno.");
      proyectoPlan = { id: null, nombre: d.nombreProyecto ?? "", nuevo: true, cotizacion: null };
    }
  }
  const visibleCliente = d.tipo !== "interno" && (proyecto ? proyecto.portalVisible : true);

  // 2. Repo, Vercel y Supabase: que no sean de otro proyecto.
  const repoActual = proyecto?.repoOwner && proyecto.repoName ? `${proyecto.repoOwner}/${proyecto.repoName}` : null;
  let repoNombre = d.repo ?? repoActual;
  if (d.repo && !REPO_RE.test(d.repo)) { bloqueantes.push("El repo va como dueño/nombre."); repoNombre = null; }
  if (repoActual && d.repo && !mismoRepo(repoActual, d.repo)) {
    bloqueantes.push(`«${proyectoPlan.nombre}» ya tiene el repo ${repoActual}; no se cambia por ${d.repo} desde aquí.`);
    repoNombre = repoActual;
  }
  let permisos: Permisos | null = null;
  if (repoNombre) {
    const [owner, name] = repoNombre.split("/");
    const otro = await prisma.project.findFirst({
      where: { userId, repoOwner: { equals: owner, mode: "insensitive" }, repoName: { equals: name, mode: "insensitive" }, ...(proyecto ? { id: { not: proyecto.id } } : {}) },
      select: { name: true, client: { select: { name: true, company: true } } },
    });
    if (otro) bloqueantes.push(`El repo ${repoNombre} ya es del proyecto «${otro.name}»${otro.client ? ` de ${otro.client.company || otro.client.name}` : ""}.`);
    permisos = await cuentaParaRepo(userId, repoNombre, ver.github);
    if (!permisos.lee) bloqueantes.push(`Ninguna cuenta de GitHub (pegada o guardada) puede leer ${repoNombre}: pega el token de la cuenta dueña.`);
  } else if (d.tipo !== "interno") {
    bloqueantes.push("Falta el repositorio de GitHub: sin repo las fases no se conectan y el cliente no ve avance.");
  }

  const vercelTodos = ver.vercel.flatMap((v) => v.proyectos.map((p) => ({ ...p, cuenta: v.label ?? v.email ?? "Vercel" })));
  const vercel = d.vercelProjectId ? vercelTodos.find((p) => p.id === d.vercelProjectId) ?? null : null;
  if (d.vercelProjectId && !vercel) bloqueantes.push("El proyecto de Vercel elegido no está en ninguna de las cuentas pegadas.");
  if (vercel?.repo && repoNombre && !mismoRepo(vercel.repo, repoNombre)) avisos.push(`El proyecto de Vercel ${vercel.name} está conectado a ${vercel.repo}, no a ${repoNombre}.`);
  const supabaseTodos = ver.supabase.flatMap((s) => s.proyectos.map((p) => ({ ...p, cuenta: s.label ?? s.email ?? "Supabase" })));
  const supabase = d.supabaseRef ? supabaseTodos.find((p) => p.ref === d.supabaseRef) ?? null : null;
  if (d.supabaseRef && !supabase && ver.supabase.some((s) => !s.error)) avisos.push(`El proyecto de Supabase ${d.supabaseRef} no está en la cuenta pegada.`);
  if (supabase?.status === "INACTIVE") avisos.push(`El proyecto de Supabase ${supabase.name} está pausado.`);

  const ajenas = await prisma.platform.findMany({
    where: { userId, projectId: { not: null, ...(proyecto ? { notIn: [proyecto.id] } : {}) }, OR: [...(d.vercelProjectId ? [{ vercelProjectId: d.vercelProjectId }] : []), ...(d.supabaseRef ? [{ supabaseProjectRef: d.supabaseRef }] : [])] },
    select: { vercelProjectId: true, supabaseProjectRef: true, project: { select: { name: true } } },
  });
  for (const a of ajenas) {
    if (d.vercelProjectId && a.vercelProjectId === d.vercelProjectId) bloqueantes.push(`El proyecto de Vercel ya está ligado a «${a.project?.name}».`);
    if (d.supabaseRef && a.supabaseProjectRef === d.supabaseRef) bloqueantes.push(`El proyecto de Supabase ya está ligado a «${a.project?.name}».`);
  }

  // 3. Fases: lo que el cliente va a ver. Las de Pime mandan; las nuevas solo si el proyecto no tiene.
  const fases: FasePlan[] = [];
  if (proyecto?.phases.length) {
    for (const f of proyecto.phases) {
      const conMarcador = f.status !== "hecha" && f.progressSource !== "sin_marcador";
      fases.push({ nombre: f.name, entregables: f.deliverables.map((x) => x.name), origen: "pime", marcador: f.githubMilestone ? "existe" : conMarcador && repoNombre ? "se_crea" : "no_aplica" });
    }
    if (d.fases?.length) avisos.push("El proyecto ya tiene fases en Pime: las fases pegadas no se agregan (un cambio de alcance es una orden de cambio).");
  } else {
    for (const f of d.fases ?? []) fases.push({ nombre: f.nombre, entregables: f.entregables, origen: "nueva", marcador: repoNombre ? "se_crea" : "no_aplica" });
  }
  if (d.tipo !== "interno" && !fases.length) bloqueantes.push("El proyecto no tiene fases: el cliente no vería avance. Carga sus fases y entregables (desde la cotización o escritas) antes de subirlo.");
  for (const f of fases.filter((f) => f.marcador === "se_crea" && !f.entregables.length)) avisos.push(`«${f.nombre}» no tiene entregables: su marcador tendrá una sola tarea y la barra saltará de 0 a 100 %.`);

  const nuevos = fases.filter((f) => f.marcador === "se_crea");
  if (nuevos.length && permisos?.lee && !permisos.escribe) bloqueantes.push(`La cuenta ${permisos.login} lee ${repoNombre} pero no puede crear tareas: pega un token con permiso de issues.`);
  const webhook: Plan["github"]["webhook"] = !repoNombre ? "no_aplica" : proyecto?.githubHookId ? "ya" : permisos?.admin ? "se_crea" : "sin_permiso";
  if (webhook === "sin_permiso" && fases.length) avisos.push("El token no puede poner el webhook (admin:repo_hook): el avance del cliente se moverá una vez al día.");

  const plan: Plan = {
    tipo: d.tipo,
    cliente,
    proyecto: proyectoPlan,
    visibleCliente,
    repo: repoNombre ? { nombre: repoNombre, cuenta: permisos?.login ?? null, escribe: !!permisos?.escribe, webhook: !!permisos?.admin } : null,
    vercel: vercel ? { nombre: vercel.name, dominio: vercel.domain, cuenta: vercel.cuenta } : null,
    supabase: supabase ? { nombre: supabase.name, ref: supabase.ref, cuenta: supabase.cuenta } : d.supabaseRef ? { nombre: d.supabaseRef, ref: d.supabaseRef, cuenta: "—" } : null,
    cuentas,
    boveda: bloqueDeBoveda(hs).split("\n").filter((l) => l && !l.startsWith("#")).length,
    fases,
    github: { marcadoresNuevos: nuevos.length, tareasNuevas: nuevos.reduce((n, f) => n + Math.max(1, f.entregables.length), 0), webhook },
    bloqueantes,
    avisos,
    confirmacion: null,
  };
  plan.confirmacion = bloqueantes.length ? null : codigoDe(userId, texto, d);
  return { plan, ctx: { hs, ver, d, proyecto, permisos } };
}

export async function planificarCredenciales(userId: string, texto: string, destino: Destino): Promise<Plan> {
  return (await armarPlan(userId, texto, destino)).plan;
}

// ─── Aplicar (solo con el código del plan) ───────────────────────────────────

/** Agrega a la bóveda las líneas que no estaban. Nunca devuelve el contenido. */
async function guardarEnBoveda(platformId: string, actual: string | null, bloque: string): Promise<number> {
  if (!bloque) return 0;
  let previo = "";
  if (hasPlatformVault(actual)) {
    try { previo = decryptPlatformVault(actual!); } catch { previo = ""; }
  }
  const nuevas = bloque.split("\n").filter((l) => l.startsWith("#") || !previo.includes(l));
  const cuantas = nuevas.filter((l) => !l.startsWith("#")).length;
  if (!cuantas) return 0;
  const contenido = [previo.trim(), nuevas.join("\n")].filter(Boolean).join("\n\n");
  await prisma.platform.update({ where: { id: platformId }, data: { confidentialVault: encryptPlatformVault(contenido) } });
  return cuantas;
}

async function crearFases(projectId: string, fases: FaseNueva[]) {
  if (!fases.length) return;
  const filas = fases.map((f, i) => ({ id: randomUUID(), projectId, name: f.nombre, description: f.descripcion ?? null, price: f.precio ?? 0, billingPoint: "al_entregar", sortOrder: i }));
  await prisma.projectPhase.createMany({ data: filas });
  const entregables = fases.flatMap((f, i) => f.entregables.map((name) => ({ projectId, phaseId: filas[i].id, name })));
  if (entregables.length) await prisma.deliverable.createMany({ data: entregables.map((e, i) => ({ ...e, sortOrder: i, source: "AI_CONTRACT" as const })) });
}

export async function aplicarCredenciales(userId: string, texto: string, destino: Destino, confirmacion: string | null | undefined): Promise<ResultadoAplicar & { plan: Plan }> {
  // El plan se vuelve a armar: lo que se escribe es lo que se confirmó, con los datos de este momento.
  const { plan, ctx } = await armarPlan(userId, texto, destino);
  if (plan.bloqueantes.length) throw new ErrorCredenciales(`No se subió nada: ${plan.bloqueantes.join(" ")}`);
  if (!plan.confirmacion || !codigoValido(plan.confirmacion, confirmacion)) {
    throw new ErrorCredenciales("No se subió nada: falta confirmar el plan, o el texto o el destino cambiaron desde que se revisó. Vuelve a revisarlo.");
  }
  const { hs, ver, d } = ctx;
  const guardado: string[] = [];
  const avisos = [...plan.avisos];

  // 1. Cliente y proyecto.
  let clientId = plan.cliente?.id ?? null;
  if (plan.cliente?.nuevo) {
    const c = await prisma.client.create({ data: { userId, name: plan.cliente.nombre, company: plan.cliente.nombre, email: plan.cliente.correo }, select: { id: true } });
    clientId = c.id;
    guardado.push(`Cliente ${plan.cliente.nombre} creado`);
  }
  let projectId = plan.proyecto.id;
  if (!projectId) {
    const p = await prisma.project.create({
      data: { userId, name: plan.proyecto.nombre, clientId, status: "ACTIVE", portalVisible: d.tipo !== "interno", ...(clientId ? { clients: { create: [{ clientId }] } } : {}) },
      select: { id: true },
    });
    projectId = p.id;
    guardado.push(`Proyecto «${plan.proyecto.nombre}» creado${plan.cliente ? ` para ${plan.cliente.nombre}` : " (interno de Pime)"}`);
    if (plan.proyecto.cotizacion) {
      await prisma.document.update({ where: { id: plan.proyecto.cotizacion.id }, data: { projectId } });
      guardado.push(`Ligado a la cotización «${plan.proyecto.cotizacion.titulo}»`);
    }
  } else {
    if (clientId && ctx.proyecto && !ctx.proyecto.clientId && !ctx.proyecto.clients.length) {
      await prisma.project.update({ where: { id: projectId }, data: { clientId, clients: { create: [{ clientId }] } } });
      guardado.push(`«${plan.proyecto.nombre}» asignado a ${plan.cliente?.nombre}`);
    } else guardado.push(`Ligado al proyecto «${plan.proyecto.nombre}»${plan.cliente ? ` de ${plan.cliente.nombre}` : ""}`);
  }
  if (plan.fases.some((f) => f.origen === "nueva")) {
    await crearFases(projectId, d.fases ?? []);
    guardado.push(`${plan.fases.length} fase${plan.fases.length === 1 ? "" : "s"} con ${plan.fases.reduce((n, f) => n + f.entregables.length, 0)} entregables cargadas`);
  }

  // 2. Cuentas: cifradas, en la cuenta que su servicio dice.
  const ghIds = new Map<string, string>();
  for (const g of ver.github.filter((g) => !g.error)) {
    const r = await guardarCuenta(userId, g.h.valor);
    if (r.ok) { ghIds.set(r.login.toLowerCase(), r.id); guardado.push(`GitHub: cuenta ${r.login} ${r.nueva ? "guardada" : "actualizada"}`); }
  }
  const vercelCuentas = new Map<string, string>();
  for (const v of ver.vercel.filter((v) => !v.error)) {
    const r = await guardarTokenPlataforma(userId, "vercel", v.h.valor, null);
    if (r.ok) { vercelCuentas.set(v.label ?? v.email ?? "Vercel", r.email); guardado.push(`Vercel: cuenta ${r.label ?? r.email}`); }
    else avisos.push(`Vercel: ${r.error}`);
  }
  const supabaseCuentas = new Map<string, string>();
  for (const s of ver.supabase.filter((s) => !s.error)) {
    const r = await guardarTokenPlataforma(userId, "supabase", s.h.valor, deTipo(hs, "email")[0]?.valor ?? null);
    if (r.ok) { supabaseCuentas.set(s.label ?? s.email ?? "Supabase", r.email); guardado.push(`Supabase: cuenta ${r.label ?? r.email}`); }
    else avisos.push(`Supabase: ${r.error}`);
  }

  // 3. Repo, cuenta que lo lee y enlace del sistema.
  const repo = plan.repo?.nombre ?? null;
  const githubAccountId = plan.repo?.cuenta
    ? ghIds.get(plan.repo.cuenta.toLowerCase()) ?? (await prisma.githubAccount.findFirst({ where: { userId, login: { equals: plan.repo.cuenta, mode: "insensitive" } }, select: { id: true } }))?.id ?? null
    : null;
  const liveUrl = plan.vercel?.dominio ? `https://${plan.vercel.dominio}` : null;
  const actual = await prisma.project.findUnique({ where: { id: projectId }, select: { repoName: true, liveUrl: true } });
  await prisma.project.update({
    where: { id: projectId },
    data: {
      ...(repo && !actual?.repoName ? { repoOwner: repo.split("/")[0], repoName: repo.split("/")[1] } : {}),
      ...(githubAccountId ? { githubAccountId } : {}),
      ...(liveUrl && !actual?.liveUrl ? { liveUrl } : {}),
    },
  });
  if (repo && !actual?.repoName) guardado.push(`Repo ${repo} ligado (lo lee ${plan.repo?.cuenta})`);
  if (liveUrl && !actual?.liveUrl) guardado.push(`Enlace del sistema: ${liveUrl}`);

  // 4. Plataforma del proyecto: una sola; se adopta una suelta con ese repo, nunca la de otro proyecto.
  const plataforma = (await prisma.platform.findFirst({ where: { userId, projectId }, orderBy: { sortOrder: "asc" } }))
    ?? (repo ? await prisma.platform.findFirst({ where: { userId, projectId: null, githubRepo: { equals: repo, mode: "insensitive" } } }) : null);
  const datos = {
    clientId,
    projectId,
    ...(repo ? { githubRepo: repo } : {}),
    ...(githubAccountId ? { githubAccountId } : {}),
    ...(plan.vercel ? { vercelEmail: vercelCuentas.get(plan.vercel.cuenta) ?? null, vercelProjectId: d.vercelProjectId, vercelProjectName: plan.vercel.nombre } : {}),
    ...(plan.supabase ? { supabaseProjectRef: plan.supabase.ref, ...(supabaseCuentas.get(plan.supabase.cuenta) ? { supabaseEmail: supabaseCuentas.get(plan.supabase.cuenta) } : {}) } : {}),
  };
  let platform;
  if (plataforma) {
    platform = await prisma.platform.update({ where: { id: plataforma.id }, data: { ...datos, ...(liveUrl && !plataforma.accessUrl ? { accessUrl: liveUrl } : {}) } });
    guardado.push(`Plataforma «${platform.name}» completada`);
  } else {
    const max = await prisma.platform.aggregate({ where: { userId }, _max: { sortOrder: true } });
    platform = await prisma.platform.create({ data: { ...datos, userId, name: plan.proyecto.nombre, accessUrl: liveUrl, sortOrder: (max._max.sortOrder ?? -1) + 1 } });
    guardado.push(`Plataforma «${platform.name}» creada`);
  }

  // 5. Lo demás a la bóveda cifrada.
  const enBoveda = await guardarEnBoveda(platform.id, platform.confidentialVault, bloqueDeBoveda(hs));
  if (enBoveda) guardado.push(`${enBoveda} llave${enBoveda === 1 ? "" : "s"} más en la bóveda`);

  // 6. Fases a GitHub en el mismo paso: es lo que el cliente ve en su cuenta.
  let marcadores: ResultadoMarcadores | null = null;
  if (repo && plan.github.marcadoresNuevos > 0) {
    try {
      marcadores = await prepararMarcadores(projectId);
      guardado.push(`GitHub: ${marcadores.fases} marcador${marcadores.fases === 1 ? "" : "es"} de fase y ${marcadores.tareas} tarea${marcadores.tareas === 1 ? "" : "s"} creadas`);
      avisos.push(...marcadores.avisos);
    } catch (e) {
      avisos.push(`No se pudieron crear los marcadores en GitHub: ${mensaje(e)}. Repítelo con «Crear los marcadores que faltan».`);
    }
  }

  // 7. Segunda verificación.
  const verificacion = await verificarFases(userId, projectId);
  return {
    projectId,
    projectName: plan.proyecto.nombre,
    clientId,
    platformId: platform.id,
    guardado,
    avisos,
    marcadores,
    local: { vercelProjectId: d.vercelProjectId ?? null, supabaseRef: plan.supabase?.ref ?? null, githubLogin: plan.repo?.cuenta ?? null, repo },
    verificacion,
    plan,
  };
}
