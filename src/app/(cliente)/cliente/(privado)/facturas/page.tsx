import { getPortalUser } from "@/lib/portal/sesion";
import { facturasDelCliente, datosDeTransferencia, dinero } from "@/lib/portal/datos";
import { pagadoEfectivo } from "@/lib/portal/saldo";
import { PAGO_METODO_LABEL, type PagoMetodo } from "@/lib/portal/estados";
import { BloqueOscuro, Cifra, Mezcla, type Tono, Encabezado, Etiqueta, Eyebrow, Tarjeta, TituloSeccion, Vacio, fechaCorta } from "@/components/portal/ui";
import { ReportarPago } from "./reportar-pago";

export const metadata = { title: "Facturas y pagos" };

export default async function FacturasCliente() {
  const p = await getPortalUser();
  const [{ facturas, pagos, saldo }, cuentas] = await Promise.all([facturasDelCliente(p.clientId), datosDeTransferencia(p.client.userId)]);
  const conSaldo = facturas
    .map((f) => { const pagado = pagadoEfectivo(f, pagos); return { ...f, pagado, falta: Math.max(0, Number(f.total ?? 0) - pagado) }; });
  const pendientes = conSaldo.filter((f) => f.falta > 0.005);
  const ahora = Date.now();
  const tonoFactura = (f: (typeof conSaldo)[number]): Tono => (f.falta <= 0.005 ? "ok" : f.dueDate && f.dueDate.getTime() < ahora ? "peligro" : f.pagado > 0 ? "aviso" : "marca");
  const vencido = Math.min(saldo.pendiente, conSaldo.filter((f) => tonoFactura(f) === "peligro").reduce((a, f) => a + f.falta, 0));

  return (
    <>
      <Encabezado eyebrow="Tu cuenta con Pime" titulo="Facturas y pagos" detalle="Lo que Pime te ha facturado hasta hoy, lo que pagaste y lo que falta, con cada factura y cada recibo en PDF. Lo que falta por emitir se cobra en las próximas cuotas o al entregar." />
      <BloqueOscuro i={1}>
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-end">
          <div className="min-w-0 space-y-2">
            <Eyebrow>Por pagar</Eyebrow>
            <Cifra texto={dinero(saldo.pendiente)} moneda className="text-[clamp(40px,5vw,64px)] font-extrabold tracking-[-0.03em] leading-none" demora={200} />
            {saldo.porEmitir > 0 && <p className="p-ink-2 text-sm">Incluye <b className="p-ink-acc tabular-nums">{dinero(saldo.porEmitir)}</b> que todavía no se factura: se cobra en las próximas cuotas o al entregar.</p>}
            {saldo.sinFacturar > 0 && <p className="p-ink-2 text-sm">Incluye <b className="p-ink-acc tabular-nums">{dinero(saldo.sinFacturar)}</b> de fases en curso sin factura todavía.</p>}
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-ink-celda p-celda px-4 py-3" data-tono="ok"><dt className="p-ink-3">Pagado</dt><dd className="text-lg font-bold"><Cifra texto={dinero(saldo.pagado)} moneda demora={350} /></dd></div>
            <div className="p-ink-celda p-celda px-4 py-3" data-tono="marca"><dt className="p-ink-3">Total</dt><dd className="text-lg font-bold"><Cifra texto={dinero(saldo.facturado + saldo.porEmitir + saldo.sinFacturar)} moneda demora={420} /></dd></div>
          </dl>
        </div>
        <div className="mt-6"><Mezcla etiqueta="Tu saldo" partes={[
          { label: "Pagado", valor: saldo.pagado, tono: "ok", texto: dinero(saldo.pagado) },
          { label: "Vencido", valor: vencido, tono: "peligro", texto: dinero(vencido) },
          { label: "Por pagar", valor: Math.max(0, saldo.pendiente - vencido), tono: "aviso", texto: dinero(Math.max(0, saldo.pendiente - vencido)) },
        ]} /></div>
      </BloqueOscuro>

      <Tarjeta i={2}>
        <TituloSeccion>Facturas</TituloSeccion>
        {conSaldo.length === 0 ? (
          <Vacio titulo="Todavía no hay facturas" texto="Cuando Pime emita una factura por una fase o por horas de soporte, aparece aquí con su PDF." />
        ) : (
          <ul className="p-lista divide-y divide-line">
            {conSaldo.map((f, i) => (
              <li key={f.id} data-tono={tonoFactura(f)} style={{ "--i": i } as React.CSSProperties} className="p-codigo flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="text-fg font-semibold truncate">{f.number ?? "Factura"} · {f.title}</p>
                  <p className="text-fg-dim text-sm">Emitida el {fechaCorta(f.issueDate)}{f.dueDate && f.falta > 0 ? ` · vence el ${fechaCorta(f.dueDate)}` : ""}</p>
                  {f.porEmitir > 0.005 && (
                    <p className="text-fg-dim text-xs tabular-nums">
                      {f.proxima ? `Próxima cuota: ${dinero(f.proxima.monto)} el ${fechaCorta(f.proxima.fecha)}` : `Contra entrega: ${dinero(f.porEmitir)} de ${dinero(f.totalContrato)}, se cobra al entregar`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4 sm:justify-end">
                  <div className="text-right"><p className="text-fg text-lg font-extrabold"><Cifra texto={dinero(f.total)} moneda demora={200 + i * 60} /></p>{f.falta > 0.005 && f.pagado > 0 && <p className="text-fg-dim text-xs tabular-nums">Falta {dinero(f.falta)}</p>}</div>
                  <Etiqueta tono={tonoFactura(f)}>
                    {f.falta <= 0.005 ? "Pagada" : f.dueDate && f.dueDate.getTime() < ahora ? "Vencida" : f.pagado > 0 ? "Pago parcial" : "Por pagar"}
                  </Etiqueta>
                  <a href={`/api/cliente/facturas/${f.id}`} className="p-btn p-btn-2 min-h-11 px-4">PDF</a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      <div className="grid gap-6 lg:grid-cols-2 items-start">
        <Tarjeta i={3}>
          <TituloSeccion>Cómo pagar</TituloSeccion>
          {cuentas.length ? (
            <ul className="space-y-4">
              {cuentas.map((c) => (
                <li key={c.id} className="rounded-xl border border-line bg-fill px-4 py-3 text-sm">
                  <p className="text-fg font-semibold">{c.bankName || c.name}</p>
                  <p className="text-fg-mute">{c.accountType ? `${c.accountType} · ` : ""}<span className="select-all font-semibold tabular-nums text-fg">{c.accountNumber}</span></p>
                  {c.accountHolder && <p className="text-fg-dim">A nombre de {c.accountHolder}</p>}
                </li>
              ))}
            </ul>
          ) : <p className="text-fg-dim text-sm">Pide a Pime los datos de transferencia.</p>}
          <p className="mt-4 text-xs text-fg-faint">Después de transferir, repórtalo aquí con el comprobante para que lo confirmemos más rápido.</p>
        </Tarjeta>
        <Tarjeta i={4}>
          <TituloSeccion>Reportar un pago</TituloSeccion>
          <ReportarPago facturas={pendientes.map((f) => ({ id: f.id, etiqueta: `${f.number ?? "Factura"} · falta ${dinero(f.falta)}`, falta: f.falta }))} />
        </Tarjeta>
      </div>

      {pagos.length > 0 && (
        <Tarjeta i={5}>
          <TituloSeccion>Pagos</TituloSeccion>
          <ul className="divide-y divide-line">
            {pagos.map((x) => (
              <li key={x.id} data-tono={x.status === "confirmado" ? "ok" : x.status === "rechazado" ? "peligro" : "aviso"} className="p-codigo flex flex-wrap items-center gap-3 py-3 text-sm">
                <span className="text-fg font-semibold tabular-nums">{dinero(x.amount)}</span>
                <span className="text-fg-dim">{fechaCorta(x.paidAt)} · {PAGO_METODO_LABEL[x.method as PagoMetodo] ?? x.method}{x.reference ? ` · ref. ${x.reference}` : ""}</span>
                <span className="ml-auto"><Etiqueta tono={x.status === "confirmado" ? "ok" : x.status === "rechazado" ? "peligro" : "aviso"}>{x.status === "confirmado" ? "Confirmado" : x.status === "rechazado" ? "No encontrado" : "Por confirmar"}</Etiqueta></span>
                {x.status === "confirmado" && <a href={`/api/cliente/pagos/${x.id}/recibo`} download className="p-btn p-btn-2 min-h-11 px-4">Recibo</a>}
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}
    </>
  );
}
