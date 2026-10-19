/**
 * Plan de pagos acordado, pago por pago, dentro del bloque oscuro del saldo: «50 % al firmar · toca pagar»,
 * «50 % a la entrega · al entregar» y el canje aparte. Lo usan Inicio y Facturas.
 */
import type { PlanDelCliente } from "@/lib/portal/saldo";
import { dinero as usd } from "@/lib/portal/dinero";
import { Etiqueta, type Tono } from "./ui";

const ESTADO: Record<PlanDelCliente["filas"][number]["estado"], Tono> = { pagado: "ok", toca: "aviso", despues: "neutro" };

/** Partes de la barra de saldo: lo pagado, cada pago del plan que falta y el resto de lo que se debe. */
export function partesConPlan(planes: PlanDelCliente[], pagado: number, pendiente: number, tonoPendiente: Tono = "aviso") {
  const varios = planes.length > 1;
  const delPlan = planes.flatMap((p) => p.filas.filter((f) => f.falta > 0.005).map((f) => ({
    label: varios ? `${f.etiqueta} · ${p.proyecto}` : f.etiqueta,
    valor: f.falta,
    tono: (f.estado === "toca" ? tonoPendiente : "marca") as Tono,
    texto: usd(f.falta),
  })));
  const resto = Math.max(0, pendiente - delPlan.reduce((a, x) => a + x.valor, 0));
  return [
    { label: "Pagado", valor: pagado, tono: "ok" as Tono, texto: usd(pagado) },
    ...delPlan,
    { label: delPlan.length ? "Otros por pagar" : "Por pagar", valor: resto, tono: tonoPendiente, texto: usd(resto) },
  ];
}

export function PlanDePagos({ planes }: { planes: PlanDelCliente[] }) {
  if (!planes.length) return null;
  return (
    <div className="space-y-4">
      {planes.map((p) => (
        <div key={p.proyecto} className="min-w-0">
          <p className="p-ink-3 text-xs font-semibold uppercase tracking-widest">Plan de pagos · {p.resumen}</p>
          {planes.length > 1 && <p className="p-ink-2 text-sm mt-1 break-words">{p.proyecto}</p>}
          <ul className="mt-2 divide-y divide-white/10">
            {p.filas.map((f) => (
              <li key={f.etiqueta} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-white text-sm font-semibold break-words">{f.etiqueta}</p>
                  <div className="mt-1">
                    <Etiqueta tono={ESTADO[f.estado]} vivo={f.estado === "toca"}>
                      {f.estado === "pagado" ? "Pagado" : f.estado === "toca" ? (f.pagado > 0.005 ? `Toca pagar · faltan ${usd(f.falta)}` : "Toca pagar") : f.cuando}
                    </Etiqueta>
                  </div>
                </div>
                <b className="text-white text-base tabular-nums shrink-0">{usd(f.monto)}</b>
              </li>
            ))}
            {p.canje && (
              <li className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-white text-sm font-semibold">Canje</p>
                  <p className="p-ink-3 text-xs mt-1">Se cubre en especie, no en dinero.</p>
                </div>
                <b className="p-ink-2 text-base tabular-nums shrink-0">{usd(p.canje.monto)}</b>
              </li>
            )}
          </ul>
          {p.canje && <p className="p-ink-3 text-xs">Valor del proyecto {usd(p.total)}: {usd(p.efectivo)} en dinero y {usd(p.canje.monto)} en canje.</p>}
        </div>
      ))}
    </div>
  );
}
