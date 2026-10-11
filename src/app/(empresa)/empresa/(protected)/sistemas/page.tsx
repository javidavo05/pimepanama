import Link from "@/components/empresa/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { sistemasDelEquipo } from "@/lib/pulso/datos";
import { PageHeader, btn } from "@/components/empresa/page-header";
import { EstadoSistemaPill, haceCuanto } from "@/components/empresa/sistemas/estado";

export const metadata = { title: "Sistemas — Pime Suite" };

const ORDEN: Record<string, number> = { caido: 0, degradado: 1, ok: 2, sin_senal: 3 };

export default async function SistemasPage() {
  const u = await getEmpresaUser();
  const sistemas = (await sistemasDelEquipo(u.id)).sort((a, b) => Number(b.active) - Number(a.active) || (ORDEN[a.status] ?? 9) - (ORDEN[b.status] ?? 9) || a.name.localeCompare(b.name));
  const activos = sistemas.filter((s) => s.active);
  const problemas = activos.filter((s) => s.status === "caido" || s.status === "degradado").length;
  const errores = activos.reduce((a, s) => a + s._count.incidents, 0);
  const resumen = !activos.length ? "Ningún sistema conectado" : [`${activos.length} conectados`, problemas ? `${problemas} con problemas` : "todos sin problemas", errores ? `${errores} errores abiertos` : null].filter(Boolean).join(" · ");

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader title="Sistemas" description={resumen} actions={<><Link href="/empresa/platforms" className={btn.secondary}>Accesos y cuentas</Link><Link href="/empresa/sistemas/nuevo" className={btn.primary}>+ Conectar sistema</Link></>} />
      {sistemas.length === 0 ? (
        <div className="bg-panel border border-line rounded-2xl p-12 text-center space-y-4">
          <p className="text-fg font-medium">Todavía no hay sistemas conectados.</p>
          <p className="text-fg-dim text-sm max-w-prose mx-auto">Conecta cada sistema que entregas: Pime consulta su salud cada 30 min, recibe sus errores y te avisa al celular si se cae. El cliente ve en su cuenta si está en línea.</p>
          <Link href="/empresa/sistemas/nuevo" className={btn.primary}>Conectar el primer sistema</Link>
        </div>
      ) : (
        <ul className="bg-panel border border-line rounded-2xl divide-y divide-line overflow-hidden">
          {sistemas.map((s) => (
            <li key={s.id}>
              <Link href={`/empresa/sistemas/${s.id}`} className={`grid gap-2 px-4 sm:px-6 py-4 hover:bg-fill sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center ${s.active ? "" : "opacity-70"}`}>
                <span className="min-w-0">
                  <span className="block text-fg font-medium truncate">{s.name}</span>
                  <span className="block text-fg-dim text-xs truncate">{s.client.company || s.client.name}{s.project ? ` · ${s.project.name}` : ""}</span>
                </span>
                <span className="justify-self-start"><EstadoSistemaPill status={s.status} activo={s.active} /></span>
                <span className="text-xs text-fg-dim">{s._count.incidents ? `${s._count.incidents} ${s._count.incidents === 1 ? "error abierto" : "errores abiertos"}` : "Sin errores abiertos"}</span>
                <span className="text-xs text-fg-faint sm:text-right">Último contacto {haceCuanto(s.lastSeenAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
