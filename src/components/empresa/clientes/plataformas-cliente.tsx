/**
 * Sección «Plataformas» de la ficha del cliente: dónde vive cada sistema que le hicimos (repo, Vercel,
 * Supabase, enlace) y si tiene accesos guardados en la bóveda. Lo vivo sale de la última consulta guardada.
 */
import Link from "@/components/empresa/link";
import type { PlataformaDeCliente } from "@/lib/platforms/cliente";
import { supabaseEstado, vercelEstado, type Tone } from "@/lib/platforms/estados";

const DOT: Record<Tone, string> = { ok: "bg-ok", warn: "bg-warn", danger: "bg-danger", brand: "bg-brand", mute: "bg-fill-3" };

function host(url: string) {
  try {
    return new URL(url.includes("://") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function Estado({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 min-w-0">
      <span aria-hidden className={`w-2 h-2 rounded-full shrink-0 ${DOT[tone]}`} />
      <span className="truncate">{children}</span>
    </span>
  );
}

export function PlataformasCliente({ clientId, plataformas, className, h2 }: { clientId: string; plataformas: PlataformaDeCliente[]; className: string; h2: string }) {
  return (
    <section className={className}>
      <div className="flex items-center justify-between gap-3">
        <h2 className={h2}>Plataformas</h2>
        <Link href={`/empresa/platforms?nueva=1&cliente=${clientId}`} className="inline-flex items-center min-h-11 sm:min-h-8 text-sm text-brand-fg hover:underline">
          + Plataforma
        </Link>
      </div>
      {plataformas.length ? (
        <ul className="mt-3 space-y-3">
          {plataformas.map((p) => {
            const v = vercelEstado(p.vercelState);
            const s = supabaseEstado(p.supabaseStatus);
            const filas: [string, React.ReactNode][] = [
              [
                "Repo",
                p.githubRepo ? (
                  <a href={`https://github.com/${p.githubRepo}`} target="_blank" rel="noopener noreferrer" className="text-brand-fg hover:underline [overflow-wrap:anywhere]">
                    {p.githubRepo}
                  </a>
                ) : (
                  <span className="text-fg-faint">Sin repo</span>
                ),
              ],
              [
                "Vercel",
                p.vercelEmail ? (
                  v ? <Estado tone={v.tone}>{`${v.label}${p.vercelProjectName ? ` · ${p.vercelProjectName}` : ""}`}</Estado> : <span className="truncate block">{p.vercelProjectName ?? p.vercelEmail}</span>
                ) : (
                  <span className="text-fg-faint">No usa Vercel</span>
                ),
              ],
              [
                "Supabase",
                p.supabaseEmail ? (
                  s ? <Estado tone={s.tone}>{`${s.label}${p.supabaseRegion ? ` · ${p.supabaseRegion}` : ""}`}</Estado> : <span className="truncate block">{p.supabaseEmail}</span>
                ) : (
                  <span className="text-fg-faint">No usa Supabase</span>
                ),
              ],
              ["Accesos", p.hasConfidential ? "Guardados en la bóveda" : <span className="text-fg-faint">Sin accesos guardados</span>],
            ];
            return (
              <li key={p.id} className="rounded-xl border border-line px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                  <div className="min-w-0">
                    <p className="text-fg text-sm font-semibold [overflow-wrap:anywhere]">{p.name}</p>
                    <p className="text-fg-dim text-xs [overflow-wrap:anywhere]">
                      {p.project ? `${p.project.name} · ` : ""}
                      {p.accessUrl ? (
                        <a href={p.accessUrl.includes("://") ? p.accessUrl : `https://${p.accessUrl}`} target="_blank" rel="noopener noreferrer" className="text-brand-fg hover:underline">
                          {host(p.accessUrl)}
                        </a>
                      ) : (
                        "Sin enlace"
                      )}
                    </p>
                  </div>
                  <Link href={`/empresa/platforms?abrir=${p.id}`} className="inline-flex items-center min-h-11 sm:min-h-8 text-xs text-brand-fg hover:underline shrink-0">
                    Abrir en Platforms
                  </Link>
                </div>
                <dl className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  {filas.map(([k, val]) => (
                    <div key={k} className="grid grid-cols-[72px_minmax(0,1fr)] gap-2 min-w-0">
                      <dt className="text-fg-dim text-xs pt-1">{k}</dt>
                      <dd className="min-w-0 text-fg-soft">{val}</dd>
                    </div>
                  ))}
                </dl>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-fg-dim">Sin plataformas. Registra dónde vive cada sistema de este cliente: repo, hosting, base de datos y accesos.</p>
      )}
    </section>
  );
}
