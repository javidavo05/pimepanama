/**
 * Resumen del proyecto: todo lo que el cliente ha hecho con Pime, no solo este proyecto.
 *
 * - Totales de toda la relación: trabajado (facturado + fases iniciadas sin factura), cobrado y por cobrar,
 *   con las mismas cuentas que la ficha del cliente (saldoCliente / ingresosDelCliente).
 * - Trabajo: cada proyecto del cliente con todas sus fases, y lo facturado que no cuelga de ningún
 *   proyecto. Esos huecos quedan a la vista para llenarlos después con el asistente.
 * - Historial: facturas, cotizaciones, pagos y reuniones en una sola línea de tiempo, lo más nuevo arriba.
 * Todo llega ya leído del servidor (fichaCliente + reuniones del cliente).
 */
import Link from "@/components/empresa/link";
import type { DocumentStatus } from "@prisma/client";
import type { fichaCliente } from "@/lib/portal/ficha";
import { FASE_ESTADO_LABEL, PAGO_METODO_LABEL, type FaseEstado, type PagoMetodo } from "@/lib/portal/estados";
import { dinero } from "@/lib/portal/datos";
import { fechaCorta } from "@/lib/format-datetime";
import { StatusBadge } from "@/components/empresa/document-builder/status-badge";
import { PROJECT_STATUS_LABEL } from "./types";
import { IrAPestana } from "./ir-a-pestana";

type Ficha = NonNullable<Awaited<ReturnType<typeof fichaCliente>>>;
export type ReunionCliente = { id: string; title: string; meetingDate: Date; contextSummary: string | null; projectId: string | null };

const card = "bg-panel border border-line rounded-2xl p-4 sm:p-6 min-w-0";
const h2 = "text-fg text-base font-semibold tracking-tight";
const h3 = "text-fg-dim text-xs font-semibold uppercase tracking-wider";
const enlace = "inline-flex items-center min-h-11 sm:min-h-8 text-sm text-brand-fg hover:underline shrink-0";
const mesAnio = (d: Date) => new Date(d).toLocaleDateString("es-PA", { month: "long", year: "numeric", timeZone: "America/Panama" });
const VISIBLES = 8;

type Evento = { key: string; fecha: Date; titulo: string; detalle: string | null; monto: number | null; estado?: DocumentStatus; href?: string };

