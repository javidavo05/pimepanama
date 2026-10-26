"use client";

/**
 * Calendario de envío de la pestaña Respuestas: qué día sale cada correo pendiente con el cupo que sube cada semana
 * (10 → 20 → 30 → 40 al día), hasta completar todos. Primero los agendados, por orden de llegada a la cola; después
 * los que todavía hay que agendar, como proyección. Se ve por mes y se avanza a los siguientes; los días pasados
 * muestran lo que salió.
 */
import { useMemo, useState } from "react";
import { faltaParaEnviar, type RespuestaVista } from "@/lib/leads/respuestas-comun";
import type { EstadoEnvio } from "@/lib/leads/envio-automatico";
import { calendarioDeEnvio, cupoDelDia, diaPanama, DIA_MS, ESCALONES } from "@/lib/leads/cupo-envio";

type Fila = { id: string; nombre: string; agendado: boolean };
type Celda = { dia: string; pasado: boolean; hoy: boolean; enviados: number; cupo: number; filas: Fila[]; acumulado: number };

const SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
/** Meses que se pueden ver después del último envío: el calendario siempre deja mirar hacia adelante. */
const MESES_EXTRA = 2;
const mesDe = (d: string) => d.slice(0, 7);
const sumarMes = (m: string, n: number) => { const [a, b] = m.split("-").map(Number); const t = new Date(Date.UTC(a, b - 1 + n, 1)); return t.toISOString().slice(0, 7); };
const fecha = (d: string, o: Intl.DateTimeFormatOptions) => new Date(`${d}T12:00:00`).toLocaleDateString("es-PA", o);
const nombreDe = (r: RespuestaVista) => r.lead.company?.trim() || r.lead.name;

