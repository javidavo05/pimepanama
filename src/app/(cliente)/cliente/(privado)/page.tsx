import Link from "next/link";
import { getPortalUser } from "@/lib/portal/sesion";
import { datosInicio, dinero, encuestasPendientes, pendientesDeDocumentos } from "@/lib/portal/datos";
import { esperaMiFirma, estadoPropuesta } from "@/lib/portal/documentos";
import { FASE_ESTADO_LABEL, TICKET_ESTADO_LABEL, type FaseEstado, type TicketEstado } from "@/lib/portal/estados";
import { Anillo, Barra, BloqueOscuro, Cifra, Mezcla, type Tono, Encabezado, Etiqueta, Eyebrow, Fila, Swap, Tarjeta, TituloSeccion, Vacio, btnPrincipal, btnSecundario, enlace, fechaCorta, haceCuanto } from "@/components/portal/ui";
import { IconCheck, IconFlecha, IconMas } from "@/components/portal/iconos";
import { EstadoSistemas, hayProblema } from "@/components/portal/sistemas";
import { sistemasDelCliente } from "@/lib/pulso/datos";

export const metadata = { title: "Inicio" };

export default async function InicioCliente() {
  const persona = await getPortalUser();
  const [d, sistemas, docs, encuestas] = await Promise.all([datosInicio(persona.clientId), sistemasDelCliente(persona.clientId), pendientesDeDocumentos(persona.clientId), encuestasPendientes(persona.clientId).catch(() => [])]);
  // Propuestas por responder (las vencidas no) y contratos que esperan la firma de esta persona.
  // También la encuesta de satisfacción de un proyecto terminado que todavía no respondió.
  const decisiones = [
    ...d.decisiones,
    ...docs.propuestas.filter((x) => estadoPropuesta({ status: "SENT", validUntil: x.validUntil }).tono === "aviso")
      .map((x) => ({ tipo: "propuesta" as const, id: x.id, titulo: `Revisar la propuesta: ${x.title}`, detalle: `${x.number ?? "Propuesta"} · ${dinero(x.total)}`, href: `/cliente/propuestas/${x.id}` })),
    ...docs.contratos.filter((c) => esperaMiFirma({ ...c, clientEmail: c.signingRequest?.clientEmail }, persona.email))
      .map((c) => ({ tipo: "contrato" as const, id: c.id, titulo: `Firmar el contrato: ${c.title}`, detalle: "Contrato", href: "/cliente/contratos" })),
    ...encuestas.map((e) => ({ tipo: "encuesta" as const, id: e.id, titulo: `Cuéntanos cómo te fue con ${e.proyecto}`, detalle: "Encuesta de un minuto", href: e.href })),
  ];
  const problema = hayProblema(sistemas);
  const nombre = (persona.fullName || "").split(" ")[0];
  const principal = d.activos[0] ?? null;
  const vencida = !!d.proximo?.dueDate && d.proximo.dueDate.getTime() < Date.now() && d.saldo.pendiente > 0.005;
  const estadoSaldo: [string, Tono] = vencida ? ["Hay una factura vencida", "peligro"] : d.saldo.pendiente > 0.005 ? ["Pendiente", "aviso"] : ["Al día", "ok"];

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
        accion={<Link href="/cliente/tickets/nuevo" className={btnPrincipal}><IconMas data-gira="" /><Swap>Abrir un ticket</Swap></Link>}
      />

      {problema && <EstadoSistemas sistemas={sistemas} />}

      {decisiones.length > 0 && (
        <Tarjeta className="p-aviso" i={1}>
          <TituloSeccion accion={<Etiqueta tono="aviso">{decisiones.length} {decisiones.length === 1 ? "pendiente" : "pendientes"}</Etiqueta>}>Espera tu decisión</TituloSeccion>
          <ul className="p-lista divide-y divide-line">
            {decisiones.map((x, i) => <Fila key={`${x.tipo}-${x.id}`} i={i} tono="aviso" href={x.href} titulo={x.titulo} detalle={x.detalle} />)}
          </ul>
        </Tarjeta>
      )}

      <div className="grid gap-6 lg:grid-cols-12 items-stretch">
        <Tarjeta className="lg:col-span-7" i={2}>
          <TituloSeccion accion={principal ? <Link href={`/cliente/proyectos/${principal.id}`} className={enlace}>Ver detalle</Link> : undefined}>
            {principal ? "Proyecto en curso" : "Proyectos"}
          </TituloSeccion>
          {principal ? (
            <div className="space-y-6">
              <div className="flex items-center gap-6">
                <Anillo valor={principal.avance} tam={112} etiqueta={`Avance de ${principal.name}`}>
                  <Cifra texto={`${Math.round(principal.avance)}`} className="text-fg text-3xl font-extrabold tracking-tight" demora={200} />
                  <span className="block text-fg-dim text-xs font-semibold">%</span>
                </Anillo>
                <div className="min-w-0 space-y-1">
                  <p className="text-fg text-xl sm:text-2xl font-extrabold tracking-tight break-words">{principal.name}</p>
                  <p className="text-fg-dim text-sm">
                    {principal.actual
                      ? <>Fase {principal.phases.indexOf(principal.actual) + 1} de {principal.phases.length}: <b className="text-fg">{principal.actual.name}</b></>
                      : principal.phases.length ? "Todas las fases terminadas" : "Las fases aparecen aquí cuando Pime las cargue."}
                  </p>
                </div>
              </div>
              <Barra valor={principal.avance} etiqueta={`Avance de ${principal.name}`} viva={!!principal.actual} />
              {principal.phases.length > 0 && (
                <ol className="p-pasos">
                  {principal.phases.map((f, i) => {
                    const hecha = f.status === "hecha";
                    const actual = f.id === principal.actual?.id;
                    return (
                      <li key={f.id} className="flex items-center gap-3 text-sm min-w-0" style={{ "--i": i } as React.CSSProperties}>
                        <span className={`p-chip ${hecha ? "hecha" : actual ? "actual" : ""}`} style={{ "--i": i } as React.CSSProperties}>
                          {actual && <svg viewBox="0 0 32 32" aria-hidden><circle cx="16" cy="16" r="15.2" pathLength={1} /></svg>}
                          {hecha ? <IconCheck width={16} height={16} /> : i + 1}
                        </span>
                        <span className={`min-w-0 flex-1 truncate ${actual ? "text-fg font-bold" : hecha ? "text-fg-mute" : "text-fg-dim"}`}>{f.name}</span>
                        <span className="text-fg-faint text-xs whitespace-nowrap">{FASE_ESTADO_LABEL[f.status as FaseEstado] ?? f.status}</span>
                      </li>
                    );
                  })}
                </ol>
              )}
              {d.activos.length > 1 && <Link href="/cliente/proyectos" className={btnSecundario}>Ver los {d.activos.length} proyectos</Link>}
            </div>
          ) : (
            <Vacio titulo="Todavía no hay proyectos en curso" texto="Cuando Pime arranque un proyecto o una modificación para ti, aquí vas a ver sus fases y el avance en vivo." />
          )}
        </Tarjeta>

        <BloqueOscuro className="lg:col-span-5 flex flex-col gap-6" i={3}>
          <div className="flex items-center justify-between gap-4">
            <Eyebrow>Tu saldo con Pime</Eyebrow>
            <Link href="/cliente/facturas" className="p-link">Facturas<IconFlecha width={16} height={16} /></Link>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="p-ink-2 text-sm">Por pagar</p>
              <Etiqueta tono={estadoSaldo[1]}>{estadoSaldo[0]}</Etiqueta>
            </div>
            <Cifra texto={dinero(d.saldo.pendiente)} moneda className="text-[clamp(36px,3.8vw,52px)] font-extrabold tracking-[-0.03em] leading-none" demora={300} />
          </div>
          <Mezcla etiqueta="Tu saldo" partes={[
            { label: "Pagado", valor: d.saldo.pagado, tono: "ok", texto: dinero(d.saldo.pagado) },
            { label: "Por pagar", valor: d.saldo.pendiente, tono: vencida ? "peligro" : "aviso", texto: dinero(d.saldo.pendiente) },
          ]} />
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-ink-celda p-celda px-4 py-3" data-tono="ok"><dt className="p-ink-3 flex items-center justify-between gap-2">Pagado</dt><dd className="text-lg font-bold"><Cifra texto={dinero(d.saldo.pagado)} moneda demora={450} /></dd></div>
            <div className="p-ink-celda p-celda px-4 py-3" data-tono="marca"><dt className="p-ink-3">Total</dt><dd className="text-lg font-bold"><Cifra texto={dinero(d.saldo.facturado + d.saldo.porEmitir + d.saldo.sinFacturar + d.saldo.porPlan)} moneda demora={520} /></dd></div>
          </dl>
          <div className="mt-auto space-y-2 text-sm p-ink-2">
            {d.saldo.porEmitir > 0 && <p>Incluye <b className="p-ink-acc tabular-nums">{dinero(d.saldo.porEmitir)}</b> que todavía no se factura: se cobra en las próximas cuotas o al entregar.</p>}
            {d.saldo.sinFacturar > 0 && <p>Incluye <b className="p-ink-acc tabular-nums">{dinero(d.saldo.sinFacturar)}</b> de fases en curso que todavía no tienen factura.</p>}
            {d.saldo.porPlan > 0 && <p>Incluye <b className="p-ink-acc tabular-nums">{dinero(d.saldo.porPlan)}</b> del plan de pagos acordado: cada pago se factura cuando llega su momento.</p>}
            {d.saldo.porConfirmar > 0 && <p>Pagos reportados esperando confirmación: <b className="p-ink-acc tabular-nums">{dinero(d.saldo.porConfirmar)}</b></p>}
            {d.proximo ? (
              <p>{vencida ? "Venció" : "Próximo vencimiento"}: <b className="text-white">{d.proximo.number ?? "Factura"}</b> el {fechaCorta(d.proximo.dueDate)}</p>
            ) : (
              <p>{d.saldo.pendiente > 0.005 ? "No tienes pagos vencidos." : d.saldo.facturado ? "No tienes pagos vencidos ni por vencer." : "Todavía no hay facturas en tu cuenta."}</p>
            )}
          </div>
        </BloqueOscuro>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 items-start">
        <Tarjeta i={4}>
          <TituloSeccion accion={<Link href="/cliente/tickets" className={enlace}>Todos</Link>}>Tickets abiertos</TituloSeccion>
          {d.tickets.length ? (
            <ul className="p-lista divide-y divide-line">
              {d.tickets.slice(0, 5).map((t, i) => (
                <Fila key={t.id} i={i} tono={t.status === "esperando_cliente" ? "aviso" : "marca"} href={`/cliente/tickets/${t.id}`} titulo={t.title} detalle={`${t.number} · ${haceCuanto(t.updatedAt)}`}
                  derecha={<Etiqueta tono={t.status === "esperando_cliente" ? "aviso" : "marca"}>{TICKET_ESTADO_LABEL[t.status as TicketEstado] ?? t.status}</Etiqueta>} />
              ))}
            </ul>
          ) : (
            <Vacio titulo="No tienes tickets abiertos" texto="Si algo no funciona o quieres un cambio, abre un ticket con capturas y te respondemos desde aquí." />
          )}
        </Tarjeta>
        <Tarjeta i={5}>
          <TituloSeccion>Lo último</TituloSeccion>
          {d.eventos.length ? (
            <ol className="p-tiempo">
              {d.eventos.map((e, i) => (
                <li key={e.id} style={{ "--i": i } as React.CSSProperties}>
                  <span className="pt" aria-hidden />
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
      {!problema && <EstadoSistemas sistemas={sistemas} />}
    </>
  );
}
