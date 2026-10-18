/**
 * Credenciales pegadas de una vez (pedido de Javier, 2026-10-17: «le pegas todos los tokens y él agarra los
 * necesarios»). Lee cualquier texto —un .env, un chat, una lista suelta— y separa cada credencial por su forma
 * o por el nombre de su variable. No llama a nadie ni guarda nada: solo clasifica.
 *
 * La misma lógica vive, copiada en JavaScript, en la skill pime-project-preflight
 * (~/.claude/skills/pime-project-preflight/scripts/cargar-credenciales.mjs). Si cambias un patrón aquí,
 * cámbialo allá.
 */

export type TipoCredencial =
  | "github_token"
  | "vercel_token"
  | "supabase_token"
  | "supabase_service_role"
  | "supabase_anon"
  | "supabase_secret"
  | "supabase_publishable"
  | "supabase_ref"
  | "db_password"
  | "database_url"
  | "vercel_project_id"
  | "vercel_team_id"
  | "repo"
  | "url"
  | "email"
  | "otro";

export type Hallazgo = {
  tipo: TipoCredencial;
  valor: string;
  /** Variable de entorno con la que se guarda (la que traía el texto, o la habitual del servicio). */
  clave: string | null;
  /** Servicio en palabras: «GitHub», «Resend»… */
  servicio: string;
  /** Proyecto de Supabase que la credencial deja ver (de la URL, la cadena de conexión o el JWT). */
  ref?: string | null;
};

/** Lo que van a usar los demás: tokens que se verifican contra su servicio, y lo demás que va a la bóveda. */
export const TIPOS_DE_CUENTA: TipoCredencial[] = ["github_token", "vercel_token", "supabase_token"];
export const TIPOS_SECRETOS: TipoCredencial[] = ["supabase_service_role", "supabase_secret", "db_password", "database_url", "otro"];

export const NOMBRE_TIPO: Record<TipoCredencial, string> = {
  github_token: "Token de GitHub",
  vercel_token: "Token de Vercel",
  supabase_token: "Token de Supabase",
  supabase_service_role: "Llave service_role de Supabase",
  supabase_anon: "Llave anon de Supabase",
  supabase_secret: "Llave secreta de Supabase",
  supabase_publishable: "Llave pública de Supabase",
  supabase_ref: "Proyecto de Supabase",
  db_password: "Contraseña de la base",
  database_url: "Cadena de conexión",
  vercel_project_id: "Proyecto de Vercel",
  vercel_team_id: "Equipo de Vercel",
  repo: "Repositorio",
  url: "Enlace",
  email: "Correo",
  otro: "Otra llave",
};

/** Tipos que no son secretos: se muestran completos. */
const PUBLICOS: TipoCredencial[] = ["supabase_ref", "vercel_project_id", "vercel_team_id", "repo", "url", "email", "supabase_anon", "supabase_publishable"];

/** "ghp_abcd…wxyz". Nunca devuelve más de 8 caracteres de un secreto. */
export function enmascarar(h: Pick<Hallazgo, "tipo" | "valor">): string {
  if (PUBLICOS.includes(h.tipo) && h.tipo !== "supabase_anon" && h.tipo !== "supabase_publishable") return h.valor;
  const v = h.valor;
  if (v.length < 16) return "••••••••";
  return `${v.slice(0, 4)}…${v.slice(-4)}`;
}

// ─── Patrones por forma ──────────────────────────────────────────────────────

type Patron = { re: RegExp; tipo: TipoCredencial; servicio: string; clave: string | null };

