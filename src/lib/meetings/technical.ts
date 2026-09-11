import { formatTimestamp, parseTimestamp } from "./transcript";
import type { TechnicalChange, TechnicalMinutes, TechnicalTopic } from "./types";

/**
 * Lectura, fusión y resumen de la minuta técnica.
 *
 * Vive aparte del pipeline a propósito: no toca OpenAI ni la base, así que la
 * usan igual el servidor, la página del detalle y las pruebas.
 */

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function strArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => (typeof v === "string" ? v.trim() : "")).filter(Boolean);
}

/** Une listas sin repetir, conservando el orden en que aparece cada cosa. */
function union(...lists: string[][]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of lists.flat()) {
    const key = item.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/**
 * El modelo escribe el minuto como "12:30" (lo copia de la transcripción) y la
 * base lo guarda en ms. Se aceptan las dos formas; un minuto fuera de la reunión
 * es un timestamp inventado y se descarta.
 */
function topicStart(rec: Record<string, unknown>, durationMs: number): number | null {
  const ms =
    typeof rec.startMs === "number" && Number.isFinite(rec.startMs)
      ? Math.max(0, Math.round(rec.startMs))
      : parseTimestamp(str(rec.start));
  if (ms === null) return null;
  if (durationMs > 0 && ms > durationMs) return null;
  return ms;
}

/** Orden cronológico; un tema sin minuto no se puede ubicar y va al final. */
function byStart(a: TechnicalTopic, b: TechnicalTopic): number {
  return (a.startMs ?? Infinity) - (b.startMs ?? Infinity);
}

function parseTopics(value: unknown, durationMs: number): TechnicalTopic[] {
  if (!Array.isArray(value)) return [];
  // El modelo no siempre los devuelve en el orden en que salieron.
  return value.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const rec = raw as Record<string, unknown>;
    const title = str(rec.title);
    const discussion = str(rec.discussion);
    const details = strArray(rec.details);
    // Un tema sin título ni contenido no documenta nada.
    if (!title || (!discussion && details.length === 0)) return [];
    return [
      {
        title,
        startMs: topicStart(rec, durationMs),
        discussion,
        details,
        decisions: strArray(rec.decisions),
        pending: strArray(rec.pending),
      } satisfies TechnicalTopic,
    ];
  }).sort(byStart);
}

function parseChanges(value: unknown): TechnicalChange[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((c) => {
    if (!c || typeof c !== "object") return [];
    const cr = c as Record<string, unknown>;
    const what = str(cr.what);
    if (!what) return [];
    return [{ area: str(cr.area, "General"), what, why: str(cr.why) }];
  });
}

/**
 * Normaliza lo que devuelve el modelo (o lo guardado en la base) a una minuta
 * completa. Nunca devuelve null: una respuesta vacía es una minuta vacía.
 */
export function normalizeTechnical(raw: unknown, durationMs = 0): TechnicalMinutes {
  const rec = (raw ?? {}) as Record<string, unknown>;
  return {
    summary: str(rec.summary),
    topics: parseTopics(rec.topics, durationMs),
    architecture: strArray(rec.architecture),
    changes: parseChanges(rec.changes),
    businessRules: strArray(rec.businessRules),
    dependencies: strArray(rec.dependencies),
    openQuestions: strArray(rec.openQuestions),
  };
}

/**
 * Lee la minuta guardada en `Meeting.technicalMinutes`. Las reuniones procesadas
 * antes del formato por temas no tienen `topics` ni `businessRules`: salen como
 * listas vacías en vez de romper la página.
 */
export function parseTechnicalMinutes(value: unknown): TechnicalMinutes | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return normalizeTechnical(value);
}

/** Minuta del formato anterior: tiene resumen pero ningún tema. */
export function isLegacyTechnical(technical: TechnicalMinutes): boolean {
  return technical.topics.length === 0 && technical.summary.length > 0;
}

/** Cuánto contenido documenta una minuta. Sirve para medir, no para mostrar. */
export function technicalDetailSize(technical: Pick<TechnicalMinutes, "topics">): number {
  return technical.topics.reduce(
    (sum, t) =>
      sum +
      t.discussion.length +
      [...t.details, ...t.decisions, ...t.pending].reduce((n, x) => n + x.length, 0),
    0
  );
}

// ─── Fusión de una reunión larga ─────────────────────────────────────────────

/** Id estable de un tema dentro de una reunión partida en tramos: "2.0" = tramo 2, tema 0. */
export function topicId(chunk: number, index: number): string {
  return `${chunk + 1}.${index}`;
}

/**
 * Lo que decide el modelo al fusionar: qué temas de tramos distintos son el
 * mismo, más el resumen y las listas ya depuradas. No reescribe los temas.
 */
