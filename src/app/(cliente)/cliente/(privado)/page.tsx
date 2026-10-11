import Link from "next/link";
import { getPortalUser } from "@/lib/portal/sesion";
import { datosInicio, dinero } from "@/lib/portal/datos";
import { FASE_ESTADO_LABEL, TICKET_ESTADO_LABEL, type FaseEstado, type TicketEstado } from "@/lib/portal/estados";
import { Barra, Encabezado, Etiqueta, Fila, Tarjeta, TituloSeccion, Vacio, btnPrincipal, btnSecundario, fechaCorta, haceCuanto } from "@/components/portal/ui";
import { IconMas } from "@/components/portal/iconos";

export const metadata = { title: "Inicio" };

export default async function InicioCliente() {
  const persona = await getPortalUser();
  const d = await datosInicio(persona.clientId);
  const nombre = (persona.fullName || "").split(" ")[0];
  const principal = d.activos[0] ?? null;

  const resumen = [
    d.activos.length ? `${d.activos.length} ${d.activos.length === 1 ? "proyecto en curso" : "proyectos en curso"}` : null,
    d.tickets.length ? `${d.tickets.length} ${d.tickets.length === 1 ? "ticket abierto" : "tickets abiertos"}` : null,
    d.saldo.pendiente > 0 ? `${dinero(d.saldo.pendiente)} por pagar` : null,
  ].filter(Boolean).join(" · ");

  return (
    <>
      <Encabezado
        eyebrow={persona.client.company || persona.client.name}
        titulo={nombre ? `Hola, ${nombre}` : "Tu cuenta"}
        detalle={resumen || "Aquí vas a ver el avance de tus proyectos, tus tickets y tus pagos."}
        accion={<Link href="/cliente/tickets/nuevo" className={btnPrincipal}><IconMas />Abrir un ticket</Link>}
      />

      {d.decisiones.length > 0 && (
        <Tarjeta className="border-sand/60 bg-sand/10">
          <TituloSeccion accion={<Etiqueta tono="aviso">{d.decisiones.length} {d.decisiones.length === 1 ? "pendiente" : "pendientes"}</Etiqueta>}>Espera tu decisión</TituloSeccion>
          <ul className="divide-y divide-line">
            {d.decisiones.map((x) => <Fila key={`${x.tipo}-${x.id}`} href={x.href} titulo={x.titulo} detalle={x.detalle} />)}
          </ul>
        </Tarjeta>
      )}

      <div className="grid gap-6 lg:grid-cols-5 items-start">
        <Tarjeta className="lg:col-span-3">
          <TituloSeccion accion={principal ? <Link href={`/cliente/proyectos/${principal.id}`} className="text-sm font-semibold text-brand-fg hover:underline">Ver detalle</Link> : undefined}>
            {principal ? "Proyecto en curso" : "Proyectos"}
          </TituloSeccion>
          {principal ? (
            <div className="space-y-6">
              <div className="space-y-1">
                <p className="text-fg text-xl font-bold tracking-tight break-words">{principal.name}</p>
                <p className="text-fg-dim text-sm">
                  {principal.actual
                    ? <>Fase {principal.phases.indexOf(principal.actual) + 1} de {principal.phases.length}: <b className="text-fg">{principal.actual.name}</b></>
                    : principal.phases.length ? "Todas las fases terminadas" : "Las fases aparecen aquí cuando Pime las cargue."}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-fg-dim text-sm">Avance del proyecto</span>
                  <span className="text-fg text-3xl font-bold tabular-nums tracking-tight">{Math.round(principal.avance)} %</span>
                </div>
                <Barra valor={principal.avance} etiqueta={`Avance de ${principal.name}`} />
              </div>
              {principal.phases.length > 0 && (
                <ol className="grid gap-2">
                  {principal.phases.map((f, i) => (
                    <li key={f.id} className="flex items-center gap-3 text-sm min-w-0">
                      <span className={`grid place-items-center h-6 w-6 shrink-0 rounded-full text-xs font-bold tabular-nums ${f.status === "hecha" ? "bg-ok text-on-solid" : f.id === principal.actual?.id ? "bg-brand text-on-brand" : "bg-fill-3 text-fg-dim"}`}>{i + 1}</span>
                      <span className={`min-w-0 flex-1 truncate ${f.id === principal.actual?.id ? "text-fg font-semibold" : "text-fg-mute"}`}>{f.name}</span>
                      <span className="text-fg-faint text-xs whitespace-nowrap">{FASE_ESTADO_LABEL[f.status as FaseEstado] ?? f.status}</span>
                    </li>
                  ))}
                </ol>
              )}
              {d.activos.length > 1 && <Link href="/cliente/proyectos" className={btnSecundario}>Ver los {d.activos.length} proyectos</Link>}
            </div>
          ) : (
            <Vacio titulo="Todavía no hay proyectos en curso" texto="Cuando Pime arranque un proyecto o una modificación para ti, aquí vas a ver sus fases y el avance en vivo." />
          )}
        </Tarjeta>

        <Tarjeta className="lg:col-span-2">
          <TituloSeccion accion={<Link href="/cliente/facturas" className="text-sm font-semibold text-brand-fg hover:underline">Facturas</Link>}>Tu saldo con Pime</TituloSeccion>
          <div className="space-y-6">
            <div>
              <p className="text-fg-dim text-sm">Por pagar</p>
              <p className="text-fg text-4xl font-bold tabular-nums tracking-tight">{dinero(d.saldo.pendiente)}</p>
            </div>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-xl bg-fill px-4 py-3"><dt className="text-fg-dim">Pagado</dt><dd className="text-fg font-semibold tabular-nums">{dinero(d.saldo.pagado)}</dd></div>
              <div className="rounded-xl bg-fill px-4 py-3"><dt className="text-fg-dim">Facturado</dt><dd className="text-fg font-semibold tabular-nums">{dinero(d.saldo.facturado)}</dd></div>
            </dl>
            {d.saldo.porConfirmar > 0 && <p className="text-sm text-fg-dim">Pagos reportados esperando confirmación: <b className="text-fg tabular-nums">{dinero(d.saldo.porConfirmar)}</b></p>}
            {d.proximo ? (
              <p className="text-sm text-fg-dim">Próximo vencimiento: <b className="text-fg">{d.proximo.number ?? "Factura"}</b> el {fechaCorta(d.proximo.dueDate)}</p>
            ) : (
              <p className="text-sm text-fg-dim">{d.saldo.facturado ? "No tienes pagos vencidos ni por vencer." : "Todavía no hay facturas en tu cuenta."}</p>
            )}
          </div>
        </Tarjeta>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 items-start">
        <Tarjeta>
          <TituloSeccion accion={<Link href="/cliente/tickets" className="text-sm font-semibold text-brand-fg hover:underline">Todos</Link>}>Tickets abiertos</TituloSeccion>
          {d.tickets.length ? (
            <ul className="divide-y divide-line">
              {d.tickets.slice(0, 5).map((t) => (
                <Fila key={t.id} href={`/cliente/tickets/${t.id}`} titulo={t.title} detalle={`${t.number} · ${haceCuanto(t.updatedAt)}`}
                  derecha={<Etiqueta tono={t.status === "esperando_cliente" ? "aviso" : "marca"}>{TICKET_ESTADO_LABEL[t.status as TicketEstado] ?? t.status}</Etiqueta>} />
              ))}
            </ul>
          ) : (
            <Vacio titulo="No tienes tickets abiertos" texto="Si algo no funciona o quieres un cambio, abre un ticket con capturas y te respondemos desde aquí." />
          )}
        </Tarjeta>
        <Tarjeta>
          <TituloSeccion>Lo último</TituloSeccion>
          {d.eventos.length ? (
            <ol className="space-y-4">
              {d.eventos.map((e) => (
                <li key={e.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
                  <span className="mt-2 h-2 w-2 rounded-full bg-brand" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-fg text-sm font-semibold break-words">{e.title}</p>
                    {e.detail && <p className="text-fg-dim text-sm break-words">{e.detail}</p>}
                    <p className="text-fg-faint text-xs mt-1">{haceCuanto(e.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <Vacio titulo="Sin movimientos todavía" texto="Cada avance de fase, aprobación, factura y respuesta de Pime aparece aquí en orden." />
          )}
        </Tarjeta>
      </div>
    </>
  );
}
