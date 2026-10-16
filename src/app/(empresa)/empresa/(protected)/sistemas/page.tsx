import Link from "@/components/empresa/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { sistemasUnificados } from "@/lib/motor/sistemas";
import { PageHeader, btn } from "@/components/empresa/page-header";
import { EstadoSistemaPill, haceCuanto } from "@/components/empresa/sistemas/estado";
import { RevisionPill, lineaRevision } from "@/components/empresa/sistemas/revision";

export const metadata = { title: "Sistemas — Pime Suite" };
export const dynamic = "force-dynamic";

const ORDEN: Record<string, number> = { problema: 0, atencion: 1, sin_datos: 2, ok: 3 };
const fila = "grid gap-2 px-4 sm:px-6 py-4 hover:bg-fill sm:grid-cols-[minmax(0,2fr)_auto_minmax(0,2fr)] sm:items-center sm:gap-4";

/**
 * Todos los sistemas de los clientes en un solo lugar. Un sistema es un proyecto con repositorio o enlace: aparece
 * solo, sin conectarlo aparte. El estado sale de la revisión única (motor/sistemas.ts), que corre cada 30 min.
 */
export default async function SistemasPage() {
  const u = await getEmpresaUser();
  const { proyectos, sueltos, plataformasSinProyecto } = await sistemasUnificados(u.id);
  const lista = [...proyectos].sort((a, b) => (ORDEN[a.revision?.estado ?? "sin_datos"] ?? 9) - (ORDEN[b.revision?.estado ?? "sin_datos"] ?? 9) || a.name.localeCompare(b.name));
  const cuenta = (e: string) => proyectos.filter((p) => (p.revision?.estado ?? "sin_datos") === e).length;
  const total = proyectos.length + sueltos.length;
  const ultima = proyectos.reduce<Date | null>((m, p) => (p.revisadoAt && (!m || p.revisadoAt > m) ? p.revisadoAt : m), null);
  const resumen = !total
    ? "Ningún sistema todavía"
    : [`${total} ${total === 1 ? "sistema" : "sistemas"}`, cuenta("problema") ? `${cuenta("problema")} con problemas` : null, cuenta("atencion") ? `${cuenta("atencion")} requieren atención` : null, cuenta("ok") ? `${cuenta("ok")} en orden` : null].filter(Boolean).join(" · ");

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Sistemas"
        description={resumen}
        actions={<><Link href="/empresa/platforms" className={btn.secondary}>Accesos y cuentas</Link><Link href="/empresa/platforms?nueva=1" className={btn.primary}>+ Agregar sistema</Link></>}
      />
      <p className="text-fg-dim text-sm max-w-prose">
        Cada proyecto con repositorio o enlace es un sistema. Pime lo revisa solo cada 30 min: si está en línea, su avance en GitHub y lo que le falta. Toca uno para ver su ficha.
        {ultima ? ` Última revisión ${haceCuanto(ultima)}.` : ""}
      </p>

      {total === 0 ? (
        <div className="bg-panel border border-line rounded-2xl p-12 text-center space-y-4">
          <p className="text-fg font-medium">Todavía no hay sistemas.</p>
          <p className="text-fg-dim text-sm max-w-prose mx-auto">Agrega la plataforma de un cliente con su repo o su enlace: el asistente crea el cliente y el proyecto si no existen, y Pime empieza a revisarla sola.</p>
          <Link href="/empresa/platforms?nueva=1" className={btn.primary}>Agregar el primer sistema</Link>
        </div>
      ) : (
        <ul className="bg-panel border border-line rounded-2xl divide-y divide-line overflow-hidden">
          {lista.map((p) => {
            const aviso = p.revision?.avisos[0]?.texto ?? null;
            const masAvisos = (p.revision?.avisos.length ?? 0) - 1;
            return (
              <li key={p.id}>
                <Link href={`/empresa/proyectos/${p.id}?tab=repo`} className={fila}>
                  <span className="min-w-0">
                    <span className="block text-fg font-medium [overflow-wrap:anywhere]">{p.name}</span>
                    <span className="block text-fg-dim text-xs [overflow-wrap:anywhere]">{p.cliente ?? "Sin cliente"} · {lineaRevision(p.revision)}{p.errores ? ` · ${p.errores} ${p.errores === 1 ? "error abierto" : "errores abiertos"}` : ""}</span>
                  </span>
                  <span className="justify-self-start"><RevisionPill estado={p.revision?.estado} /></span>
                  <span className={`text-xs min-w-0 [overflow-wrap:anywhere] ${aviso ? "text-fg-mute" : "text-fg-faint"}`}>
                    {aviso ? `${aviso}${masAvisos > 0 ? ` (+${masAvisos} más)` : ""}` : "Nada pendiente."}
                  </span>
                </Link>
              </li>
            );
          })}
          {sueltos.map((s) => (
            <li key={s.id}>
              <Link href={`/empresa/sistemas/${s.id}`} className={fila}>
                <span className="min-w-0">
                  <span className="block text-fg font-medium [overflow-wrap:anywhere]">{s.name}</span>
                  <span className="block text-fg-dim text-xs [overflow-wrap:anywhere]">{s.cliente} · conectado a mano, sin proyecto{s.errores ? ` · ${s.errores} errores abiertos` : ""}</span>
                </span>
                <span className="justify-self-start"><EstadoSistemaPill status={s.status} /></span>
                <span className="text-xs text-fg-mute">Ligarlo a su proyecto para ver su avance y GitHub.</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {plataformasSinProyecto.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-fg text-base font-semibold tracking-tight">Plataformas sin proyecto · {plataformasSinProyecto.length}</h2>
            <p className="text-fg-dim text-sm max-w-prose">Pime no las revisa hasta que tengan proyecto. Ábrela y elige o crea su proyecto.</p>
          </div>
          <ul className="bg-panel border border-line rounded-2xl divide-y divide-line overflow-hidden">
            {plataformasSinProyecto.map((pl) => (
              <li key={pl.id}>
                <Link href={`/empresa/platforms?abrir=${pl.id}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 sm:px-6 py-4 min-h-12 hover:bg-fill">
                  <span className="min-w-0">
                    <span className="block text-fg text-sm font-medium [overflow-wrap:anywhere]">{pl.name}</span>
                    <span className="block text-fg-dim text-xs [overflow-wrap:anywhere]">{[pl.cliente ?? "Sin cliente", pl.enlace].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span className="text-sm text-brand-fg shrink-0">Ligar a un proyecto</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
