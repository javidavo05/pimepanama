import { ESTADO_LABEL, type EstadoSistema } from "@/lib/pulso/reglas";

const TONO: Record<EstadoSistema, string> = {
  ok: "bg-ok/10 text-ok",
  degradado: "bg-warn/10 text-warn",
  caido: "bg-danger/10 text-danger",
  sin_senal: "bg-fill-2 text-fg-dim",
};
const PUNTO: Record<EstadoSistema, string> = { ok: "bg-ok", degradado: "bg-warn", caido: "bg-danger", sin_senal: "bg-fg-faint" };

export function EstadoSistemaPill({ status, activo = true }: { status: string; activo?: boolean }) {
  const s = (status in TONO ? status : "sin_senal") as EstadoSistema;
  if (!activo) return <span className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap bg-fill-2 text-fg-dim">En pausa</span>;
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${TONO[s]}`}>
      <span className={`h-2 w-2 rounded-full ${PUNTO[s]}`} aria-hidden />{ESTADO_LABEL[s]}
    </span>
  );
}

export function haceCuanto(d: Date | null | undefined): string {
  if (!d) return "nunca";
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "hace un momento";
  if (m < 60) return `hace ${m} min`;
  if (m < 1440) return `hace ${Math.round(m / 60)} h`;
  return new Date(d).toLocaleDateString("es-PA", { day: "numeric", month: "short", timeZone: "America/Panama" });
}