export function CalendarioEnvio({ respuestas, envio }: { respuestas: RespuestaVista[]; envio: EstadoEnvio | null }) {
  const plan = useMemo(() => {
    const ahora = Date.now();
    const hoy = diaPanama(ahora);
    const abiertas = respuestas.filter((r) => r.estado === "borrador" || r.estado === "fallo");
    // Mismo orden que la cola (aprobadaAt, luego createdAt); los que faltan por agendar, de la tanda más vieja a la más nueva.
    const agendadas = abiertas.filter((r) => r.aprobadaAt && r.estado === "borrador")
      .sort((a, b) => a.aprobadaAt!.localeCompare(b.aprobadaAt!) || a.createdAt.localeCompare(b.createdAt));
    const porAgendar = abiertas.filter((r) => !r.aprobadaAt && !faltaParaEnviar(r)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const sinCorreo = abiertas.filter((r) => !r.aprobadaAt && faltaParaEnviar(r)).length;
    const fila: Fila[] = [
      ...agendadas.map((r) => ({ id: r.id, nombre: nombreDe(r), agendado: true })),
      ...porAgendar.map((r) => ({ id: r.id, nombre: nombreDe(r), agendado: false })),
    ];
    const pausado = !!envio?.pausado;
    const dias = calendarioDeEnvio(fila.length, envio && !pausado ? envio.restantesHoy : 0, ahora);
    const enviadosPorDia = new Map<string, number>();
    for (const r of respuestas) if (r.estado === "enviada" && r.enviadaAt) {
      const d = diaPanama(new Date(r.enviadaAt).getTime());
      enviadosPorDia.set(d, (enviadosPorDia.get(d) ?? 0) + 1);
    }
    const ultimoEnvio = [...enviadosPorDia.keys()].sort().at(-1) ?? null;

    // Cada día desde el mes del primer envío hasta MESES_EXTRA meses después del último.
    const porDia = new Map(dias.map((d) => [d.dia, d]));
    const primerEnvio = [...enviadosPorDia.keys()].sort()[0] ?? hoy;
    const ultimo = dias.at(-1)?.dia ?? hoy;
    const meses: string[] = [];
    for (let m = mesDe(primerEnvio < hoy ? primerEnvio : hoy); m <= sumarMes(mesDe(ultimo), MESES_EXTRA); m = sumarMes(m, 1)) meses.push(m);
    let usado = 0;
    const celdas: Celda[] = [];
    for (let t = Date.parse(`${meses[0]}-01T12:00:00Z`); ; t += DIA_MS) {
      const dia = new Date(t).toISOString().slice(0, 10);
      if (mesDe(dia) > meses.at(-1)!) break;
      const p = porDia.get(dia);
      const salen = p?.salen ?? 0;
      celdas.push({ dia, pasado: dia < hoy, hoy: dia === hoy, enviados: (enviadosPorDia.get(dia) ?? 0), cupo: p?.cupo ?? (dia > hoy ? cupoDelDia(t) : 0), filas: fila.slice(usado, usado + salen), acumulado: p?.acumulado ?? usado });
      usado += salen;
    }
    return { hoy, total: fila.length, agendadas: agendadas.length, porAgendar: porAgendar.length, sinCorreo, celdas, meses, termina: dias.at(-1)?.dia ?? null, ultimoEnvio, pausado };
  }, [respuestas, envio]);

  const primero = plan.celdas.find((c) => c.filas.length)?.dia ?? plan.hoy;
  const [elegido, setElegido] = useState<string | null>(null);
  const sel = plan.celdas.find((c) => c.dia === (elegido ?? primero)) ?? null;
  const [mes, setMes] = useState<string | null>(null);
  const mesVisto = mes && plan.meses.includes(mes) ? mes : mesDe(plan.hoy);
  const iMes = plan.meses.indexOf(mesVisto);
  const delMes = plan.celdas.filter((c) => mesDe(c.dia) === mesVisto);
  const huecos = (new Date(`${mesVisto}-01T12:00:00Z`).getUTCDay() + 6) % 7;
  const salenMes = delMes.reduce((n, c) => n + (c.pasado ? c.enviados : c.filas.length), 0);
  const ir = (n: number) => { const m = plan.meses[iMes + n]; if (!m) return; setMes(m); const delOtro = plan.celdas.filter((c) => mesDe(c.dia) === m); setElegido((delOtro.find((c) => !c.pasado && c.filas.length) ?? delOtro.find((c) => c.enviados) ?? delOtro.find((c) => !c.pasado) ?? delOtro[0])?.dia ?? null); };
  const maxDia = Math.max(...ESCALONES);
  // El envío automático corre una vez al día; si lo último salió antes de ayer con agendados en cola, no está corriendo.
  const ayer = diaPanama(Date.now() - DIA_MS);
  const detenido = plan.agendadas > 0 && !plan.pausado && (!plan.ultimoEnvio || plan.ultimoEnvio < ayer);

  return (
    <section className="rounded-2xl border border-line bg-panel" aria-labelledby="calendario-envio">
      <div className="grid gap-2 p-4 sm:p-6">
        <h2 id="calendario-envio" className="text-fg text-base font-semibold tracking-tight">Calendario de envío</h2>
        {plan.total === 0 ? (
          <p className="text-sm text-fg-dim">
            No hay correos por enviar. Cuando el agente deje respuestas nuevas, aquí verás qué día sale cada una con el cupo diario.
          </p>
        ) : (
          <p className="text-sm text-fg-dim">
            {plan.total === 1 ? "1 correo por enviar" : `${plan.total} correos por enviar`}: {plan.agendadas} {plan.agendadas === 1 ? "agendado" : "agendados"} y {plan.porAgendar} por agendar.
            {" "}El cupo sube cada semana (hoy {envio?.delDia ?? 0} al día, hasta {maxDia})
            {plan.termina && <>: {[plan.pausado && "si se reanuda mañana", plan.porAgendar > 0 && "si se agendan todos"].filter(Boolean).join(" y ") || "a este ritmo"}, el último sale el <strong className="text-fg">{fecha(plan.termina, { weekday: "long", day: "numeric", month: "long" })}</strong></>}.
            {plan.sinCorreo > 0 && ` ${plan.sinCorreo} sin correo no entran hasta que lo escribas.`}
          </p>
        )}
        {!envio && plan.total > 0 && <p className="text-sm text-warn">No pude leer el cupo de hoy: el calendario cuenta desde mañana.</p>}
        {plan.pausado && <p className="rounded-lg border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">Envío automático en pausa: {envio?.pausado} Mientras siga en pausa no sale nada; las fechas son para cuando se reanude.</p>}
        {detenido && (
          <p className="rounded-lg border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
            {plan.ultimoEnvio ? `El último correo salió el ${fecha(plan.ultimoEnvio, { day: "numeric", month: "short" })}` : "Todavía no sale ningún correo"} y hay {plan.agendadas} agendados: el envío automático no ha corrido. Estas fechas suponen que corre todos los días.
          </p>
        )}
      </div>

      {plan.total > 0 && (
        <>
          <div className="border-t border-line px-2 py-4 sm:px-6">
            <div className="mb-3 flex items-center justify-between gap-2 px-2 sm:px-0">
              <button type="button" onClick={() => ir(-1)} disabled={iMes <= 0} aria-label="Mes anterior" className="inline-flex size-11 items-center justify-center rounded-lg border border-line text-fg-mute hover:border-brand/60 disabled:opacity-40 sm:size-9">
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m15 18-6-6 6-6" /></svg>
              </button>
              <div className="min-w-0 text-center">
                <h3 className="text-sm font-semibold text-fg first-letter:uppercase" aria-live="polite">{fecha(`${mesVisto}-15`, { month: "long", year: "numeric" })}</h3>
                <span className="text-xs text-fg-dim tabular-nums">{salenMes ? `${salenMes} ${salenMes === 1 ? "correo" : "correos"} este mes` : "Nada este mes"}</span>
              </div>
              <button type="button" onClick={() => ir(1)} disabled={iMes >= plan.meses.length - 1} aria-label="Mes siguiente" className="inline-flex size-11 items-center justify-center rounded-lg border border-line text-fg-mute hover:border-brand/60 disabled:opacity-40 sm:size-9">
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m9 18 6-6-6-6" /></svg>
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 sm:gap-2" role="grid" aria-label={`Correos que salen cada día de ${fecha(`${mesVisto}-15`, { month: "long" })}`}>
              {SEMANA.map((d) => <span key={d} role="columnheader" className="pb-1 text-center text-[11px] font-semibold uppercase tracking-widest text-fg-faint">{d}</span>)}
              {Array.from({ length: huecos }, (_, i) => <span key={`h${i}`} aria-hidden />)}
              {delMes.map((c) => {
                const n = c.pasado || (c.hoy && !c.filas.length) ? c.enviados : c.filas.length;
                const ag = c.filas.filter((f) => f.agendado).length;
                const activo = sel?.dia === c.dia;
                const lleno = c.pasado ? 0 : Math.min(1, c.filas.length / Math.max(c.cupo, 1));
                return (
                  <button key={c.dia} type="button" role="gridcell" aria-selected={activo} disabled={c.pasado && !c.enviados}
                    onClick={() => setElegido(c.dia)}
                    aria-label={`${fecha(c.dia, { weekday: "long", day: "numeric", month: "long" })}: ${c.pasado ? `salieron ${c.enviados}` : `salen ${c.filas.length}${c.filas.length ? ` (${ag} agendados, ${c.filas.length - ag} por agendar)` : ""}`}`}
                    className={`relative grid min-h-16 content-between gap-1 overflow-hidden rounded-lg border p-1 text-left transition-colors sm:min-h-20 sm:p-2 ${activo ? "border-brand bg-brand/10" : c.hoy ? "border-brand/50" : "border-line"} ${c.pasado ? "bg-fill text-fg-faint" : "bg-panel hover:border-brand/60"} disabled:cursor-default disabled:opacity-60`}>
                    <span className={`text-[11px] tabular-nums ${c.hoy ? "font-semibold text-brand-fg" : "text-fg-faint"}`}>{c.hoy ? "Hoy" : Number(c.dia.slice(8))}</span>
                    <span className={`text-base font-semibold tabular-nums sm:text-xl ${n ? (c.pasado ? "text-fg-dim" : "text-fg") : "text-fg-faint"}`}>{n || "·"}</span>
                    {/* La barra se llena con lo que sale sobre el cupo del día: sólida lo agendado, clara lo que falta agendar. */}
                    {!c.pasado && c.filas.length > 0 && (
                      <span className="flex h-1 w-full overflow-hidden rounded-full bg-line" aria-hidden>
                        <span className="h-full bg-brand" style={{ width: `${(ag / Math.max(c.cupo, 1)) * 100}%` }} />
                        <span className="h-full bg-brand/40" style={{ width: `${(lleno - ag / Math.max(c.cupo, 1)) * 100}%` }} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 px-2 text-xs text-fg-faint sm:px-0">
              <span className="inline-flex items-center gap-2"><span className="h-1 w-4 rounded-full bg-brand" aria-hidden />Agendado</span>
              <span className="inline-flex items-center gap-2"><span className="h-1 w-4 rounded-full bg-brand/40" aria-hidden />Por agendar</span>
              <span>Los días pasados muestran lo que salió. Cambia de mes con las flechas.</span>
            </p>
          </div>

          {sel && (
            <div className="grid gap-3 border-t border-line bg-fill px-4 py-4 sm:px-6" aria-live="polite">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-fg first-letter:uppercase">{fecha(sel.dia, { weekday: "long", day: "numeric", month: "long" })}</h3>
                <span className="text-xs text-fg-dim tabular-nums">
                  {sel.pasado ? `Salieron ${sel.enviados}` : `Cupo ${sel.cupo} · salen ${sel.filas.length}${sel.hoy && sel.enviados ? ` · ya salieron ${sel.enviados}` : ""}`}
                </span>
              </div>
              {!sel.pasado && (
                <div className="grid gap-1">
                  <div className="h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={plan.total} aria-valuenow={sel.acumulado} aria-label="Avance del total al cerrar este día">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${(sel.acumulado / plan.total) * 100}%` }} />
                  </div>
                  <span className="text-xs text-fg-faint tabular-nums">Al cerrar este día: {sel.acumulado} de {plan.total} enviados ({Math.round((sel.acumulado / plan.total) * 100)} %)</span>
                </div>
              )}
              {sel.filas.length > 0 ? (
                <ol className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                  {sel.filas.map((f) => (
                    <li key={f.id} className="flex min-w-0 items-center gap-2 text-sm">
                      <span className={`size-2 shrink-0 rounded-full ${f.agendado ? "bg-brand" : "bg-brand/40"}`} aria-hidden />
                      <span className="truncate text-fg-mute" title={f.nombre}>{f.nombre}</span>
                      {!f.agendado && <span className="sr-only">(por agendar)</span>}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-fg-dim">{sel.pasado ? "Ese día ya pasó." : sel.dia > (plan.termina ?? "") ? `Ese día no sale nada: el cupo ya alcanzó para todo lo pendiente. Quedan ${sel.cupo} lugares libres para lo que deje el agente.` : "Ese día no sale nada."}</p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
