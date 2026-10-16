/** Estado del proyecto según GitHub: actividad real del repositorio y avance de sus milestones. */
import type { VerificacionGithub } from "@/lib/motor/verificar-github";

const hace = (iso: string) => {
  const d = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  return d <= 0 ? "hoy" : d === 1 ? "ayer" : `hace ${d} días`;
};

export function VerificacionGithubCard({ repo, check, checkAt }: { projectId?: string; repo: string | null; check: VerificacionGithub | null; checkAt: Date | null }) {
  if (!repo) return null;
  const max = Math.max(1, ...(check?.semanas ?? [0]));
  const ritmo = !check ? null : check.commits7 > 0 ? { t: "Activo esta semana", c: "bg-ok/10 text-ok" } : check.commits30 > 0 ? { t: "Con actividad este mes", c: "bg-brand/10 text-brand-fg" } : { t: "Sin actividad en 30 días", c: "bg-warn/10 text-warn" };
  return (
    <section className="bg-panel border border-line rounded-2xl p-4 sm:p-6 space-y-4 min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-fg text-base font-semibold tracking-tight">Estado verificado con GitHub</h2>
          <p className="text-fg-dim text-sm [overflow-wrap:anywhere]">{repo}{checkAt ? ` · leído ${hace(checkAt.toISOString())}` : " · sin leer todavía"}</p>
        </div>
      </div>
      {!check ? (
        <p className="text-fg-dim text-sm">Pime lee los commits, milestones y despliegues del repositorio en la próxima revisión, o al tocar «Revisar ahora».</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {ritmo && <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ritmo.c}`}>{ritmo.t}</span>}
            {check.despliegue && <span className="rounded-full px-3 py-1 text-xs font-semibold bg-fill-2 text-fg-mute">Desplegado {hace(check.despliegue.fecha)}</span>}
          </div>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-fill px-4 py-3"><dt className="text-fg-dim text-xs">Commits en 7 días</dt><dd className="text-fg text-sm font-semibold tabular-nums">{check.commits7}</dd></div>
            <div className="rounded-xl bg-fill px-4 py-3"><dt className="text-fg-dim text-xs">Commits en 30 días</dt><dd className="text-fg text-sm font-semibold tabular-nums">{check.commits30}</dd></div>
            <div className="rounded-xl bg-fill px-4 py-3 col-span-2 sm:col-span-1">
              <dt className="text-fg-dim text-xs">Últimas 8 semanas</dt>
              <dd className="mt-2 flex h-8 items-end gap-1" aria-label={`Commits por semana: ${check.semanas.join(", ")}`}>
                {check.semanas.map((n, i) => <span key={i} className="flex-1 rounded-sm bg-brand/70 origin-bottom" style={{ height: "100%", transform: `scaleY(${Math.max(0.06, n / max)})` }} />)}
              </dd>
            </div>
          </dl>
          {check.ultimoCommit && (
            <p className="text-sm text-fg-mute [overflow-wrap:anywhere]">Último cambio {hace(check.ultimoCommit.fecha)}: <span className="text-fg">{check.ultimoCommit.mensaje}</span></p>
          )}
          {check.milestones.length > 0 ? (
            <ul className="space-y-3">
              {check.milestones.map((m) => {
                const t = m.abiertas + m.cerradas, pct = t ? (m.cerradas / t) * 100 : 0;
                return (
                  <li key={m.numero} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-3 text-sm"><span className="text-fg min-w-0 truncate">{m.titulo}</span><span className="text-fg-dim tabular-nums whitespace-nowrap">{m.cerradas}/{t} · {Math.round(pct)} %</span></div>
                    <div className="h-1.5 rounded-full bg-fill-3 overflow-hidden"><div className="h-full bg-brand origin-left" style={{ transform: `scaleX(${pct / 100})` }} /></div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-fg-dim text-sm">El repositorio no tiene milestones. Crea los marcadores desde «Fases y entregables»: Pime abre un milestone por fase y la barra del cliente avanza sola.</p>
          )}
        </>
      )}
    </section>
  );
}
