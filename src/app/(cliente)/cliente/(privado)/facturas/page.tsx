import { getPortalUser } from "@/lib/portal/sesion";
import { facturasDelCliente, datosDeTransferencia, dinero } from "@/lib/portal/datos";
import { pagadoDeFactura } from "@/lib/portal/saldo";
import { PAGO_METODO_LABEL, type PagoMetodo } from "@/lib/portal/estados";
import { Encabezado, Etiqueta, Tarjeta, TituloSeccion, Vacio, fechaCorta } from "@/components/portal/ui";
import { ReportarPago } from "./reportar-pago";

export const metadata = { title: "Facturas y pagos" };

export default async function FacturasCliente() {
  const p = await getPortalUser();
  const [{ facturas, pagos, saldo }, cuentas] = await Promise.all([facturasDelCliente(p.clientId), datosDeTransferencia(p.client.userId)]);
  const conSaldo = facturas
    .map((f) => { const pagado = Math.max(pagadoDeFactura(f.id, pagos), Number(f.amountPaid ?? 0)); return { ...f, pagado, falta: Math.max(0, Number(f.total ?? 0) - pagado) }; });
  const pendientes = conSaldo.filter((f) => f.falta > 0.005);

  return (
    <>
      <Encabezado eyebrow="Tu cuenta con Pime" titulo="Facturas y pagos" detalle="Lo facturado, lo que pagaste y lo que falta, con cada factura en PDF." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Tarjeta><p className="text-fg-dim text-sm">Por pagar</p><p className="text-fg text-3xl font-bold tabular-nums tracking-tight">{dinero(saldo.pendiente)}</p></Tarjeta>
        <Tarjeta><p className="text-fg-dim text-sm">Pagado</p><p className="text-fg text-3xl font-bold tabular-nums tracking-tight">{dinero(saldo.pagado)}</p></Tarjeta>
        <Tarjeta><p className="text-fg-dim text-sm">Facturado</p><p className="text-fg text-3xl font-bold tabular-nums tracking-tight">{dinero(saldo.facturado)}</p></Tarjeta>
      </div>

      <Tarjeta>
        <TituloSeccion>Facturas</TituloSeccion>
        {conSaldo.length === 0 ? (
          <Vacio titulo="Todavía no hay facturas" texto="Cuando Pime emita una factura por una fase o por horas de soporte, aparece aquí con su PDF." />
        ) : (
          <ul className="divide-y divide-line">
            {conSaldo.map((f) => (
              <li key={f.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="text-fg font-semibold truncate">{f.number ?? "Factura"} · {f.title}</p>
                  <p className="text-fg-dim text-sm">Emitida el {fechaCorta(f.issueDate)}{f.dueDate && f.falta > 0 ? ` · vence el ${fechaCorta(f.dueDate)}` : ""}</p>
                </div>
                <div className="flex items-center gap-4 sm:justify-end">
                  <div className="text-right"><p className="text-fg font-semibold tabular-nums">{dinero(f.total)}</p>{f.falta > 0.005 && f.pagado > 0 && <p className="text-fg-dim text-xs tabular-nums">Falta {dinero(f.falta)}</p>}</div>
                  <Etiqueta tono={f.falta <= 0.005 ? "ok" : f.dueDate && f.dueDate.getTime() < Date.now() ? "peligro" : f.pagado > 0 ? "aviso" : "marca"}>
                    {f.falta <= 0.005 ? "Pagada" : f.dueDate && f.dueDate.getTime() < Date.now() ? "Vencida" : f.pagado > 0 ? "Pago parcial" : "Por pagar"}
                  </Etiqueta>
                  <a href={`/api/cliente/facturas/${f.id}`} className="inline-flex items-center min-h-11 px-3 rounded-lg text-sm font-semibold text-brand-fg hover:bg-fill">PDF</a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      <div className="grid gap-6 lg:grid-cols-2 items-start">
        <Tarjeta>
          <TituloSeccion>Cómo pagar</TituloSeccion>
          {cuentas.length ? (
            <ul className="space-y-4">
              {cuentas.map((c) => (
                <li key={c.id} className="rounded-xl bg-fill px-4 py-3 text-sm">
                  <p className="text-fg font-semibold">{c.bankName || c.name}</p>
                  <p className="text-fg-mute">{c.accountType ? `${c.accountType} · ` : ""}<span className="select-all font-semibold tabular-nums text-fg">{c.accountNumber}</span></p>
                  {c.accountHolder && <p className="text-fg-dim">A nombre de {c.accountHolder}</p>}
                </li>
              ))}
            </ul>
          ) : <p className="text-fg-dim text-sm">Pide a Pime los datos de transferencia.</p>}
          <p className="mt-4 text-xs text-fg-faint">Después de transferir, repórtalo aquí con el comprobante para que lo confirmemos más rápido.</p>
        </Tarjeta>
        <Tarjeta>
          <TituloSeccion>Reportar un pago</TituloSeccion>
          <ReportarPago facturas={pendientes.map((f) => ({ id: f.id, etiqueta: `${f.number ?? "Factura"} · falta ${dinero(f.falta)}`, falta: f.falta }))} />
        </Tarjeta>
      </div>

      {pagos.length > 0 && (
        <Tarjeta>
          <TituloSeccion>Pagos</TituloSeccion>
          <ul className="divide-y divide-line">
            {pagos.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <span className="text-fg font-semibold tabular-nums">{dinero(x.amount)}</span>
                <span className="text-fg-dim">{fechaCorta(x.paidAt)} · {PAGO_METODO_LABEL[x.method as PagoMetodo] ?? x.method}{x.reference ? ` · ref. ${x.reference}` : ""}</span>
                <span className="ml-auto"><Etiqueta tono={x.status === "confirmado" ? "ok" : x.status === "rechazado" ? "peligro" : "aviso"}>{x.status === "confirmado" ? "Confirmado" : x.status === "rechazado" ? "No encontrado" : "Por confirmar"}</Etiqueta></span>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}
    </>
  );
}