export interface TechnicalMergePlan {
  summary: string;
  topicGroups: string[][];
  architecture: string[];
  changes: TechnicalChange[];
  businessRules: string[];
  dependencies: string[];
  openQuestions: string[];
}

export function parseMergePlan(raw: unknown): TechnicalMergePlan {
  const rec = (raw ?? {}) as Record<string, unknown>;
  const groups = Array.isArray(rec.topicGroups)
    ? rec.topicGroups.map((g) => strArray(g)).filter((g) => g.length > 0)
    : [];
  return {
    summary: str(rec.summary),
    topicGroups: groups,
    architecture: strArray(rec.architecture),
    changes: parseChanges(rec.changes),
    businessRules: strArray(rec.businessRules),
    dependencies: strArray(rec.dependencies),
    openQuestions: strArray(rec.openQuestions),
  };
}

function mergeGroup(topics: TechnicalTopic[]): TechnicalTopic {
  const starts = topics.map((t) => t.startMs).filter((ms): ms is number => ms !== null);
  return {
    title: topics[0].title,
    startMs: starts.length > 0 ? Math.min(...starts) : null,
    // Un tema cortado entre dos tramos se cuenta en orden: primero lo del tramo
    // anterior. Se concatena, no se resume.
    discussion: topics
      .map((t) => t.discussion)
      .filter(Boolean)
      .join("\n\n"),
    details: union(...topics.map((t) => t.details)),
    decisions: union(...topics.map((t) => t.decisions)),
    pending: union(...topics.map((t) => t.pending)),
  };
}

/**
 * Ensambla la minuta de una reunión larga a partir de las minutas de cada tramo
 * y del plan de fusión.
 *
 * Los temas se juntan aquí, en código, y no los reescribe el modelo: fusionar con
 * el modelo era justo el paso que volvía a condensar lo que cada tramo había
 * documentado. Por construcción ningún tema se pierde: uno que el plan omite,
 * repite o nombra mal entra igual, por su cuenta.
 *
 * En las listas manda el plan, porque ahí sí hace falta criterio (una pregunta
 * que un tramo dejó abierta y otro cerró ya no es pregunta). Pero si el plan
 * devuelve una lista vacía donde los tramos tenían contenido, se toma la unión de
 * los tramos: vaciar una lista entera no es depurarla.
 */
export function assembleTechnical(
  partials: TechnicalMinutes[],
  plan: TechnicalMergePlan
): TechnicalMinutes {
  const byId = new Map<string, TechnicalTopic>();
  const order: string[] = [];
  partials.forEach((p, chunk) =>
    p.topics.forEach((t, i) => {
      const id = topicId(chunk, i);
      byId.set(id, t);
      order.push(id);
    })
  );

  const used = new Set<string>();
  const topics: TechnicalTopic[] = [];

  for (const group of plan.topicGroups) {
    const members = group.filter((id) => byId.has(id) && !used.has(id));
    if (members.length === 0) continue;
    members.forEach((id) => used.add(id));
    topics.push(mergeGroup(members.map((id) => byId.get(id)!)));
  }
  for (const id of order) {
    if (!used.has(id)) topics.push(byId.get(id)!);
  }

  topics.sort(byStart);

  const listOr = <K extends "architecture" | "businessRules" | "dependencies" | "openQuestions">(
    key: K
  ): string[] =>
    plan[key].length > 0 ? plan[key] : union(...partials.map((p) => p[key]));

  return {
    summary: plan.summary || partials.map((p) => p.summary).filter(Boolean).join("\n\n"),
    topics,
    architecture: listOr("architecture"),
    changes: plan.changes.length > 0 ? plan.changes : partials.flatMap((p) => p.changes),
    businessRules: listOr("businessRules"),
    dependencies: listOr("dependencies"),
    openQuestions: listOr("openQuestions"),
  };
}

/**
 * Lo que el modelo necesita ver de cada tema para decidir si dos son el mismo:
 * id, título, minuto y el arranque de la discusión. No la discusión entera, que
 * es lo que haría la llamada lenta y cara sin mejorar la decisión.
 */
export function describePartialsForMerge(partials: TechnicalMinutes[]): string {
  return partials
    .map((p, chunk) => {
      const topics = p.topics
        .map((t, i) => {
          const at = t.startMs !== null ? ` (${formatTimestamp(t.startMs)})` : "";
          const gist = t.discussion.slice(0, 280).replace(/\s+/g, " ");
          return `- [${topicId(chunk, i)}]${at} ${t.title}: ${gist}${t.discussion.length > 280 ? "…" : ""}`;
        })
        .join("\n");
      return `### Tramo ${chunk + 1}
Resumen del tramo: ${p.summary || "(sin resumen)"}

Temas:
${topics || "(ninguno)"}

Listas del tramo:
${JSON.stringify({
  architecture: p.architecture,
  changes: p.changes,
  businessRules: p.businessRules,
  dependencies: p.dependencies,
  openQuestions: p.openQuestions,
})}`;
    })
    .join("\n\n");
}