const PATRONES: Patron[] = [
  { re: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}\b/g, tipo: "github_token", servicio: "GitHub", clave: "GITHUB_TOKEN" },
  { re: /\bgithub_pat_[A-Za-z0-9_]{40,}\b/g, tipo: "github_token", servicio: "GitHub", clave: "GITHUB_TOKEN" },
  { re: /\bsbp_[A-Za-z0-9_]{30,}\b/g, tipo: "supabase_token", servicio: "Supabase", clave: "SUPABASE_ACCESS_TOKEN" },
  { re: /\bsb_secret_[A-Za-z0-9_-]{16,}\b/g, tipo: "supabase_secret", servicio: "Supabase", clave: "SUPABASE_SECRET_KEY" },
  { re: /\bsb_publishable_[A-Za-z0-9_-]{16,}\b/g, tipo: "supabase_publishable", servicio: "Supabase", clave: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" },
  { re: /\bvc[pk]_[A-Za-z0-9]{20,}\b/g, tipo: "vercel_token", servicio: "Vercel", clave: "VERCEL_TOKEN" },
  { re: /\bprj_[A-Za-z0-9]{16,}\b/g, tipo: "vercel_project_id", servicio: "Vercel", clave: "VERCEL_PROJECT_ID" },
  { re: /\bteam_[A-Za-z0-9]{16,}\b/g, tipo: "vercel_team_id", servicio: "Vercel", clave: "VERCEL_ORG_ID" },
  { re: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g, tipo: "otro", servicio: "Anthropic", clave: "ANTHROPIC_API_KEY" },
  { re: /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/g, tipo: "otro", servicio: "OpenAI", clave: "OPENAI_API_KEY" },
  { re: /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/g, tipo: "otro", servicio: "Stripe", clave: "STRIPE_SECRET_KEY" },
  { re: /\brk_(?:live|test)_[A-Za-z0-9]{16,}\b/g, tipo: "otro", servicio: "Stripe", clave: "STRIPE_RESTRICTED_KEY" },
  { re: /\bpk_(?:live|test)_[A-Za-z0-9]{16,}\b/g, tipo: "otro", servicio: "Stripe", clave: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" },
  { re: /\bwhsec_[A-Za-z0-9]{16,}\b/g, tipo: "otro", servicio: "Stripe", clave: "STRIPE_WEBHOOK_SECRET" },
  { re: /\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16,}\b/g, tipo: "otro", servicio: "Resend", clave: "RESEND_API_KEY" },
  { re: /\bxkeysib-[A-Za-z0-9-]{40,}\b/g, tipo: "otro", servicio: "Brevo", clave: "BREVO_API_KEY" },
  { re: /\bAIza[0-9A-Za-z_-]{35}\b/g, tipo: "otro", servicio: "Google", clave: "GOOGLE_API_KEY" },
];

