import { ESTADO_REVISION_LABEL, type EstadoRevision, type Revision } from "@/lib/motor/revision";
import { ESTADO_LABEL, type EstadoSistema } from "@/lib/pulso/reglas";

const TONO: Record<EstadoRevision, string> = {
  ok: "bg-ok/10 text-ok",
  atencion: "bg-warn/10 text-warn",
  problema: "bg-danger/10 text-danger",
  sin_datos: "bg-fill-2 text-fg-dim",
};
const PUNTO: Record<EstadoRevision, string> = { ok: "bg-ok", atencion: "bg-warn", problema: "bg-danger", sin_datos: "bg-fg-faint" };

/** Estado de la revisión única: el color no va solo, siempre lleva su palabra. */
export function RevisionPill({ estado }: { estado: EstadoRevision | null | undefined }) {
  const e = estado ?? "sin_datos";
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${TONO[e]}`}>
      <span className={`h-2 w-2 rounded-full ${PUNTO[e]}`} aria-hidden />
      {ESTADO_REVISION_LABEL[e]}
    </span>
  );
}

/** Una línea con lo que importa del sistema: si está en línea, su avance y su último cambio en GitHub. */
export function lineaRevision(r: Revision | null): string {
  if (!r) return "Todavía sin revisar. Pime lo revisa en la próxima vuelta (cada 30 min).";
  const salud = r.salud ? ESTADO_LABEL[(r.salud.estado in ESTADO_LABEL ? r.salud.estado : "sin_senal") as EstadoSistema] : r.enlace ? "Enlace sin vigilar" : "Sin enlace";
  const fases = r.modo === "fases" ? `Fases ${r.fases.conMarcador}/${r.fases.total} con marcador · ${r.fases.avance} %` : "Mantenimiento";
  return [salud, fases].join(" · ");
}