export function ResumenCliente({ f, reuniones, projectId }: { f: Ficha; reuniones: ReunionCliente[]; projectId: string }) {
  const nombre = f.cliente.company || f.cliente.name;
  const trabajado = f.saldo.facturado + f.saldo.sinFacturar;
  const pct = trabajado > 0 ? Math.min(100, (f.saldo.pagado / trabajado) * 100) : 0;
  const nombreProyecto = new Map(f.proyectos.map((p) => [p.id, p.name]));
  const facturasVivas = f.facturas.filter((x) => x.status !== "CANCELLED");
  const sinProyecto = facturasVivas.filter((x) => !x.projectId);
  const ultima = reuniones[0] ?? null;

  const eventos: Evento[] = [
    ...facturasVivas.map((x) => ({
      key: `f${x.id}`, fecha: x.issueDate, titulo: `Factura ${x.number ?? ""}`.trim(),
      detalle: [x.projectId ? nombreProyecto.get(x.projectId) : "Sin proyecto", x.falta > 0.005 && x.status !== "DRAFT" ? `falta ${dinero(x.falta)}` : null].filter(Boolean).join(" · "),
      monto: Number(x.total ?? 0), estado: x.status as DocumentStatus, href: `/empresa/facturas/${x.id}`,
    })),
    ...f.cotizaciones.filter((x) => x.status !== "CANCELLED").map((x) => ({
      key: `c${x.id}`, fecha: x.issueDate, titulo: `Cotización ${x.number ?? ""}`.trim(), detalle: x.title,
      monto: Number(x.total ?? 0), estado: x.status as DocumentStatus, href: `/empresa/cotizaciones/${x.id}`,
    })),
    ...f.pagos.filter((p) => p.status === "confirmado").map((p) => ({
      key: `p${p.id}`, fecha: p.paidAt, titulo: "Pago recibido",
      detalle: [PAGO_METODO_LABEL[p.method as PagoMetodo] ?? null, p.projectId ? nombreProyecto.get(p.projectId) ?? null : null].filter(Boolean).join(" · ") || null,
      monto: Number(p.amount),
    })),
    ...reuniones.map((m) => ({
      key: `m${m.id}`, fecha: m.meetingDate, titulo: `Reunión · ${m.title}`,
      detalle: m.projectId ? nombreProyecto.get(m.projectId) ?? null : "Sin proyecto", monto: null, href: `/empresa/reuniones/${m.id}`,
    })),
  ].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

  const tiles: { k: string; v: string; nota: string; tono: string; tab: string }[] = [
    { k: "Trabajado", v: dinero(trabajado), nota: `${facturasVivas.length} ${facturasVivas.length === 1 ? "factura" : "facturas"}${f.saldo.sinFacturar > 0.005 ? ` · ${dinero(f.saldo.sinFacturar)} sin facturar` : ""}`, tono: "text-fg", tab: "facturas" },
    { k: "Cobrado", v: dinero(f.saldo.pagado), nota: trabajado > 0 ? `${Math.round(pct)} % de lo trabajado` : "Todavía nada", tono: f.saldo.pagado > 0 ? "text-ok" : "text-fg-dim", tab: "facturas" },
    { k: "Por cobrar", v: dinero(f.saldo.pendiente), nota: f.saldo.pendiente > 0.005 ? "Sumando todo" : "Está al día", tono: f.saldo.pendiente > 0.005 ? "text-warn" : "text-fg-dim", tab: "dinero" },
    { k: "Reuniones", v: String(reuniones.length), nota: ultima ? `Última ${fechaCorta(ultima.meetingDate)}` : "Ninguna todavía", tono: reuniones.length ? "text-fg" : "text-fg-dim", tab: "reuniones" },
  ];

  return (
    <div className="space-y-6 min-w-0">
      {/* Totales de toda la relación */}
      <section aria-labelledby="todo-cliente" className={`${card} space-y-4`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="todo-cliente" className={`${h2} [overflow-wrap:anywhere]`}>Todo con {nombre}</h2>
            <p className="text-fg-dim text-sm">
              {f.ingresos.desde ? `Cliente desde ${mesAnio(f.ingresos.desde)}` : "Sin pagos todavía"} · {f.proyectos.length} {f.proyectos.length === 1 ? "proyecto" : "proyectos"}
            </p>
          </div>
          <Link href={`/empresa/clientes/${f.cliente.id}`} className={enlace}>Ver ficha</Link>
        </div>
        {trabajado > 0 && (
          <div className="h-2 rounded-full bg-fill-3 overflow-hidden" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Cobrado de lo trabajado">
            <div className="h-full rounded-full bg-ok origin-left" style={{ transform: `scaleX(${pct / 100})` }} />
          </div>
        )}
        <ul className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {tiles.map((t) => (
            <li key={t.k} className="min-w-0">
              <IrAPestana tab={t.tab} className="w-full h-full rounded-xl bg-fill hover:bg-fill-2 px-4 py-3 min-h-16 min-w-0 text-left transition-colors">
                <span className="block text-fg-dim text-xs">{t.k}</span>
                <span className={`block text-base font-semibold font-mono tabular-nums truncate ${t.tono}`}>{t.v}</span>
                <span className="block text-fg-faint text-xs [overflow-wrap:anywhere]">{t.nota}</span>
              </IrAPestana>
            </li>
          ))}
        </ul>
        <div className="border-t border-line pt-4">
          <h3 className={h3}>Lo último que se habló</h3>
          {ultima ? (
            <div className="mt-1 min-w-0">
              <p className="text-fg text-sm font-medium [overflow-wrap:anywhere]">{ultima.title} · <span className="text-fg-dim font-normal">{fechaCorta(ultima.meetingDate)}</span></p>
              <p className="mt-1 text-fg-mute text-sm leading-relaxed line-clamp-4 [overflow-wrap:anywhere]">
                {ultima.contextSummary || "Sin resumen todavía: se genera al terminar de procesar la grabación."}
              </p>
            </div>
          ) : (
            <p className="mt-1 text-fg-dim text-sm">Sin reuniones con este cliente. Al grabar o enlazar una, su resumen aparece aquí.</p>
          )}
        </div>
      </section>

      {/* Trabajo: todos sus proyectos con todas sus fases */}
      <section aria-labelledby="trabajo-cliente" className={card}>
        <h2 id="trabajo-cliente" className={h2}>Todo el trabajo</h2>
        <div className="mt-4 space-y-6">
          {f.proyectos.map((p) => (
            <div key={p.id} className="min-w-0">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-fg text-sm font-semibold min-w-0 [overflow-wrap:anywhere]">
                  {p.id === projectId ? p.name : <Link href={`/empresa/proyectos/${p.id}`} className="hover:text-brand-fg">{p.name}</Link>}
                  <span className="text-fg-dim font-normal"> · {PROJECT_STATUS_LABEL[p.status] ?? p.status}{p.id === projectId ? " · este proyecto" : ""}</span>
                </h3>
                <span className="text-fg-dim text-sm tabular-nums shrink-0">{Math.round(p.avance)} %</span>
              </div>
              {p.phases.length ? (
                <ol className="mt-2 divide-y divide-line">
                  {p.phases.map((fa) => (
                    <li key={fa.id} className="flex items-center justify-between gap-3 py-2 min-h-11">
                      <span className="min-w-0 text-sm text-fg-mute [overflow-wrap:anywhere]">{fa.name}</span>
                      <span className="flex items-center gap-3 shrink-0 text-xs">
                        <span className="font-mono tabular-nums text-fg">{dinero(fa.price)}</span>
                        <span className={`rounded-full px-2 py-1 font-semibold ${fa.status === "hecha" ? "bg-ok/10 text-ok" : fa.status === "pendiente" ? "bg-fill-2 text-fg-dim" : "bg-brand/10 text-brand-fg"}`}>
                          {FASE_ESTADO_LABEL[fa.status as FaseEstado] ?? fa.status}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-1 text-sm text-fg-dim">Sin fases cargadas.</p>
              )}
            </div>
          ))}
          {sinProyecto.length > 0 && (
            <div className="min-w-0">
              <h3 className="text-fg text-sm font-semibold">Facturado sin proyecto <span className="text-fg-dim font-normal">· {sinProyecto.length}</span></h3>
              <p className="text-fg-dim text-xs">Trabajo anterior que no cuelga de ninguna fase. Al ligarlo a su proyecto y fase, el avance lo cuenta.</p>
              <ul className="mt-2 divide-y divide-line">
                {sinProyecto.map((x) => (
                  <li key={x.id}>
                    <Link href={`/empresa/facturas/${x.id}`} className="flex items-center justify-between gap-3 py-2 min-h-11 hover:bg-fill -mx-2 px-2 rounded-lg">
                      <span className="min-w-0 text-sm text-fg-mute [overflow-wrap:anywhere]">{x.number ?? "Factura"} · {fechaCorta(x.issueDate)}</span>
                      <span className="flex items-center gap-3 shrink-0">
                        <span className="font-mono tabular-nums text-xs text-fg">{dinero(x.total)}</span>
                        <StatusBadge status={x.status as DocumentStatus} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* Historial */}
      <section aria-labelledby="historial-cliente" className={card}>
        <h2 id="historial-cliente" className={h2}>Historial <span className="text-fg-dim font-normal">· {eventos.length}</span></h2>
        {eventos.length ? (
          <>
            <ol className="mt-3 divide-y divide-line">{eventos.slice(0, VISIBLES).map((e) => <FilaEvento key={e.key} e={e} />)}</ol>
            {eventos.length > VISIBLES && (
              <details className="group">
                <summary className="inline-flex items-center min-h-11 cursor-pointer text-sm text-brand-fg hover:underline list-none">
                  <span className="group-open:hidden">Ver todo ({eventos.length})</span>
                  <span className="hidden group-open:inline">Ver menos</span>
                </summary>
                <ol className="divide-y divide-line border-t border-line">{eventos.slice(VISIBLES).map((e) => <FilaEvento key={e.key} e={e} />)}</ol>
              </details>
            )}
          </>
        ) : (
          <p className="mt-2 text-sm text-fg-dim">Todavía no hay facturas, pagos ni reuniones con este cliente. Lo que pase con él se va sumando aquí.</p>
        )}
      </section>
    </div>
  );
}

function FilaEvento({ e }: { e: Evento }) {
  const dentro = (
    <>
      <span className="text-fg-dim text-xs tabular-nums w-20 shrink-0">{fechaCorta(e.fecha)}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-fg text-sm [overflow-wrap:anywhere]">{e.titulo}</span>
        {e.detalle && <span className="block text-fg-dim text-xs [overflow-wrap:anywhere]">{e.detalle}</span>}
      </span>
      {(e.monto != null || e.estado) && (
        <span className="flex flex-col items-end gap-1 shrink-0">
          {e.monto != null && <span className="font-mono tabular-nums text-xs text-fg">{dinero(e.monto)}</span>}
          {e.estado && <StatusBadge status={e.estado} />}
        </span>
      )}
    </>
  );
  const fila = "flex items-start gap-3 py-3 min-h-12";
  return (
    <li>
      {e.href ? <Link href={e.href} className={`${fila} hover:bg-fill -mx-2 px-2 rounded-lg`}>{dentro}</Link> : <div className={fila}>{dentro}</div>}
    </li>
  );
}