const JWT_RE = /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{16,}\b/g;
const SUPABASE_URL_RE = /https?:\/\/([a-z]{20})\.supabase\.(?:co|in)\b/g;
const PG_RE = /\bpostgres(?:ql)?:\/\/([^:\s/@]+):([^@\s]+)@([^:/\s]+)(?::\d+)?\/[^\s"'`]*/g;
const REPO_URL_RE = /\bgithub\.com[/:]([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100}?)(?:\.git)?(?=[\s/"'`)#?]|$)/g;
const URL_RE = /\bhttps?:\/\/[^\s"'`<>()]+/g;
const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
/** KEY=valor · KEY: valor · "KEY": "valor" · export KEY="valor" */
const LINEA_RE = /^\s*(?:export\s+)?["']?([A-Za-z][A-Za-z0-9_]{1,80})["']?\s*[:=]\s*["']?([^"'\s,]{6,})["']?,?\s*$/;
/** «vercel: xxxx», «token de vercel xxxx», «Supabase → sbp_…» */
const ETIQUETA_RE = /(github|vercel|supabase)[^A-Za-z0-9\n]{0,24}(?:token|clave|key|access)?[^A-Za-z0-9\n]{0,6}([A-Za-z0-9_-]{20,})/gi;

function base64urlJson(s: string): Record<string, unknown> | null {
  try {
    const b = s.replace(/-/g, "+").replace(/_/g, "/");
    const txt = typeof atob === "function" ? atob(b + "=".repeat((4 - (b.length % 4)) % 4)) : Buffer.from(b, "base64").toString("utf8");
    const j = JSON.parse(txt);
    return j && typeof j === "object" ? (j as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Una llave de Supabase en formato JWT dice su rol y su proyecto. */
function jwtDeSupabase(jwt: string): { rol: string; ref: string | null } | null {
  const p = base64urlJson(jwt.split(".")[1] ?? "");
  if (!p || p.iss !== "supabase" || typeof p.role !== "string") return null;
  return { rol: p.role, ref: typeof p.ref === "string" ? p.ref : null };
}

/** Clasificación por el nombre de la variable, cuando el valor no tiene una forma reconocible. */
function tipoPorClave(clave: string, valor: string): { tipo: TipoCredencial; servicio: string } | null {
  const k = clave.toUpperCase();
  if (/^(GITHUB|GH)_(TOKEN|PAT|ACCESS_TOKEN)$/.test(k) || k === "GITHUB_PERSONAL_ACCESS_TOKEN") return { tipo: "github_token", servicio: "GitHub" };
  if (/^VERCEL_(TOKEN|ACCESS_TOKEN|API_TOKEN)$/.test(k)) return { tipo: "vercel_token", servicio: "Vercel" };
  if (k === "VERCEL_PROJECT_ID") return { tipo: "vercel_project_id", servicio: "Vercel" };
  if (k === "VERCEL_ORG_ID" || k === "VERCEL_TEAM_ID") return { tipo: "vercel_team_id", servicio: "Vercel" };
  if (k === "SUPABASE_ACCESS_TOKEN") return { tipo: "supabase_token", servicio: "Supabase" };
  if (/^(SUPABASE_)?(PROJECT_REF|SUPABASE_REF)$/.test(k) || k === "SUPABASE_PROJECT_REF" || k === "SUPABASE_PROJECT_ID") {
    return /^[a-z]{20}$/.test(valor) ? { tipo: "supabase_ref", servicio: "Supabase" } : null;
  }
  if (/(SUPABASE_)?DB_PASSWORD$|^POSTGRES_PASSWORD$|^DATABASE_PASSWORD$/.test(k)) return { tipo: "db_password", servicio: "Supabase" };
  return null;
}

/**
 * Clasifica todo lo que encuentre. Una misma credencial aparece una sola vez, con el tipo más específico
 * (la forma manda sobre la etiqueta; la variable del texto se respeta como clave).
 */
export function detectarCredenciales(texto: string): Hallazgo[] {
  const out: Hallazgo[] = [];
  const vistos = new Map<string, Hallazgo>();
  const agregar = (h: Hallazgo) => {
    const v = h.valor.trim();
    if (!v) return;
    const previo = vistos.get(v);
    if (previo) {
      if (h.clave && !previo.clave) previo.clave = h.clave;
      if (previo.tipo === "otro" && h.tipo !== "otro") Object.assign(previo, { ...h, clave: previo.clave ?? h.clave });
      return;
    }
    const nuevo = { ...h, valor: v };
    vistos.set(v, nuevo);
    out.push(nuevo);
  };

  // 1. Líneas con nombre de variable: la clave viaja con el valor.
  const claves = new Map<string, string>();
  for (const linea of texto.split(/\r?\n/)) {
    const m = linea.match(LINEA_RE);
    if (m) claves.set(m[2], m[1]);
  }

  // 2. Formas inequívocas.
  for (const p of PATRONES) {
    for (const m of texto.matchAll(p.re)) agregar({ tipo: p.tipo, valor: m[0], clave: claves.get(m[0]) ?? p.clave, servicio: p.servicio });
  }
  for (const m of texto.matchAll(JWT_RE)) {
    const s = jwtDeSupabase(m[0]);
    if (!s) continue;
    const tipo = s.rol === "service_role" ? "supabase_service_role" : "supabase_anon";
    agregar({ tipo, valor: m[0], clave: claves.get(m[0]) ?? (tipo === "supabase_service_role" ? "SUPABASE_SERVICE_ROLE_KEY" : "NEXT_PUBLIC_SUPABASE_ANON_KEY"), servicio: "Supabase", ref: s.ref });
    if (s.ref) agregar({ tipo: "supabase_ref", valor: s.ref, clave: "SUPABASE_PROJECT_REF", servicio: "Supabase" });
  }
  for (const m of texto.matchAll(PG_RE)) {
    const [entera, usuario, clave, host] = m;
    const ref = usuario.match(/^postgres\.([a-z]{20})$/)?.[1] ?? host.match(/^db\.([a-z]{20})\.supabase\.co$/)?.[1] ?? null;
    let pass = clave;
    try { pass = decodeURIComponent(clave); } catch { /* se queda como vino */ }
    agregar({ tipo: "database_url", valor: entera, clave: claves.get(entera) ?? "DATABASE_URL", servicio: ref ? "Supabase" : "Postgres", ref });
    if (!pass.startsWith("[") && pass.length >= 6) agregar({ tipo: "db_password", valor: pass, clave: "SUPABASE_DB_PASSWORD", servicio: ref ? "Supabase" : "Postgres", ref });
    if (ref) agregar({ tipo: "supabase_ref", valor: ref, clave: "SUPABASE_PROJECT_REF", servicio: "Supabase" });
  }
  for (const m of texto.matchAll(SUPABASE_URL_RE)) agregar({ tipo: "supabase_ref", valor: m[1], clave: "SUPABASE_PROJECT_REF", servicio: "Supabase" });
  for (const m of texto.matchAll(REPO_URL_RE)) agregar({ tipo: "repo", valor: `${m[1]}/${m[2].replace(/\.git$/, "")}`, clave: null, servicio: "GitHub" });

  // 3. Variables con nombre conocido y valor sin forma propia (tokens clásicos de Vercel, contraseñas…).
  for (const [valor, clave] of claves) {
    if (vistos.has(valor)) continue;
    const t = tipoPorClave(clave, valor);
    if (t) agregar({ tipo: t.tipo, valor, clave, servicio: t.servicio });
    else if (/(KEY|TOKEN|SECRET|PASSWORD|PASS|DSN)$/i.test(clave) && valor.length >= 12 && !/^https?:/.test(valor)) {
      agregar({ tipo: "otro", valor, clave: clave.toUpperCase(), servicio: "Otro" });
    }
  }

  // 4. Etiquetas sueltas en un chat: «vercel: xxxxxxxx».
  for (const m of texto.matchAll(ETIQUETA_RE)) {
    const servicio = m[1].toLowerCase();
    const valor = m[2];
    if (vistos.has(valor) || /^(https?|www)/i.test(valor)) continue;
    if (servicio === "vercel" && /^[A-Za-z0-9]{24,}$/.test(valor)) agregar({ tipo: "vercel_token", valor, clave: "VERCEL_TOKEN", servicio: "Vercel" });
  }

  // 5. Enlaces y correos, para proponer el sistema y la cuenta.
  for (const m of texto.matchAll(URL_RE)) {
    const u = m[0].replace(/[.,;]+$/, "");
    if (/supabase\.(co|in)|github\.com|postgres/.test(u) || [...vistos.keys()].some((v) => u.includes(v))) continue;
    agregar({ tipo: "url", valor: u, clave: null, servicio: "Enlace" });
  }
  for (const m of texto.matchAll(EMAIL_RE)) {
    if ([...vistos.keys()].some((v) => v.includes(m[0]))) continue;
    agregar({ tipo: "email", valor: m[0].toLowerCase(), clave: null, servicio: "Correo" });
  }
  return out;
}

/** Las de un tipo, sin repetir. */
export function deTipo(hs: Hallazgo[], tipo: TipoCredencial): Hallazgo[] {
  return hs.filter((h) => h.tipo === tipo);
}

/** Bloque KEY=valor para la bóveda: lo que no es una cuenta pero hay que tener a mano. */
export function bloqueDeBoveda(hs: Hallazgo[], fecha = new Date()): string {
  const lineas = hs.filter((h) => TIPOS_SECRETOS.includes(h.tipo) || h.tipo === "supabase_anon" || h.tipo === "supabase_publishable").map((h) => `${h.clave ?? h.servicio.toUpperCase()}=${h.valor}`);
  if (!lineas.length) return "";
  return `# Cargado al pegar credenciales · ${fecha.toISOString().slice(0, 10)}\n${lineas.join("\n")}`;
}
