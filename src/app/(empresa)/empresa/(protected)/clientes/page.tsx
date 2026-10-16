import Link from "@/components/empresa/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { dinero } from "@/lib/portal/datos";
import { PageHeader, btn } from "@/components/empresa/page-header";
import { cargarClientes } from "@/lib/crm/listas-datos";
import { FILTROS_RAPIDOS, ORDENES, SIN_CONTACTO, aQuery, diasDesde, haceCuanto, hayFiltros, leerFiltros, paginar, type Filtros } from "@/lib/crm/listas";
import { TablaClientes, type FilaTabla } from "@/components/empresa/crm-listas/tabla-clientes";
import { VistasGuardadas } from "@/components/empresa/crm-listas/vistas-guardadas";

export const metadata = { title: "Clientes — Pime Suite" };

const campo = "w-full min-h-11 rounded-lg border border-line-mid bg-fill px-3 text-base sm:text-sm text-fg focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
const etiqueta = "block text-fg-dim text-xs font-semibold uppercase tracking-widest mb-2";

export default async function ClientesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const u = await getEmpresaUser();
  const f = leerFiltros(await searchParams);
  const [datos, vistas] = await Promise.all([
    cargarClientes(u, f),
    prisma.vistaGuardada.findMany({ where: { miembroId: u.miembro.id, entidad: "clientes" }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true, filtros: true } }),
  ]);
  const { filas, externos, porCobrar, equipo, opciones } = datos;
  const pag = paginar(filas, f.pagina);
  const ahora = Date.now();

  const href = (cambio: Partial<Filtros>) => { const qs = aQuery(f, cambio); return `/empresa/clientes${qs ? `?${qs}` : ""}`; };
  const query = aQuery({ ...f, pagina: 1 });
  const filtrado = hayFiltros(f);
  const avanzados = !!(f.etiqueta || f.fuente || f.industria || f.responsable || f.contacto);
  const nombreResp = (id: string) => (id === "sin" ? "Sin responsable" : equipo.find((e) => e.id === id)?.nombre ?? "Responsable");
  // Nombre sugerido para guardar la vista: lo que se filtró, en palabras.
  const sugerido = [
    f.filtro && FILTROS_RAPIDOS.find((x) => x.id === f.filtro)?.label,
    f.etiqueta && `Etiqueta ${f.etiqueta}`, f.fuente, f.industria,
    f.responsable && nombreResp(f.responsable),
    f.contacto && `Sin contacto ${f.contacto} días`,
    f.q && `«${f.q}»`,
  ].filter(Boolean).join(" · ").slice(0, 60) || "Mi vista";

  const tabla: FilaTabla[] = pag.items.map((c) => {
    const dias = diasDesde(c.contacto, ahora);
    return {
      id: c.id, titulo: c.company || c.name, sub: c.company ? c.name : c.email ?? "", etiquetas: c.etiquetas, internal: c.internal,
      premium: c.brandLine === "premium", cuenta: c.cuenta,
      actividad: `${c.proyectos ? `${c.proyectos} ${c.proyectos === 1 ? "proyecto" : "proyectos"} en curso` : "Sin proyectos en curso"}${c.tickets ? ` · ${c.tickets} ${c.tickets === 1 ? "ticket" : "tickets"}` : ""}`,
      responsable: c.responsable, contacto: haceCuanto(c.contacto, ahora), contactoViejo: !c.internal && (dias == null || dias > 60),
      saldo: c.internal ? "No aplica" : c.saldo > 0 ? dinero(c.saldo) : "Al día", debe: !c.internal && c.saldo > 0,
    };
  });

  const chip = (activo: boolean) =>
    `inline-flex shrink-0 items-center min-h-11 sm:min-h-10 px-4 rounded-full border text-sm font-semibold ${activo ? "border-brand bg-brand/10 text-brand-fg" : "border-line-mid text-fg-mute hover:text-fg"}`;
  const ocultos = (sin: (keyof Filtros)[]) =>
    (["q", "filtro", "orden", "etiqueta", "fuente", "industria", "responsable", "contacto"] as const)
      .filter((k) => !sin.includes(k) && f[k])
      .map((k) => <input key={k} type="hidden" name={k} value={String(f[k])} />);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Clientes"
        description={<>{externos} {externos === 1 ? "cliente" : "clientes"} · Por cobrar <span className="font-mono text-fg">{dinero(porCobrar)}</span></>}
        actions={<Link href="/empresa/clientes/nuevo" className={btn.primary}>+ Nuevo cliente</Link>}
      />

      <div className="space-y-4">
        <form className="flex gap-2" role="search">
          <input name="q" defaultValue={f.q} placeholder="Buscar por nombre, empresa, correo, teléfono o RUC" aria-label="Buscar clientes" className="w-full min-h-11 rounded-lg border border-line-mid bg-panel px-3 text-base sm:text-sm text-fg placeholder:text-fg-trace focus:outline-none focus:border-brand" />
          {ocultos(["q"])}
          <button className={btn.secondary}>Buscar</button>
        </form>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <nav aria-label="Filtrar clientes" className="flex flex-wrap gap-2">
            {FILTROS_RAPIDOS.map((x) => <Link key={x.id || "todos"} href={href({ filtro: x.id })} aria-current={f.filtro === x.id ? "page" : undefined} className={chip(f.filtro === x.id)}>{x.label}</Link>)}
          </nav>
          <form className="flex items-center gap-2">
            {ocultos(["orden"])}
            <label htmlFor="orden" className="shrink-0 text-xs text-fg-dim">Ordenar</label>
            {/* Sin JavaScript también funciona: el botón aplica el orden. */}
            <select id="orden" name="orden" defaultValue={f.orden} className={`${campo} sm:w-56`}>
              {ORDENES.map((o) => <option key={o.id || "recientes"} value={o.id}>{o.label}</option>)}
            </select>
            <button className={btn.secondary}>Ordenar</button>
          </form>
        </div>

        <details open={avanzados} className="group rounded-2xl border border-line bg-panel">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 sm:px-6 py-3 text-sm font-semibold text-fg">
            <span>Más filtros{avanzados ? " · activos" : ""}</span>
            <span className="text-xs font-normal text-fg-dim group-open:hidden">Etiqueta, fuente, industria, responsable y último contacto</span>
          </summary>
          <form className="grid gap-4 border-t border-line px-4 sm:px-6 py-4 sm:grid-cols-2 lg:grid-cols-3">
            {ocultos(["etiqueta", "fuente", "industria", "responsable", "contacto"])}
            <label className="block min-w-0">
              <span className={etiqueta}>Etiqueta</span>
              <select name="etiqueta" defaultValue={f.etiqueta} className={campo}>
                <option value="">Cualquier etiqueta</option>
                {opciones.etiquetas.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </label>
            <label className="block min-w-0">
              <span className={etiqueta}>Fuente</span>
              <select name="fuente" defaultValue={f.fuente} className={campo}>
                <option value="">Cualquier fuente</option>
                {opciones.fuentes.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </label>
            <label className="block min-w-0">
              <span className={etiqueta}>Industria</span>
              <select name="industria" defaultValue={f.industria} className={campo}>
                <option value="">Cualquier industria</option>
                {opciones.industrias.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </label>
            <label className="block min-w-0">
              <span className={etiqueta}>Responsable</span>
              <select name="responsable" defaultValue={f.responsable} className={campo}>
                <option value="">Cualquiera</option>
                {equipo.map((e) => <option key={e.id} value={e.id}>{e.id === u.miembro.id ? `${e.nombre} (tú)` : e.nombre}</option>)}
                <option value="sin">Sin responsable</option>
              </select>
            </label>
            <label className="block min-w-0">
              <span className={etiqueta}>Último contacto</span>
              <select name="contacto" defaultValue={f.contacto} className={campo}>
                {SIN_CONTACTO.map((o) => <option key={o.id || "cualquiera"} value={o.id}>{o.label}</option>)}
              </select>
              <span className="mt-1 block text-xs text-fg-dim">Cuenta lo anotado y el último documento, pago, ticket o proyecto.</span>
            </label>
            <div className="flex items-end gap-2">
              <button className={`${btn.primary} flex-1`}>Aplicar filtros</button>
              {avanzados && <Link href={href({ etiqueta: "", fuente: "", industria: "", responsable: "", contacto: "" })} className={btn.secondary}>Quitar</Link>}
            </div>
          </form>
        </details>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <VistasGuardadas vistas={vistas.map((v) => ({ id: v.id, nombre: v.nombre, query: aQuery(leerFiltros((v.filtros ?? {}) as Record<string, unknown>)) }))} query={query} nombreSugerido={sugerido} hayFiltros={filtrado} />
          </div>
          <div className="grid grid-cols-3 gap-2 sm:flex">
            <a href={`/api/empresa/clientes/exportar${query ? `?${query}` : ""}`} download className={btn.secondary} title="Descarga en CSV los clientes de este filtro">Exportar{filas.length ? ` ${filas.length}` : ""}</a>
            <Link href="/empresa/clientes/importar" className={btn.secondary}>Importar</Link>
            <Link href="/empresa/clientes/duplicados" className={btn.secondary}>Duplicados</Link>
            <Link href="/empresa/clientes/archivados" className={btn.secondary}>Archivados</Link>
          </div>
        </div>
      </div>

      {filas.length === 0 ? (
        <div className="bg-panel border border-line rounded-2xl p-12 text-center space-y-4">
          <p className="text-fg font-medium [overflow-wrap:anywhere]">{f.q ? `No hay clientes que coincidan con «${f.q}».` : filtrado ? "Ningún cliente cumple estos filtros." : "Todavía no hay clientes."}</p>
          <p className="text-fg-dim text-sm">{filtrado ? "Quita algún filtro o busca con otras palabras." : "Crea el cliente una vez: de su ficha salen proyectos, tickets, facturas y su cuenta en Pime. Si ya los tienes en una hoja, impórtalos."}</p>
          <div className="flex flex-col justify-center gap-2 sm:flex-row">
            {filtrado
              ? <Link href="/empresa/clientes" className={btn.secondary}>Ver todos los clientes</Link>
              : <>
                  <Link href="/empresa/clientes/nuevo" className={btn.primary}>Crear el primer cliente</Link>
                  <Link href="/empresa/clientes/importar" className={btn.secondary}>Importar desde una hoja</Link>
                </>}
          </div>
        </div>
      ) : (
        <>
          <TablaClientes filas={tabla} equipo={equipo} etiquetas={opciones.etiquetas} />
          {pag.paginas > 1 && (
            <nav aria-label="Páginas de la lista" className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
              <p className="text-sm text-fg-dim">Clientes {pag.desde}–{pag.hasta} de {pag.total} · página {pag.pagina} de {pag.paginas}</p>
              <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
                {pag.pagina > 1
                  ? <Link href={href({ pagina: pag.pagina - 1 })} className={btn.secondary} rel="prev">← Anterior</Link>
                  : <span className={`${btn.secondary} opacity-50`} aria-disabled>← Anterior</span>}
                {pag.pagina < pag.paginas
                  ? <Link href={href({ pagina: pag.pagina + 1 })} className={btn.secondary} rel="next">Siguiente →</Link>
                  : <span className={`${btn.secondary} opacity-50`} aria-disabled>Siguiente →</span>}
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