// ─── Profundizar cada tema ───────────────────────────────────────────────────

/** Encabezado de un turno en la transcripción atribuida: `**Nombre** (12:30): texto`. */
const TURN_HEADER = /^\*\*(.+?)\*\* \((\d{1,2}:\d{2}(?::\d{2})?)\):/;

/**
 * El tramo de la transcripción entre dos minutos, con un margen antes y después
 * para no cortar la frase que abre o cierra el tema. Las líneas sin encabezado
 * son continuación del turno anterior y lo siguen.
 */
export function transcriptWindow(
  diarizedText: string,
  fromMs: number,
  toMs: number,
  marginMs = 30_000
): string {
  const out: string[] = [];
  let keep = false;
  for (const line of diarizedText.split("\n")) {
    const header = line.match(TURN_HEADER);
    if (header) {
      const ms = parseTimestamp(header[2]);
      keep = ms !== null && ms >= fromMs - marginMs && ms < toMs + marginMs;
    }
    if (keep) out.push(line);
  }
  return out.join("\n").trim();
}

/**
 * Desde y hasta dónde se habló de cada tema: desde su minuto hasta el minuto del
 * tema siguiente. Los temas sin minuto no tienen tramo (null) y no se profundizan.
 */
export function topicWindows(
  topics: TechnicalTopic[],
  durationMs: number
): ({ from: number; to: number } | null)[] {
  const starts = topics
    .map((t) => t.startMs)
    .filter((ms): ms is number => ms !== null)
    .sort((a, b) => a - b);
  return topics.map((t) => {
    if (t.startMs === null) return null;
    const next = starts.find((ms) => ms > (t.startMs as number));
    return { from: t.startMs, to: next ?? (durationMs > 0 ? durationMs : Number.MAX_SAFE_INTEGER) };
  });
}

/**
 * Junta lo que se anotó de un tema en la primera pasada con su versión
 * profundizada. Nunca achica: gana la discusión más larga, y una lista solo se
 * reemplaza si la nueva tiene al menos tantos elementos (si no, se unen). El
 * título y el minuto se quedan: los validó la primera pasada.
 */
export function mergeExpansion(original: TechnicalTopic, raw: unknown): TechnicalTopic {
  const rec = (raw ?? {}) as Record<string, unknown>;
  const discussion = str(rec.discussion);
  const pick = (next: string[], prev: string[]) => (next.length >= prev.length ? next : union(next, prev));
  return {
    title: original.title,
    startMs: original.startMs,
    discussion: discussion.length > original.discussion.length ? discussion : original.discussion,
    details: pick(strArray(rec.details), original.details),
    decisions: pick(strArray(rec.decisions), original.decisions),
    pending: pick(strArray(rec.pending), original.pending),
  };
}

// ─── Lo que ven las etapas siguientes ────────────────────────────────────────

const bullets = (items: string[], empty: string) =>
  items.length > 0 ? items.map((x) => `- ${x}`).join("\n") : empty;

/**
 * La minuta técnica en texto, para las etapas que salen de ella: pendientes,
 * entregable y master prompt. Antes cada una armaba su propio resumen de cuatro
 * campos y ninguna veía el detalle; ahora ven los temas completos.
 */
export function technicalDigest(technical: TechnicalMinutes): string {
  const topics =
    technical.topics.length > 0
      ? technical.topics
          .map((t) => {
            const at = t.startMs !== null ? ` (${formatTimestamp(t.startMs)})` : "";
            const parts = [`### ${t.title}${at}`, t.discussion];
            if (t.details.length > 0) parts.push(`Datos concretos:\n${bullets(t.details, "")}`);
            if (t.decisions.length > 0) parts.push(`Se decidió:\n${bullets(t.decisions, "")}`);
            if (t.pending.length > 0) parts.push(`Quedó abierto:\n${bullets(t.pending, "")}`);
            return parts.filter(Boolean).join("\n");
          })
          .join("\n\n")
      : "(la minuta no tiene detalle por temas)";

  return `Resumen técnico:
${technical.summary || "(sin resumen)"}

Temas tratados:
${topics}

Decisiones de arquitectura:
${bullets(technical.architecture, "(ninguna)")}

Cambios identificados:
${technical.changes.map((c) => `- [${c.area}] ${c.what}${c.why ? ` — porque: ${c.why}` : ""}`).join("\n") || "(ninguno)"}

Reglas de negocio:
${bullets(technical.businessRules, "(ninguna)")}

Dependencias pendientes:
${bullets(technical.dependencies, "(ninguna)")}

Preguntas abiertas:
${bullets(technical.openQuestions, "(ninguna)")}`;
}
