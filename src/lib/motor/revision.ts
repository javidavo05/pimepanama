/**
 * Resumen de la revisión única de un sistema (reglas puras, sin base de datos, para poder probarlas).
 *
 * Un sistema es un proyecto con repositorio o enlace. La revisión junta en un solo resultado lo que antes
 * vivía en cuatro lugares: la salud del enlace (Pulso), GitHub, las fases con marcador y el enlace que ve
 * el cliente. Se guarda en Project.revision y todas las pantallas leen de ahí.
 */

export type EstadoRevision = "ok" | "atencion" | "problema" | "sin_datos";
export type Modo = "fases" | "mantenimiento";

/** Un aviso dice qué falta y adónde ir a resolverlo dentro del proyecto. */
export type Aviso = { texto: string; donde: "sistema" | "fases" | "enlace" };

export type Revision = {
  at: string;
  estado: EstadoRevision;
  modo: Modo;
  /** Enlace con el que se revisa la salud: el del cliente o, si falta, el de su plataforma. */
  enlace: string | null;
  enlaceVisibleCliente: boolean;
  salud: { estado: string; detalle: string | null; ms: number | null; sistemaId: string } | null;
  github: { repo: string; error: string | null; ultimoCommit: string | null; commits30: number; hook: boolean } | null;
  fases: { total: number; conMarcador: number; avance: number };
  pulso: boolean;
  avisos: Aviso[];
  sugerencias: Aviso[];
};

export type EntradaRevision = {
  repo: string | null;
  liveUrl: string | null;
  urlPlataforma: string | null;
  sistema: { id: string; status: string; statusDetail: string | null; lastLatencyMs: number | null; lastEventAt: Date | null; healthUrl: string | null } | null;
  /** El enlace se probó al crear el sistema y no respondió: no se vigila hasta que se corrija. */
  enlaceSinRespuesta: string | null;
  github: { error?: string | null; ultimoCommit?: { fecha: string } | null; commits30?: number } | null;
  hook: boolean;
  fases: { progress: number; githubMilestone: number | null }[];
};

export function resumirRevision(e: EntradaRevision, ahora = new Date()): Revision {
  const enlace = e.liveUrl ?? e.urlPlataforma;
  const modo: Modo = e.fases.length ? "fases" : "mantenimiento";
  const conMarcador = e.fases.filter((f) => f.githubMilestone != null).length;
  const avance = e.fases.length ? Math.round(e.fases.reduce((a, f) => a + Number(f.progress), 0) / e.fases.length) : 0;
  const avisos: Aviso[] = [];
  const sugerencias: Aviso[] = [];
  let problema = false;

  const st = e.sistema?.status;
  if (st === "caido") { problema = true; avisos.push({ texto: `No responde${e.sistema?.statusDetail ? `: ${e.sistema.statusDetail}` : ""}.`, donde: "sistema" }); }
  else if (st === "degradado") avisos.push({ texto: "Funciona con fallas.", donde: "sistema" });

  if (!enlace) avisos.push({ texto: "Sin enlace del sistema: no se puede revisar si está en línea.", donde: "enlace" });
  else if (e.enlaceSinRespuesta) avisos.push({ texto: `El enlace ${e.enlaceSinRespuesta} no respondió. Corrígelo para que Pime lo vigile.`, donde: "enlace" });
  else if (!e.liveUrl) sugerencias.push({ texto: "El cliente todavía no ve el enlace de su sistema en su cuenta.", donde: "enlace" });

  if (e.repo && e.github?.error) { problema = true; avisos.push({ texto: `GitHub: ${e.github.error}`, donde: "sistema" }); }
  if (modo === "fases") {
    const sin = e.fases.length - conMarcador;
    if (!e.repo) avisos.push({ texto: "Tiene fases pero no repositorio: su avance no se mueve solo.", donde: "sistema" });
    else if (sin > 0) avisos.push({ texto: `${sin} ${sin === 1 ? "fase sin marcador" : "fases sin marcador"} en GitHub: su avance no se mueve solo.`, donde: "fases" });
    else if (!e.hook) sugerencias.push({ texto: "Sin webhook: el avance se mueve cada 30 min, no al instante.", donde: "fases" });
  }
  const pulso = !!e.sistema?.lastEventAt;
  if (e.sistema && !pulso) sugerencias.push({ texto: "Sin Pulso instalado: Pime ve si está en línea, pero no sus errores ni despliegues.", donde: "sistema" });

  const sinDatos = !e.sistema && !e.github;
  const estado: EstadoRevision = problema ? "problema" : avisos.length ? "atencion" : sinDatos ? "sin_datos" : "ok";

  return {
    at: ahora.toISOString(),
    estado,
    modo,
    enlace,
    enlaceVisibleCliente: !!e.liveUrl,
    salud: e.sistema ? { estado: e.sistema.status, detalle: e.sistema.statusDetail, ms: e.sistema.lastLatencyMs, sistemaId: e.sistema.id } : null,
    github: e.repo ? { repo: e.repo, error: e.github?.error ?? null, ultimoCommit: e.github?.ultimoCommit?.fecha ?? null, commits30: e.github?.commits30 ?? 0, hook: e.hook } : null,
    fases: { total: e.fases.length, conMarcador, avance },
    pulso,
    avisos,
    sugerencias,
  };
}

export const ESTADO_REVISION_LABEL: Record<EstadoRevision, string> = {
  ok: "Todo en orden",
  atencion: "Requiere atención",
  problema: "Con problemas",
  sin_datos: "Sin revisar",
};
