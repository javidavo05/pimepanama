"use client";

/**
 * Fechas de pago del cliente: cada factura con saldo trae su vencimiento y sus cuotas, y cada fecha se mueve en
 * el mismo lugar. Lo que falta emitir de una factura se puede programar como un cobro con fecha. Cualquier fecha se
 * puede quitar: los contratos que se pagan contra producto terminado no tienen fecha y no llevan recordatorios.
 * El cliente ve estas fechas en su cuenta y los recordatorios salen de ellas.
 */
import { useActionState, useState } from "react";
import { correrCuotasAction, moverCuotaAction, moverVencimientoAction, programarCobroAction, type EstadoFecha } from "@/app/(empresa)/empresa/(protected)/acciones-fechas";
import { campo } from "./formularios";
import { dinero } from "@/lib/portal/dinero";

export type CuotaFila = { id: string; description: string; amount: number; dueDate: string; status: string };
export type FacturaFechas = { id: string; number: string | null; title: string; total: number; falta: number; dueDate: string | null; porProgramar: number; cuotas: CuotaFila[] };

const aInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");
const hoyIso = () => new Date().toISOString().slice(0, 10);
const legible = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("es-PA", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const botonGuardar = "inline-flex items-center justify-center min-h-11 px-4 rounded-lg border border-line-mid text-sm font-semibold text-fg hover:border-line-loud disabled:opacity-40 whitespace-nowrap";
/** Campo de fecha compacto (sin el ancho completo de `campo`). */
const campoFecha = campo.replace("w-full", "w-full min-w-0 sm:w-44");

function Resultado({ estado }: { estado: EstadoFecha }) {
  if (!estado) return null;
  if (estado.error) return <p className="text-xs text-danger" role="alert">{estado.error}</p>;
  return <p className="text-xs text-ok" role="status">{estado.mensaje}</p>;
}

/** Una fecha que se mueve: el botón aparece activo solo cuando la fecha cambió. */
function MoverFecha({ accion, campoId, valorId, nombreId, inicial, etiqueta, sinFechaLabel, children }: { accion: typeof moverVencimientoAction; campoId: string; valorId: string; nombreId: "documentId" | "cuotaId"; inicial: string; etiqueta: string; sinFechaLabel: string; children: React.ReactNode }) {
  const [estado, enviar, enviando] = useActionState(accion, null);
  const [fecha, setFecha] = useState(inicial);
  const cambio = fecha !== inicial && !!fecha;
  return (
    <form action={enviar} className="grid gap-1">
      <input type="hidden" name={nombreId} value={valorId} />
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
        <label htmlFor={campoId} className="col-span-2 sm:col-span-1 min-w-0 text-fg-dim text-xs [overflow-wrap:anywhere]"><span className="sr-only">{etiqueta}: </span>{children}</label>
        <input id={campoId} name="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={campoFecha} />
        <button type="submit" className={botonGuardar} disabled={!cambio || enviando}>{enviando ? "Guardando…" : inicial ? "Mover" : "Poner fecha"}</button>
        {/* Contra entrega: quita la fecha (y con ella los recordatorios). */}
        {inicial && (
          <button type="submit" name="sinFecha" value="1" className="col-span-2 sm:col-span-1 inline-flex items-center justify-center min-h-11 px-3 rounded-lg text-sm font-semibold text-fg-mute hover:text-fg hover:bg-fill whitespace-nowrap disabled:opacity-40" disabled={enviando}>
            {sinFechaLabel}
          </button>
        )}
      </div>
      <Resultado estado={estado} />
    </form>
  );
}

/** Corre todas las cuotas pendientes de una factura el mismo número de meses (o las adelanta con un número negativo). */
function CorrerCuotas({ documentId, cuantas }: { documentId: string; cuantas: number }) {
  const [estado, enviar, enviando] = useActionState(correrCuotasAction, null);
  const [meses, setMeses] = useState("1");
  return (
    <form action={enviar} className="grid gap-1 rounded-xl border border-line bg-fill p-3">
      <input type="hidden" name="documentId" value={documentId} />
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
        <label htmlFor={`cc-${documentId}`} className="text-fg-dim text-xs">Correr las {cuantas} cuotas pendientes (meses; negativo para adelantar)</label>
        <input id={`cc-${documentId}`} name="meses" type="number" inputMode="numeric" min={-12} max={12} step={1} value={meses} onChange={(e) => setMeses(e.target.value)} className={campo.replace("w-full", "w-full sm:w-24")} />
        <button type="submit" className={botonGuardar} disabled={enviando || !meses || meses === "0"}>{enviando ? "Guardando…" : `Correr ${meses === "1" || meses === "-1" ? "1 mes" : `${Math.abs(Number(meses) || 0)} meses`}`}</button>
      </div>
      <Resultado estado={estado} />
    </form>
  );
}

/** Una factura con anticipo y el resto contra entrega todavía puede traer el vencimiento viejo, que la hace ver vencida. */
function QuitarVencimiento({ factura }: { factura: FacturaFechas }) {
  const [estado, enviar, enviando] = useActionState(moverVencimientoAction, null);
  return (
    <form action={enviar} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="documentId" value={factura.id} />
      <input type="hidden" name="sinFecha" value="1" />
      <span className="text-xs text-warn">La factura todavía vence el {legible(factura.dueDate!)} y por eso aparece vencida.</span>
      <button type="submit" className="inline-flex items-center min-h-11 px-3 rounded-lg text-sm font-semibold text-fg-mute hover:text-fg hover:bg-fill" disabled={enviando}>{enviando ? "Guardando…" : "Quitar ese vencimiento"}</button>
      <Resultado estado={estado} />
    </form>
  );
}

function ProgramarCobro({ factura }: { factura: FacturaFechas }) {
  const [estado, enviar, enviando] = useActionState(programarCobroAction, null);
  const [abierto, setAbierto] = useState(false);
  if (!abierto) {
    return (
      <button type="button" className="inline-flex items-center min-h-11 text-sm font-semibold text-brand-fg hover:underline" onClick={() => setAbierto(true)}>
        Programar el cobro de {dinero(factura.porProgramar)}
      </button>
    );
  }
  return (
    <form action={enviar} className="grid gap-2 rounded-xl border border-line bg-fill p-3">
      <input type="hidden" name="documentId" value={factura.id} />
      <p className="text-xs text-fg-dim">Falta programar {dinero(factura.porProgramar)}. El cliente lo ve como próxima cuota y recibe su recordatorio en la fecha. Si se paga contra producto terminado, no lo programes: queda contra entrega, sin fecha.</p>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
        <div><label htmlFor={`pc-m-${factura.id}`} className="block text-fg-dim text-xs font-semibold mb-1">Monto</label><input id={`pc-m-${factura.id}`} name="monto" inputMode="decimal" defaultValue={factura.porProgramar.toFixed(2)} className={campo} /></div>
        <div><label htmlFor={`pc-f-${factura.id}`} className="block text-fg-dim text-xs font-semibold mb-1">Fecha del cobro</label><input id={`pc-f-${factura.id}`} name="fecha" type="date" min={hoyIso()} required className={campo} /></div>
        <button type="submit" className={botonGuardar} disabled={enviando}>{enviando ? "Guardando…" : "Programar cobro"}</button>
      </div>
      <Resultado estado={estado} />
    </form>
  );
}

export function FechasPago({ facturas }: { facturas: FacturaFechas[] }) {
  if (!facturas.length) return <p className="mt-2 text-sm text-fg-dim">Sin facturas con saldo: no hay fechas de pago que mover.</p>;
  return (
    <ul className="mt-3 divide-y divide-line">
      {facturas.map((f) => {
        const vivas = f.cuotas.filter((c) => c.status !== "PAID" && c.status !== "CANCELLED");
        return (
          <li key={f.id} className="grid gap-3 py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="min-w-0 text-fg text-sm font-semibold [overflow-wrap:anywhere]">{f.number ?? "Factura"} · {f.title}</p>
              <p className="text-fg-dim text-xs tabular-nums">Falta {dinero(f.falta)} de {dinero(f.total)}</p>
            </div>
            {/* Con un pago parcial y sin cuotas, lo que falta se maneja abajo (contra entrega o programado): el vencimiento viejo ya no aplica. */}
            {vivas.length === 0 && f.porProgramar <= 0.005 && (
              <MoverFecha accion={moverVencimientoAction} campoId={`v-${f.id}`} valorId={f.id} nombreId="documentId" inicial={aInput(f.dueDate)} etiqueta={`Vencimiento de ${f.number ?? "la factura"}`} sinFechaLabel="Sin fecha">
                {f.dueDate ? `Vence el ${legible(f.dueDate)}` : <span className="text-fg font-medium">Sin fecha · se cobra contra entrega</span>}
              </MoverFecha>
            )}
            {vivas.length > 0 && (
              <ul className="grid gap-2">
                {vivas.map((c) => (
                  <li key={c.id}>
                    <MoverFecha accion={moverCuotaAction} campoId={`c-${c.id}`} valorId={c.id} nombreId="cuotaId" inicial={aInput(c.dueDate)} etiqueta={`Fecha de ${c.description}`} sinFechaLabel="Contra entrega">
                      <span className="text-fg font-medium">{c.description}</span> · <span className="tabular-nums">{dinero(c.amount)}</span> · {c.status === "OVERDUE" ? <span className="text-danger font-semibold">vencida el {legible(c.dueDate)}</span> : `el ${legible(c.dueDate)}`}
                    </MoverFecha>
                  </li>
                ))}
              </ul>
            )}
            {vivas.length > 1 && <CorrerCuotas documentId={f.id} cuantas={vivas.length} />}
            {f.porProgramar > 0.005 && (
              <div className="grid gap-1">
                <p className="text-fg-dim text-xs tabular-nums">{dinero(f.porProgramar)} sin fecha: se cobra contra entrega.</p>
                {vivas.length === 0 && f.dueDate && <QuitarVencimiento factura={f} />}
                <ProgramarCobro factura={f} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
