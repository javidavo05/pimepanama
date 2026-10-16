import Link from "@/components/empresa/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { PageHeader, btn } from "@/components/empresa/page-header";
import { fechaCorta } from "@/lib/format-datetime";
import { agruparDuplicados, MOTIVO_LABEL, CAMPO_LABEL } from "@/lib/crm/duplicados";
import { resumenFusion } from "@/lib/crm/duplicados-fusion";
import { ConfirmarFusion } from "./confirmar-fusion";

export const metadata = { title: "Clientes duplicados — Pime Suite" };

const campo = "w-full min-h-11 rounded-lg border border-line-mid bg-fill px-3 text-base sm:text-sm text-fg focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
const etiqueta = "block text-fg-dim text-xs font-semibold uppercase tracking-widest mb-2";
const nombre = (c: { name: string; company: string | null }) => c.company || c.name;

export default async function DuplicadosPage({ searchParams }: { searchParams: Promise<{ queda?: string; otro?: string }> }) {
  const u = await getEmpresaUser();
  const sp = await searchParams;
  const [clientes, resumen] = await Promise.all([
    prisma.client.findMany({
      where: { userId: u.id, archivedAt: null },
      select: { id: true, name: true, company: true, email: true, ruc: true, phone: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    sp.queda && sp.otro ? resumenFusion(u.id, sp.queda.slice(0, 40), sp.otro.slice(0, 40)) : Promise.resolve(null),
  ]);
  const grupos = agruparDuplicados(clientes);
  const pidioFusion = !!(sp.queda && sp.otro);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        eyebrow={<Link href="/empresa/clientes" className="inline-flex min-h-11 items-center text-sm text-fg-dim hover:text-fg lg:min-h-0 sm:mb-2">← Clientes</Link>}
        title="Clientes duplicados"
        description="Posibles repetidos por correo, RUC o nombre casi igual. Al fusionar, todo pasa al cliente que eliges y el otro se borra."
      />

      {pidioFusion && !resumen && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">No encontré esos dos clientes (o elegiste el mismo dos veces). Elige otra vez.</p>
      )}

      {resumen && (
        <section className="bg-panel border border-brand/40 rounded-2xl p-4 sm:p-6 space-y-4" aria-labelledby="confirmar">
          <div>
            <h2 id="confirmar" className="text-fg font-semibold">Revisa la fusión</h2>
            <p className="text-fg-dim text-sm">Queda <span className="font-semibold text-fg [overflow-wrap:anywhere]">{nombre(resumen.queda)}</span>. Se borra <span className="font-semibold text-fg [overflow-wrap:anywhere]">{nombre(resumen.otro)}</span> después de pasar todo lo suyo.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-line bg-fill p-4 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-fg-dim">Se mueve al que queda</h3>
              {resumen.mueve.length ? (
                <ul className="space-y-1 text-sm text-fg">
                  {resumen.mueve.map((r) => <li key={r.clave} className="flex justify-between gap-3"><span>{r.label}</span><span className="font-mono">{r.n}</span></li>)}
                </ul>
              ) : <p className="text-sm text-fg-dim">No tiene documentos, proyectos ni historial: solo se borra la ficha repetida.</p>}
            </div>
            <div className="rounded-xl border border-line bg-fill p-4 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-fg-dim">Datos que se completan</h3>
              {resumen.completados.length || resumen.etiquetasNuevas.length ? (
                <ul className="space-y-1 text-sm text-fg">
                  {resumen.completados.map((c) => <li key={c.campo} className="[overflow-wrap:anywhere]"><span className="text-fg-dim">{CAMPO_LABEL[c.campo]}:</span> {c.campo === "responsableId" || c.campo === "logoKey" ? "se toma del otro" : c.valor}</li>)}
                  {resumen.etiquetasNuevas.length > 0 && <li className="[overflow-wrap:anywhere]"><span className="text-fg-dim">Etiquetas:</span> {resumen.etiquetasNuevas.join(", ")}</li>}
                </ul>
              ) : <p className="text-sm text-fg-dim">El que queda ya tiene todos sus datos; no se pisa nada.</p>}
              <p className="text-xs text-fg-dim">Nunca se reemplaza un dato que el que queda ya tiene.</p>
            </div>
          </div>
          <ConfirmarFusion quedaId={resumen.queda.id} otroId={resumen.otro.id} nombreOtro={nombre(resumen.otro)} nombreQueda={nombre(resumen.queda)} />
        </section>
      )}

      {grupos.length === 0 ? (
        <div className="bg-panel border border-line rounded-2xl p-12 text-center space-y-4">
          <p className="text-fg font-medium">No encontré clientes repetidos.</p>
          <p className="text-fg-dim text-sm">Se revisan correo, RUC y nombre o empresa (sin tildes, mayúsculas ni «S.A.»). Si sabes de dos que son el mismo, elígelos abajo.</p>
          <Link href="/empresa/clientes" className={btn.secondary}>Volver a la lista</Link>
        </div>
      ) : (
        <section className="space-y-4" aria-labelledby="grupos">
          <h2 id="grupos" className="text-fg font-semibold">{grupos.length} {grupos.length === 1 ? "grupo" : "grupos"} de posibles duplicados</h2>
          {grupos.map((g) => {
            const queda = g.clientes[0];
            return (
              <div key={g.clave} className="bg-panel border border-line rounded-2xl overflow-hidden">
                <div className="flex flex-wrap gap-2 border-b border-line px-4 sm:px-6 py-3">
                  {g.motivos.map((m) => <span key={m} className="rounded-full bg-warn/10 px-3 py-1 text-xs font-semibold text-warn">{MOTIVO_LABEL[m]}</span>)}
                </div>
                <ul className="divide-y divide-line">
                  {g.clientes.map((c, i) => (
                    <li key={c.id} className="flex flex-col gap-3 px-4 sm:px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <Link href={`/empresa/clientes/${c.id}`} className="block font-medium text-fg hover:underline [overflow-wrap:anywhere]">{nombre(c)}</Link>
                        <p className="text-xs text-fg-dim [overflow-wrap:anywhere]">{[c.company ? c.name : null, c.email, c.ruc && `RUC ${c.ruc}`, c.phone, `Creado ${fechaCorta(c.createdAt)}`].filter(Boolean).join(" · ")}</p>
                      </div>
                      {i === 0
                        ? <span className="shrink-0 self-start rounded-full bg-ok/10 px-3 py-1 text-xs font-semibold text-ok sm:self-center">El más antiguo</span>
                        : (
                          <div className="grid shrink-0 grid-cols-1 gap-2 sm:flex">
                            <Link href={`/empresa/clientes/duplicados?queda=${queda.id}&otro=${c.id}#confirmar`} className={btn.secondary}>Fusionar en el más antiguo</Link>
                            <Link href={`/empresa/clientes/duplicados?queda=${c.id}&otro=${queda.id}#confirmar`} className={btn.secondary}>Que quede este</Link>
                          </div>
                        )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>
      )}

      {clientes.length >= 2 && (
        <form className="bg-panel border border-line rounded-2xl p-4 sm:p-6 space-y-4">
          <div>
            <h2 className="text-fg font-semibold">Fusionar otros dos clientes</h2>
            <p className="text-fg-dim text-sm">Para repetidos que no salen arriba (por ejemplo, con nombres muy distintos). Antes de fusionar ves el resumen.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block min-w-0">
              <span className={etiqueta}>Queda</span>
              <select name="queda" required defaultValue={sp.queda ?? ""} className={campo}>
                <option value="" disabled>Elige el cliente que queda</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{nombre(c)}{c.email ? ` · ${c.email}` : ""}</option>)}
              </select>
            </label>
            <label className="block min-w-0">
              <span className={etiqueta}>Se fusiona y se borra</span>
              <select name="otro" required defaultValue={sp.otro ?? ""} className={campo}>
                <option value="" disabled>Elige el repetido</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{nombre(c)}{c.email ? ` · ${c.email}` : ""}</option>)}
              </select>
            </label>
          </div>
          <button className={btn.secondary}>Ver qué se mueve</button>
        </form>
      )}
    </div>
  );
}
