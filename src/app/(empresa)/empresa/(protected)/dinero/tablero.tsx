"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "@/components/empresa/link";
import { dinero } from "@/lib/portal/dinero";
import { PAGO_METODO_LABEL, type PagoMetodo } from "@/lib/portal/estados";
import { mesDe, mesesEntre, type DatosTablero, type EstadoFactura, type FilaFactura, type SaldoCliente } from "@/lib/dinero/tablero";
import type { PuntoMes } from "./grafica";

// recharts es pesado: solo en el navegador, con un hueco del mismo alto mientras carga.
const GraficaMensual = dynamic(() => import("./grafica"), { ssr: false, loading: () => <div className="h-72 animate-pulse rounded-xl bg-fill" /> });

/**
 * Tablero contable: todo el dinero, filtrable por año, mes y cliente sin volver al servidor.
 * Código de color fijo en toda la pantalla: verde = entró, azul = facturado, ámbar = por cobrar, rojo = vencido.
 */

const COLOR = {
  entro: { texto: "text-ok", fondo: "bg-ok", suave: "bg-ok/10", borde: "before:bg-ok" },
  facturado: { texto: "text-info", fondo: "bg-info", suave: "bg-info/10", borde: "before:bg-info" },
  cobrar: { texto: "text-warn", fondo: "bg-warn", suave: "bg-warn/10", borde: "before:bg-warn" },
  sinFactura: { texto: "text-warn", fondo: "bg-warn/40", suave: "bg-warn/10", borde: "before:bg-warn" },
  vencido: { texto: "text-danger", fondo: "bg-danger", suave: "bg-danger/10", borde: "before:bg-danger" },
  neutro: { texto: "text-fg", fondo: "bg-fg-faint", suave: "bg-fill", borde: "before:bg-line-mid" },
} as const;
type Tono = keyof typeof COLOR;

const ESTADO: Record<EstadoFactura, { label: string; clase: string }> = {
  pagada: { label: "Pagada", clase: "bg-ok/10 text-ok" },
  parcial: { label: "Abonada", clase: "bg-info/10 text-info" },
  pendiente: { label: "Por cobrar", clase: "bg-warn/10 text-warn" },
  vencida: { label: "Vencida", clase: "bg-danger/10 text-danger" },
  borrador: { label: "Borrador", clase: "bg-fill text-fg-dim" },
  anulada: { label: "Anulada", clase: "bg-fill text-fg-faint line-through" },
};

const etiquetaMes = (mes: string, largo = false) => {
  const t = new Date(`${mes}-15T12:00:00Z`).toLocaleDateString("es-PA", { month: largo ? "long" : "short", year: largo ? "numeric" : "2-digit", timeZone: "UTC" });
  return largo ? t.charAt(0).toUpperCase() + t.slice(1) : t;
};
const fechaCorta = (iso: string) => new Date(iso).toLocaleDateString("es-PA", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Panama" });
const suma = <T,>(xs: T[], f: (x: T) => number) => Math.round(xs.reduce((a, x) => a + f(x), 0) * 100) / 100;
const iniciales = (n: string) => n.replace(/[^\p{L}\p{N} ]/gu, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "·";
const pct = (a: number, b: number) => (b > 0.005 ? Math.round((a / b) * 100) : null);

/** Cifra que sube desde 0 al aparecer o al cambiar el filtro. Sin movimiento si el sistema lo pide. */
function Cuenta({ valor, formato = dinero }: { valor: number; formato?: (v: number) => string }) {
  const quieto = useReducedMotion();
  const [v, setV] = useState(valor);
  const previo = useRef(0);
  useEffect(() => {
    if (quieto) { setV(valor); previo.current = valor; return; }
    const desde = previo.current, t0 = performance.now(), dur = 550;
    let raf = 0;
    const paso = (t: number) => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      setV(desde + (valor - desde) * e);
      if (k < 1) raf = requestAnimationFrame(paso); else previo.current = valor;
    };
    raf = requestAnimationFrame(paso);
    return () => { cancelAnimationFrame(raf); previo.current = valor; };
  }, [valor, quieto]);
  return <Monto texto={formato(v)} />;
}

/** «USD 17,625» al frente y «.00» más tenue: el ojo lee primero lo que importa. */
function Monto({ texto }: { texto: string }) {
  const i = texto.lastIndexOf(".");
  if (i < 0 || texto.length - i !== 3) return <span className="whitespace-nowrap">{texto}</span>;
  return <span className="whitespace-nowrap">{texto.slice(0, i)}<span className="text-[0.6em] font-medium opacity-50">{texto.slice(i)}</span></span>;
}

/** Anillo de lo cobrado sobre lo facturado: se dibuja al aparecer. */
function Anillo({ valor, etiqueta }: { valor: number | null; etiqueta: string }) {
  const quieto = useReducedMotion();
  const r = 52, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, valor ?? 0));
  return (
    <figure className="relative grid h-32 w-32 shrink-0 place-items-center" aria-label={`${etiqueta}: ${valor ?? 0} %`}>
      <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" className="stroke-fill-2" />
        <motion.circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" strokeLinecap="round" className="stroke-ok" strokeDasharray={c}
          initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c - (v / 100) * c }} transition={{ duration: quieto ? 0 : 1.1, ease: EASE, delay: 0.2 }} />
      </svg>
      <figcaption className="text-center">
        <span className="block text-2xl font-semibold tabular-nums tracking-tight text-fg">{valor === null ? "—" : <Cuenta valor={v} formato={(x) => `${Math.round(x)} %`} />}</span>
        <span className="block text-xs text-fg-dim">{etiqueta}</span>
      </figcaption>
    </figure>
  );
}

function Cifra({ k, v, d, tono, i }: { k: string; v: number; d: React.ReactNode; tono: Tono; i: number }) {
  const quieto = useReducedMotion();
  return (
    <motion.div initial={quieto ? false : { opacity: 0, transform: "translateY(8px)" }} animate={{ opacity: 1, transform: "translateY(0px)" }} transition={{ delay: 0.12 + i * 0.05, duration: 0.35, ease: EASE }} className="min-w-0 py-3 sm:px-4 sm:py-0 sm:first:pl-0">
      <dt className="inline-flex items-center gap-2 text-xs font-medium text-fg-dim"><span className={`h-2 w-2 rounded-full ${COLOR[tono].fondo}`} aria-hidden />{k}</dt>
      <dd className={`mt-1 text-lg font-semibold tabular-nums tracking-tight [overflow-wrap:anywhere] ${tono === "neutro" ? "text-fg" : COLOR[tono].texto}`}><Cuenta valor={v} /></dd>
      <dd className="text-xs text-fg-faint">{d}</dd>
    </motion.div>
  );
}

/** Barra horizontal apilada (pagado / pendiente / vencido) que crece al aparecer. */
function Apilada({ partes, total, alto = "h-2" }: { partes: { valor: number; tono: Tono }[]; total: number; alto?: string }) {
  return (
    <div className={`flex ${alto} w-full overflow-hidden rounded-full bg-fill`} aria-hidden>
      {total > 0.005 && partes.map((p, i) => p.valor > 0.005 && (
        <motion.div key={i} className={COLOR[p.tono].fondo} initial={{ width: 0 }} animate={{ width: `${(p.valor / total) * 100}%` }} transition={{ duration: 0.6, ease: EASE, delay: i * 0.08 }} />
      ))}
    </div>
  );
}

/** Curva de salida fuerte (Emil Kowalski): arranca rápido y asienta suave; la misma en toda la pantalla. */
const EASE = [0.23, 1, 0.32, 1] as const;
const card = "min-w-0 rounded-3xl border border-line bg-panel p-4 shadow-[0_24px_48px_-32px_rgb(0_0_0/0.25)] sm:p-6";
/** Botón de un control segmentado: la píldora del activo se desliza de uno a otro. */
function Pastilla({ activo, grupo, onClick, children }: { activo: boolean; grupo: string; onClick: () => void; children: React.ReactNode }) {
  const quieto = useReducedMotion();
  return (
    <button type="button" onClick={onClick} aria-pressed={activo} className={`relative inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-[color,transform] duration-150 ease-out active:scale-[0.97] sm:min-h-9 ${activo ? "text-fg" : "text-fg-dim hover:text-fg"}`}>
      {activo && <motion.span layoutId={grupo} className="absolute inset-0 -z-10 rounded-lg bg-panel shadow-sm ring-1 ring-line" transition={quieto ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 38 }} />}
      {children}
    </button>
  );
}
const segmento = "isolate flex w-fit max-w-full gap-1 self-start overflow-x-auto rounded-xl bg-fill p-1";

type Vista = "clientes" | "facturas" | "pagos";

export function TableroDinero({ datos }: { datos: DatosTablero }) {
  const quieto = useReducedMotion();
  const mesHoy = mesDe(new Date(datos.hoy));
  const anioHoy = Number(mesHoy.slice(0, 4));

  const anios = useMemo(() => {
    const s = new Set<number>([anioHoy]);
    for (const f of datos.facturas) s.add(Number(mesDe(new Date(f.fecha)).slice(0, 4)));
    for (const e of datos.entradas) s.add(Number(mesDe(new Date(e.fecha)).slice(0, 4)));
    return [...s].sort((a, b) => b - a);
  }, [datos, anioHoy]);
  const clientes = useMemo(() => {
    const m = new Map<string, string>();
    for (const x of [...datos.facturas, ...datos.entradas, ...datos.saldos]) if (x.clienteId) m.set(x.clienteId, x.cliente);
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], "es"));
  }, [datos]);

  const [anio, setAnio] = useState<number | "todo">(anioHoy);
  // Clientes elegidos: vacío = todos. Con varios, todo el tablero muestra la suma de esos.
  const [elegidos, setElegidos] = useState<Set<string>>(() => new Set());
  const todos = elegidos.size === 0;
  const alternar = (id: string) => setElegidos((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const [mes, setMes] = useState<string | null>(null);
  const [vista, setVista] = useState<Vista>("clientes");
  const [series, setSeries] = useState({ facturado: true, acumulado: true });

  const delCliente = <T extends { clienteId: string | null }>(xs: T[]) => (todos ? xs : xs.filter((x) => !!x.clienteId && elegidos.has(x.clienteId)));
  const enPeriodo = (iso: string) => {
    const m = mesDe(new Date(iso));
    if (mes) return m === mes;
    return anio === "todo" || m.startsWith(String(anio));
  };

  const facturasC = useMemo(() => delCliente(datos.facturas), [datos, elegidos]); // eslint-disable-line react-hooks/exhaustive-deps
  const entradasC = useMemo(() => delCliente(datos.entradas), [datos, elegidos]); // eslint-disable-line react-hooks/exhaustive-deps
  const saldosC = useMemo(() => delCliente(datos.saldos), [datos, elegidos]); // eslint-disable-line react-hooks/exhaustive-deps
  const gastosC = useMemo(() => (todos ? datos.gastos : []), [datos, todos]);

  // Serie mes a mes: del primer movimiento (o enero del año elegido) hasta hoy o diciembre.
  const puntos: PuntoMes[] = useMemo(() => {
    const todos = [...facturasC.filter((f) => f.cuenta).map((f) => f.fecha), ...entradasC.map((e) => e.fecha), ...gastosC.map((g) => g.fecha)].map((f) => mesDe(new Date(f))).sort();
    // En un año, desde el primer mes con movimiento: los meses vacíos antes del primer cobro no son «meses flojos».
    const delAnio = anio === "todo" ? [] : todos.filter((m) => m.startsWith(String(anio)));
    const desde = anio === "todo" ? todos[0] ?? mesHoy : delAnio[0] ?? `${anio}-01`;
    const hasta = anio === "todo" ? (todos[todos.length - 1] && todos[todos.length - 1] > mesHoy ? todos[todos.length - 1] : mesHoy) : anio === anioHoy ? mesHoy : `${anio}-12`;
    const meses = mesesEntre(desde, hasta);
    const idx = new Map(meses.map((m, i) => [m, i]));
    const base = meses.map((m) => ({ mes: m, etiqueta: etiquetaMes(m), entro: 0, facturado: 0, gastos: 0, acumulado: 0, aprox: 0 }));
    for (const e of entradasC) { const i = idx.get(mesDe(new Date(e.fecha))); if (i !== undefined) { base[i].entro += e.monto; if (e.sinFecha) base[i].aprox += e.monto; } }
    for (const f of facturasC) { if (!f.cuenta) continue; const i = idx.get(mesDe(new Date(f.fecha))); if (i !== undefined) base[i].facturado += f.total; }
    for (const g of gastosC) { const i = idx.get(mesDe(new Date(g.fecha))); if (i !== undefined) base[i].gastos += g.monto; }
    let acc = 0;
    return base.map((p) => { acc += p.entro; return { ...p, entro: Math.round(p.entro * 100) / 100, facturado: Math.round(p.facturado * 100) / 100, gastos: Math.round(p.gastos * 100) / 100, acumulado: Math.round(acc * 100) / 100 }; });
  }, [facturasC, entradasC, gastosC, anio, anioHoy, mesHoy]);

  const mejor = puntos.reduce<PuntoMes | null>((m, p) => (p.entro > (m?.entro ?? 0) ? p : m), null);
  const facturasP = facturasC.filter((f) => enPeriodo(f.fecha));
  const entradasP = entradasC.filter((e) => enPeriodo(e.fecha));
  const gastosP = gastosC.filter((g) => enPeriodo(g.fecha));
  const vivas = facturasC.filter((f) => f.cuenta);
  const entro = suma(entradasP, (e) => e.monto);
  const facturado = suma(facturasP.filter((f) => f.cuenta), (f) => f.total);
  const cobradoDeLoFacturado = suma(facturasP.filter((f) => f.cuenta), (f) => f.pagado);
  // Lo que se debe hoy sale del saldo de cada cliente (facturas + plan de pagos + fases sin factura), no solo de las facturas.
  const porCobrar = suma(saldosC, (s) => s.pendiente);
  const sinFacturar = suma(saldosC, (s) => s.sinFacturar);
  const vencidas = vivas.filter((f) => f.estado === "vencida");
  const vencido = suma(saldosC, (s) => s.vencido);
  const gastos = suma(gastosP, (g) => g.monto);
  const mesesConDatos = mes ? 1 : Math.max(1, puntos.filter((p) => p.mes <= mesHoy).length);
  const historico = suma(entradasC, (e) => e.monto);

  // Comparación con el mismo tramo del año anterior (hasta el mismo mes si es el año en curso).
  const comparado = useMemo(() => {
    if (anio === "todo" || mes) return null;
    const tope = anio === anioHoy ? mesHoy.slice(5) : "12";
    const ant = entradasC.filter((e) => { const m = mesDe(new Date(e.fecha)); return m.startsWith(String(anio - 1)) && m.slice(5) <= tope; });
    const previo = suma(ant, (e) => e.monto);
    return previo > 0.005 ? { previo, delta: Math.round(((entro - previo) / previo) * 100) } : null;
  }, [anio, mes, anioHoy, mesHoy, entradasC, entro]);

  const periodoTexto = mes ? etiquetaMes(mes, true) : anio === "todo" ? "todo el tiempo" : anio === anioHoy ? `${anio} hasta hoy` : String(anio);
  const nada = !datos.facturas.length && !datos.entradas.length;

  if (nada) {
    return (
      <div className={card}>
        <div className="rounded-xl border border-dashed border-line-mid px-4 py-12 text-center">
          <p className="font-medium text-fg">Todavía no hay facturas ni cobros</p>
          <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-fg-dim">Aquí verás lo que entra mes a mes, lo facturado por año y cuánto debe cada cliente. Empieza con la primera factura.</p>
          <div className="mt-4 flex justify-center"><Link href="/empresa/facturas/nueva" className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-on-brand hover:bg-brand-hi">Crear la primera factura</Link></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros: año, cliente y el mes tocado en la gráfica. */}
      <div className="z-20 rounded-2xl border border-line bg-panel/80 p-2 shadow-sm backdrop-blur-xl md:sticky md:top-2">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div role="group" aria-label="Año" className={segmento}>
            {[...anios.map((a) => a as number | "todo"), "todo" as const].map((a) => (
              <Pastilla key={a} grupo="anio-dinero" activo={anio === a && !mes} onClick={() => { setAnio(a); setMes(null); }}>{a === "todo" ? "Todo el tiempo" : a}</Pastilla>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <AnimatePresence>
              {mes && (
                <motion.button key="mes" type="button" onClick={() => setMes(null)} initial={quieto ? false : { opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand/10 px-3 text-sm font-semibold text-brand-fg sm:min-h-9">
                  <span>{etiquetaMes(mes, true)}</span><span aria-hidden>×</span><span className="sr-only">Quitar el mes</span>
                </motion.button>
              )}
            </AnimatePresence>
            <SelectorClientes clientes={clientes} elegidos={elegidos} onAlternar={alternar} onLimpiar={() => setElegidos(new Set())} />
          </div>
        </div>
      </div>

      <motion.section initial={quieto ? false : { opacity: 0, transform: "translateY(12px) scale(0.99)" }} animate={{ opacity: 1, transform: "translateY(0px) scale(1)" }} transition={{ duration: 0.5, ease: EASE }}
        className="relative isolate overflow-hidden rounded-3xl border border-line bg-panel p-6 shadow-[0_1px_0_rgb(255_255_255/0.04)_inset,0_24px_48px_-24px_rgb(0_0_0/0.25)] sm:p-8">
        {/* Brillo de fondo en el color de lo que entró: da profundidad sin competir con las cifras. */}
        <div aria-hidden className="pointer-events-none absolute -left-24 -top-32 -z-10 h-80 w-80 rounded-full bg-ok/15 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-40 right-0 -z-10 h-80 w-96 rounded-full bg-info/10 blur-3xl" />
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-dim">
              Entró · <span className="normal-case tracking-normal">{periodoTexto}{!todos && ` · ${elegidos.size === 1 ? clientes.find(([id]) => elegidos.has(id))?.[1] : `${elegidos.size} clientes`}`}</span>
            </p>
            <p className="mt-2 text-4xl font-semibold tabular-nums tracking-tight text-fg [overflow-wrap:anywhere] sm:text-5xl"><Cuenta valor={entro} /></p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              {comparado && (
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold tabular-nums ${comparado.delta >= 0 ? "bg-ok/10 text-ok" : "bg-danger/10 text-danger"}`}>
                  {comparado.delta >= 0 ? "▲" : "▼"} {Math.abs(comparado.delta)} % vs {Number(anio) - 1}
                </span>
              )}
              <span className="text-fg-dim">{entradasP.length} pago(s) · promedio <b className="font-semibold text-fg tabular-nums">{dinero(entro / mesesConDatos)}</b> por mes</span>
            </div>
          </div>
          <Anillo valor={pct(cobradoDeLoFacturado, facturado)} etiqueta="cobrado" />
        </div>
        <dl className="mt-6 grid grid-cols-2 divide-line border-t border-line pt-4 sm:grid-cols-4 sm:divide-x">
          <Cifra i={0} k="Facturado" v={facturado} tono="facturado" d={`${facturasP.filter((f) => f.cuenta).length} factura(s)`} />
          <Cifra i={1} k="Por cobrar hoy" v={porCobrar} tono="cobrar" d={sinFacturar > 0.005 ? `${dinero(sinFacturar)} aún sin factura` : `${vivas.filter((f) => f.falta > 0.005).length} factura(s) abierta(s)`} />
          <Cifra i={2} k="Vencido hoy" v={vencido} tono="vencido" d={vencidas.length ? `${vencidas.length} factura(s)` : "Nada vencido"} />
          <Cifra i={3} k={gastos > 0.005 ? "Neto" : "Histórico"} v={gastos > 0.005 ? entro - gastos : historico} tono="neutro" d={gastos > 0.005 ? `${dinero(gastos)} en gastos` : "desde el primer cobro"} />
        </dl>
      </motion.section>

      <section className={card}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-fg">Mes a mes</h2>
            <p className="mt-1 text-sm leading-relaxed text-fg-dim">
              {mejor ? <>Mejor mes: <b className="font-semibold text-fg">{etiquetaMes(mejor.mes, true)}</b> con <b className="font-semibold tabular-nums text-ok">{dinero(mejor.entro)}</b>. </> : null}
              Toca una barra para ver solo ese mes.
            </p>
          </div>
          {/* Leyenda con el total de cada serie; facturado y acumulado se prenden y apagan. */}
          <div className="grid grid-cols-3 gap-2">
            {([
              { id: "entro", label: "Entró", valor: suma(puntos, (p) => p.entro), punto: "bg-ok", activo: true },
              { id: "facturado", label: "Facturado", valor: suma(puntos, (p) => p.facturado), punto: "bg-info", activo: series.facturado },
              { id: "acumulado", label: "Acumulado", valor: puntos[puntos.length - 1]?.acumulado ?? 0, punto: "bg-grape", activo: series.acumulado },
            ] as const).map((x) => (
              <button key={x.id} type="button" disabled={x.id === "entro"} aria-pressed={x.activo}
                onClick={() => x.id !== "entro" && setSeries((v) => ({ ...v, [x.id]: !v[x.id as "facturado" | "acumulado"] }))}
                className={`min-h-11 min-w-0 rounded-xl border px-2 py-2 text-left sm:px-3 transition-[opacity,transform,border-color,box-shadow] duration-200 ease-out active:scale-[0.97] disabled:active:scale-100 disabled:cursor-default ${x.activo ? "border-line bg-panel shadow-sm" : "border-dashed border-line-mid opacity-50 hover:opacity-80"}`}>
                <span className="flex items-center gap-2 text-xs font-medium text-fg-dim"><span className={`h-2 w-2 rounded-full ${x.punto}`} aria-hidden />{x.label}</span>
                <span className="mt-1 block truncate text-xs font-semibold tabular-nums text-fg sm:text-sm"><Monto texto={dinero(x.valor)} /></span>
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4">
          {puntos.some((p) => p.entro || p.facturado || p.gastos)
            ? <GraficaMensual datos={puntos} seleccion={mes} onSelect={setMes} series={{ ...series, gastos: gastosC.length > 0 }} />
            : <Vacio titulo={`Sin movimientos en ${periodoTexto}`} texto="Elige otro año o «Todo el tiempo» para ver la historia completa." accion={<button type="button" onClick={() => { setAnio("todo"); setMes(null); }} className="inline-flex min-h-11 items-center rounded-lg border border-line-mid px-4 text-sm font-semibold text-fg hover:border-line-loud">Ver todo el tiempo</button>} />}
        </div>
        <TablaMeses puntos={puntos} mes={mes} onSelect={setMes} conGastos={gastosC.length > 0} />
      </section>

      <section className={card}>
        <div role="tablist" aria-label="Detalle" className="flex gap-1 overflow-x-auto border-b border-line">
          {([["clientes", "Por cliente"], ["facturas", "Facturas"], ["pagos", "Pagos recibidos"]] as const).map(([id, l]) => (
            <button key={id} role="tab" type="button" aria-selected={vista === id} onClick={() => setVista(id)} className={`relative inline-flex min-h-11 shrink-0 items-center gap-2 px-3 text-sm font-semibold transition-[color,transform] duration-150 ease-out active:scale-[0.97] ${vista === id ? "text-fg" : "text-fg-dim hover:text-fg"}`}>
              {l}
              <span className="rounded-full bg-fill px-2 text-xs tabular-nums text-fg-dim">{id === "clientes" ? (todos ? clientes.length : elegidos.size) : id === "facturas" ? facturasP.length : entradasP.length}</span>
              {vista === id && <motion.span layoutId="pestana-dinero" className="absolute inset-x-0 -bottom-px h-0.5 bg-brand" transition={quieto ? { duration: 0 } : { type: "spring", duration: 0.35, bounce: 0.15 }} />}
            </button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={vista} role="tabpanel" initial={quieto ? false : { opacity: 0, filter: "blur(4px)", transform: "translateY(6px)" }} animate={{ opacity: 1, filter: "blur(0px)", transform: "translateY(0px)" }} exit={{ opacity: 0, filter: "blur(2px)", transition: { duration: 0.12 } }} transition={{ duration: 0.22, ease: EASE }} className="mt-4">
            {vista === "clientes" && <PorCliente facturas={datos.facturas.filter((f) => enPeriodo(f.fecha))} entradas={datos.entradas.filter((e) => enPeriodo(e.fecha))} saldos={datos.saldos} elegidos={elegidos} onAlternar={alternar} onLimpiar={() => setElegidos(new Set())} />}
            {vista === "facturas" && <Facturas facturas={facturasP} />}
            {vista === "pagos" && <Pagos entradas={entradasP} />}
          </motion.div>
        </AnimatePresence>
      </section>
    </div>
  );
}

function Vacio({ titulo, texto, accion }: { titulo: string; texto: string; accion?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line-mid px-4 py-8 text-center">
      <p className="font-medium text-fg">{titulo}</p>
      <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-fg-dim">{texto}</p>
      {accion && <div className="mt-4 flex justify-center">{accion}</div>}
    </div>
  );
}

/** Tabla del mes a mes, del más reciente al más viejo, con subtotal por año. */
function TablaMeses({ puntos, mes, onSelect, conGastos }: { puntos: PuntoMes[]; mes: string | null; onSelect: (m: string | null) => void; conGastos: boolean }) {
  const [abierta, setAbierta] = useState(false);
  const filas = [...puntos].reverse();
  const max = Math.max(1, ...puntos.map((p) => Math.max(p.entro, p.facturado)));
  const anios = [...new Set(filas.map((p) => p.mes.slice(0, 4)))];
  const cols = conGastos ? "sm:grid-cols-[minmax(0,1fr)_repeat(4,8rem)]" : "sm:grid-cols-[minmax(0,1fr)_repeat(3,8rem)]";
  return (
    <div className="mt-6 border-t border-line pt-4">
      <button type="button" onClick={() => setAbierta((v) => !v)} aria-expanded={abierta} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-fg hover:text-brand-fg">
        <span className={`inline-block transition-transform ${abierta ? "rotate-90" : ""}`} aria-hidden>›</span>
        {abierta ? "Ocultar la tabla mes por mes" : `Ver la tabla mes por mes (${puntos.length})`}
      </button>
      {abierta && (
        <div className="mt-2">
          <div className={`hidden gap-3 border-b border-line pb-2 text-xs text-fg-faint sm:grid ${cols}`} aria-hidden>
            <span>Mes</span><span className="text-right">Facturado</span><span className="text-right">Entró</span>{conGastos && <span className="text-right">Gastos</span>}<span className="text-right">Acumulado</span>
          </div>
          {anios.map((a) => {
            const delAnio = filas.filter((p) => p.mes.startsWith(a));
            return (
              <div key={a}>
                <div className={`grid grid-cols-2 gap-3 border-b border-line bg-fill/60 px-2 py-2 text-sm font-semibold ${cols}`}>
                  <span className="text-fg">{a}</span>
                  <span className="text-right tabular-nums text-info">{dinero(suma(delAnio, (p) => p.facturado))}</span>
                  <span className="col-span-2 text-right tabular-nums text-ok sm:col-span-1">{dinero(suma(delAnio, (p) => p.entro))}<span className="text-xs font-normal text-fg-dim sm:hidden"> entró</span></span>
                  {conGastos && <span className="hidden text-right tabular-nums text-fg-dim sm:block">{dinero(suma(delAnio, (p) => p.gastos))}</span>}
                  <span className="hidden sm:block" />
                </div>
                <ul className="divide-y divide-line">
                  {delAnio.map((p) => (
                    <li key={p.mes}>
                      <button type="button" onClick={() => onSelect(p.mes === mes ? null : p.mes)} aria-pressed={p.mes === mes} className={`grid w-full grid-cols-2 items-center gap-x-3 gap-y-1 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-fill ${cols} ${p.mes === mes ? "bg-brand/10" : ""}`}>
                        <span className="col-span-2 min-w-0 sm:col-span-1">
                          <span className="text-fg">{etiquetaMes(p.mes, true)}</span>
                          {p.aprox > 0.005 && <span className="ml-2 rounded-full bg-warn/10 px-2 text-xs text-warn">sin fecha exacta</span>}
                          <span className="mt-1 flex gap-1" aria-hidden>
                            <span className="h-1 rounded-full bg-info transition-[width] duration-700" style={{ width: `${(p.facturado / max) * 50}%` }} />
                            <span className="h-1 rounded-full bg-ok transition-[width] duration-700" style={{ width: `${(p.entro / max) * 50}%` }} />
                          </span>
                        </span>
                        <span className="tabular-nums text-info sm:text-right"><span className="text-xs text-fg-faint sm:hidden">Facturado </span>{dinero(p.facturado)}</span>
                        <span className="text-right tabular-nums font-semibold text-ok"><span className="text-xs font-normal text-fg-faint sm:hidden">Entró </span>{dinero(p.entro)}</span>
                        {conGastos && <span className="hidden text-right tabular-nums text-fg-dim sm:block">{dinero(p.gastos)}</span>}
                        <span className="hidden text-right tabular-nums text-fg-dim sm:block">{dinero(p.acumulado)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

type FilaCliente = { id: string; nombre: string; facturado: number; entro: number; facturas: number; saldo: SaldoCliente | null };

/** Suma de un grupo de filas: lo que va en el pie de la tabla. */
function totalDe(filas: FilaCliente[]) {
  const pagado = suma(filas, (f) => f.saldo?.pagado ?? 0), debe = suma(filas, (f) => f.saldo?.pendiente ?? 0);
  return { facturado: suma(filas, (f) => f.facturado), entro: suma(filas, (f) => f.entro), debe, sinFacturar: suma(filas, (f) => f.saldo?.sinFacturar ?? 0), cobrado: pct(pagado, pagado + debe) };
}

/**
 * Por cliente: lo facturado y lo que entró en el periodo, y lo que debe hoy con la misma cuenta que su ficha. El % cobrado
 * es de todo lo que ha debido (pagado ÷ pagado + debe), no solo de sus facturas: un plan 50/50 sin facturar ya cuenta.
 * Tocar el círculo marca el cliente; con varios marcados, todo el tablero y el pie muestran la suma de esos.
 */
function PorCliente({ facturas, entradas, saldos, elegidos, onAlternar, onLimpiar }: { facturas: FilaFactura[]; entradas: DatosTablero["entradas"]; saldos: SaldoCliente[]; elegidos: Set<string>; onAlternar: (id: string) => void; onLimpiar: () => void }) {
  const quieto = useReducedMotion();
  const filas = useMemo(() => {
    const m = new Map<string, FilaCliente>();
    const fila = (id: string | null, nombre: string) => {
      const k = id ?? "sin";
      if (!m.has(k)) m.set(k, { id: k, nombre, facturado: 0, entro: 0, facturas: 0, saldo: null });
      return m.get(k)!;
    };
    for (const f of facturas) if (f.cuenta) { const x = fila(f.clienteId, f.cliente); x.facturado += f.total; x.facturas++; }
    for (const e of entradas) fila(e.clienteId, e.cliente).entro += e.monto;
    // Quien debe sale siempre, aunque no haya tenido movimiento en el periodo.
    for (const s of saldos) { if (s.pendiente > 0.005 || m.has(s.clienteId)) fila(s.clienteId, s.cliente).saldo = s; }
    return [...m.values()].sort((a, b) => b.entro - a.entro || (b.saldo?.pendiente ?? 0) - (a.saldo?.pendiente ?? 0) || b.facturado - a.facturado);
  }, [facturas, entradas, saldos]);
  if (!filas.length) return <Vacio titulo="Ningún cliente con movimientos en este periodo" texto="Elige otro año o «Todo el tiempo» en los filtros de arriba." />;
  const max = Math.max(1, ...filas.map((f) => (f.saldo ? f.saldo.pagado + f.saldo.pendiente : f.entro)));
  const marcadas = filas.filter((f) => elegidos.has(f.id));
  const total = totalDe(filas), sel = totalDe(marcadas);
  const columnas = "lg:grid-cols-[minmax(0,1fr)_repeat(4,8rem)]";
  return (
    <div>
      <div className={`hidden gap-3 border-b border-line pb-2 text-xs text-fg-faint lg:grid ${columnas}`} aria-hidden>
        <span className="pl-12">Cliente · toca el círculo para sumar varios</span><span className="text-right">Facturado</span><span className="text-right">Entró</span><span className="text-right">Debe hoy</span><span className="text-right">% cobrado</span>
      </div>
      <ol className="divide-y divide-line">
        {filas.map((f, i) => {
          const s = f.saldo, marcado = elegidos.has(f.id);
          const cobrado = s ? pct(s.pagado, s.pagado + s.pendiente) : pct(f.entro, f.facturado);
          return (
            <motion.li key={f.id} initial={quieto ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 12) * 0.03 }}
              className={`-mx-2 grid gap-2 rounded-xl px-2 py-3 transition-colors duration-200 lg:items-center lg:gap-3 ${columnas} ${marcado ? "bg-brand/5" : ""}`}>
              <span className="min-w-0">
                <span className="flex items-center gap-3">
                  {f.id !== "sin" ? <Marca nombre={f.nombre} marcado={marcado} tono={s && s.vencido > 0.005 ? "vencido" : s && s.pendiente > 0.005 ? "cobrar" : "entro"} onClick={() => onAlternar(f.id)} />
                    : <span className="h-11 w-11 shrink-0" aria-hidden />}
                  <span className="min-w-0">
                    {f.id !== "sin" ? <Link href={`/empresa/clientes/${f.id}`} className="inline-flex min-h-11 items-center text-sm font-medium text-fg hover:underline [overflow-wrap:anywhere]">{f.nombre}</Link> : <span className="text-sm font-medium text-fg">{f.nombre}</span>}
                  </span>
                </span>
                <span className="mt-1 block max-w-md pl-14"><Apilada total={max} partes={s
                  ? [{ valor: s.pagado, tono: "entro" }, { valor: s.enFacturas - s.vencido, tono: "cobrar" }, { valor: s.sinFacturar, tono: "sinFactura" }, { valor: s.vencido, tono: "vencido" }]
                  : [{ valor: f.entro, tono: "entro" }]} /></span>
                <span className="mt-2 flex flex-wrap items-center gap-2 pl-14 text-xs text-fg-dim">
                  <span>{f.facturas} factura(s) en el periodo</span>
                  {s && s.vencido > 0.005 && <span className="rounded-full bg-danger/10 px-2 py-1 font-semibold text-danger tabular-nums">{dinero(s.vencido)} vencido</span>}
                  {s && s.sinFacturar > 0.005 && <span title="Plan de pagos o fases ya iniciadas que todavía no tienen factura" className="rounded-full bg-warn/10 px-2 py-1 font-semibold text-warn tabular-nums">{dinero(s.sinFacturar)} sin factura</span>}
                </span>
              </span>
              <span className="grid grid-cols-2 gap-x-3 gap-y-2 pl-14 sm:grid-cols-4 lg:contents">
                <Celda k="Facturado" v={dinero(f.facturado)} clase="text-info" />
                <Celda k="Entró" v={dinero(f.entro)} clase="text-ok font-semibold" />
                <Celda k="Debe hoy" v={dinero(s?.pendiente ?? 0)} clase={(s?.pendiente ?? 0) > 0.005 ? "text-warn font-semibold" : "text-fg-faint"} />
                <Celda k="% cobrado" v={cobrado === null ? "—" : `${Math.min(100, cobrado)} %`} clase="text-fg" />
              </span>
            </motion.li>
          );
        })}
      </ol>
      {/* Pie: el total de todos y, si hay marcados, la suma de esos. */}
      <dl className="mt-2 grid gap-2 border-t-2 border-line-mid pt-3">
        <FilaTotal etiqueta={`Total de todos · ${filas.filter((f) => f.id !== "sin").length} cliente(s)`} t={total} columnas={columnas} />
        <AnimatePresence initial={false}>
          {marcadas.length > 0 && (
            <motion.div key="sel" initial={quieto ? false : { opacity: 0, transform: "translateY(8px) scale(0.98)" }} animate={{ opacity: 1, transform: "translateY(0px) scale(1)" }} exit={{ opacity: 0, transform: "translateY(4px) scale(0.98)", transition: { duration: 0.12 } }} transition={{ duration: 0.22, ease: EASE }}
              className="z-10 mt-2 md:sticky md:bottom-4">
              <TotalSeleccion nombres={marcadas.map((f) => f.nombre)} t={sel} onLimpiar={onLimpiar} />
            </motion.div>
          )}
        </AnimatePresence>
      </dl>
    </div>
  );
}

/**
 * La suma de los clientes marcados, en un bloque de color propio que no se confunde con el total de todos: dice qué se
 * está sumando (los nombres) y cada cifra lleva su punto de color como en el resto del tablero.
 */
function TotalSeleccion({ nombres, t, onLimpiar }: { nombres: string[]; t: ReturnType<typeof totalDe>; onLimpiar: () => void }) {
  const cifras: [string, number | string, string][] = [["Facturado", t.facturado, "bg-info"], ["Entró", t.entro, "bg-ok"], ["Debe hoy", t.debe, "bg-warn"], ["% cobrado", t.cobrado === null ? "—" : `${Math.min(100, t.cobrado)} %`, "bg-on-brand"]];
  return (
    <section aria-label="Suma de los clientes seleccionados" className="relative isolate overflow-hidden rounded-2xl bg-brand p-4 text-on-brand shadow-[0_16px_40px_-12px_rgb(0_0_0/0.45)] sm:p-6">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 -z-10 h-56 w-56 rounded-full bg-on-brand/10 blur-2xl" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-80">Suma de {nombres.length} seleccionado(s)</p>
          <p className="mt-1 text-sm font-medium [overflow-wrap:anywhere]">{nombres.join(" + ")}</p>
        </div>
        <button type="button" onClick={onLimpiar} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-on-brand/15 px-4 text-sm font-semibold transition-[background-color,transform] duration-150 ease-out hover:bg-on-brand/25 active:scale-[0.97] sm:min-h-9">
          Quitar selección
        </button>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-on-brand/20 pt-4 sm:grid-cols-4">
        {cifras.map(([k, v, c]) => (
          <div key={k} className="min-w-0">
            <dt className="inline-flex items-center gap-2 text-xs font-medium opacity-80"><span className={`h-2 w-2 rounded-full ring-2 ring-on-brand/70 ${c}`} aria-hidden />{k}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums tracking-tight sm:text-xl">{typeof v === "number" ? <Cuenta valor={v} /> : v}</dd>
          </div>
        ))}
      </dl>
      {t.sinFacturar > 0.005 && <p className="mt-3 text-xs opacity-80">De lo que deben, {dinero(t.sinFacturar)} todavía no tiene factura (plan de pagos o fases iniciadas).</p>}
    </section>
  );
}

function FilaTotal({ etiqueta, t, columnas, accion }: { etiqueta: string; t: ReturnType<typeof totalDe>; columnas: string; accion?: React.ReactNode }) {
  return (
    <div className={`grid gap-2 px-2 py-2 lg:items-center lg:gap-3 ${columnas}`}>
      <dt className="flex flex-wrap items-center gap-2 text-sm font-semibold text-fg">
        {etiqueta}
        {t.sinFacturar > 0.005 && <span className="rounded-full bg-warn/10 px-2 py-1 text-xs font-semibold text-warn tabular-nums">{dinero(t.sinFacturar)} sin factura</span>}
        {accion}
      </dt>
      <dd className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4 lg:contents">
        <Celda k="Facturado" v={dinero(t.facturado)} clase="text-info font-semibold" />
        <Celda k="Entró" v={dinero(t.entro)} clase="text-ok font-semibold" />
        <Celda k="Debe hoy" v={dinero(t.debe)} clase={t.debe > 0.005 ? "text-warn font-semibold" : "text-fg-faint"} />
        <Celda k="% cobrado" v={t.cobrado === null ? "—" : `${Math.min(100, t.cobrado)} %`} clase="text-fg font-semibold" />
      </dd>
    </div>
  );
}

/** Círculo con las iniciales que, al tocarlo, pasa a palomita: marca el cliente para sumarlo. */
function Marca({ nombre, marcado, tono, onClick }: { nombre: string; marcado: boolean; tono: Tono; onClick: () => void }) {
  const quieto = useReducedMotion();
  return (
    <button type="button" role="checkbox" aria-checked={marcado} aria-label={`Sumar ${nombre}`} onClick={onClick}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full transition-transform duration-150 ease-out active:scale-[0.94]">
      <span className={`relative grid h-9 w-9 place-items-center overflow-hidden rounded-full text-xs font-semibold ring-1 transition-colors duration-200 ${marcado ? "bg-brand text-on-brand ring-brand" : `${COLOR[tono].suave} ${COLOR[tono].texto} ring-transparent hover:ring-line-mid`}`}>
        <AnimatePresence initial={false} mode="popLayout">
          {marcado ? (
            <motion.svg key="si" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"
              initial={quieto ? false : { opacity: 0, scale: 0.6, filter: "blur(2px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} exit={{ opacity: 0, scale: 0.6 }} transition={{ type: "spring", duration: 0.3, bounce: 0.2 }} aria-hidden>
              <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={quieto ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.25, ease: EASE, delay: 0.05 }} />
            </motion.svg>
          ) : (
            <motion.span key="no" initial={quieto ? false : { opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.15, ease: EASE }} aria-hidden>{iniciales(nombre)}</motion.span>
          )}
        </AnimatePresence>
      </span>
    </button>
  );
}

/** Filtro de clientes con varios a la vez: buscador y casillas; vacío = todos. */
function SelectorClientes({ clientes, elegidos, onAlternar, onLimpiar }: { clientes: [string, string][]; elegidos: Set<string>; onAlternar: (id: string) => void; onLimpiar: () => void }) {
  const quieto = useReducedMotion();
  const [abierto, setAbierto] = useState(false);
  const [q, setQ] = useState("");
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => { if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setAbierto(false); };
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", fuera); document.removeEventListener("keydown", esc); };
  }, [abierto]);
  const texto = q.trim().toLowerCase();
  const lista = clientes.filter(([, n]) => !texto || n.toLowerCase().includes(texto));
  const etiqueta = elegidos.size === 0 ? "Todos los clientes" : elegidos.size === 1 ? clientes.find(([id]) => elegidos.has(id))?.[1] ?? "1 cliente" : `${elegidos.size} clientes`;
  return (
    <div ref={caja} className="relative w-full sm:w-72">
      <button type="button" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto} aria-haspopup="listbox"
        className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border px-3 text-left text-sm transition-[border-color,transform] duration-150 ease-out active:scale-[0.99] sm:min-h-9 ${elegidos.size ? "border-brand/50 bg-brand/5 text-fg" : "border-line-mid bg-panel text-fg"}`}>
        <span className="truncate font-medium">{etiqueta}</span>
        <span className="flex items-center gap-2">
          {elegidos.size > 1 && <span className="rounded-full bg-brand px-2 text-xs font-semibold text-on-brand tabular-nums">{elegidos.size}</span>}
          <svg viewBox="0 0 20 20" className={`h-4 w-4 text-fg-dim transition-transform duration-200 ease-out ${abierto ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
      </button>
      <AnimatePresence>
        {abierto && (
          <motion.div initial={quieto ? false : { opacity: 0, transform: "translateY(-4px) scale(0.97)" }} animate={{ opacity: 1, transform: "translateY(0px) scale(1)" }} exit={{ opacity: 0, transform: "translateY(-4px) scale(0.97)", transition: { duration: 0.12 } }} transition={{ duration: 0.18, ease: EASE }}
            style={{ transformOrigin: "top right" }}
            className="absolute right-0 top-full z-30 mt-2 w-full min-w-72 overflow-hidden rounded-2xl border border-line bg-pop/95 shadow-2xl backdrop-blur-xl">
            <div className="border-b border-line p-2">
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente" aria-label="Buscar cliente" autoFocus
                className="min-h-11 w-full rounded-lg border border-line-mid bg-panel px-3 text-base text-fg focus:border-brand focus:outline-none sm:min-h-9 sm:text-sm" />
            </div>
            <ul role="listbox" aria-multiselectable="true" className="max-h-72 overflow-y-auto p-1">
              {lista.map(([id, n]) => {
                const si = elegidos.has(id);
                return (
                  <li key={id}>
                    <button type="button" role="option" aria-selected={si} onClick={() => onAlternar(id)}
                      className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-fg transition-colors duration-150 hover:bg-fill">
                      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors duration-150 ${si ? "border-brand bg-brand text-on-brand" : "border-line-loud"}`} aria-hidden>
                        {si && <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
                      </span>
                      <span className="min-w-0 truncate">{n}</span>
                    </button>
                  </li>
                );
              })}
              {!lista.length && <li className="px-3 py-4 text-center text-sm text-fg-dim">Ningún cliente coincide.</li>}
            </ul>
            <div className="flex items-center justify-between gap-2 border-t border-line p-2">
              <button type="button" onClick={onLimpiar} disabled={!elegidos.size} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-fg-dim hover:text-fg disabled:opacity-40 sm:min-h-9">Ver todos</button>
              <button type="button" onClick={() => setAbierto(false)} className="min-h-11 rounded-lg bg-brand px-4 text-sm font-semibold text-on-brand transition-transform duration-150 ease-out hover:bg-brand-hi active:scale-[0.97] sm:min-h-9">
                {elegidos.size ? `Ver la suma de ${elegidos.size}` : "Listo"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Celda({ k, v, clase }: { k: string; v: string; clase: string }) {
  return (
    <span className="min-w-0 lg:text-right">
      <span className="block text-xs text-fg-faint lg:hidden">{k}</span>
      <span className={`text-sm tabular-nums [overflow-wrap:anywhere] ${clase}`}>{v}</span>
    </span>
  );
}

const FILTROS: { id: "todas" | EstadoFactura | "otras"; label: string }[] = [
  { id: "todas", label: "Todas" }, { id: "pagada", label: "Pagadas" }, { id: "parcial", label: "Abonadas" },
  { id: "pendiente", label: "Por cobrar" }, { id: "vencida", label: "Vencidas" }, { id: "otras", label: "Borradores y anuladas" },
];

function Facturas({ facturas }: { facturas: FilaFactura[] }) {
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]["id"]>("todas");
  const [q, setQ] = useState("");
  const [cuantas, setCuantas] = useState(50);
  const cumple = (f: FilaFactura, id: (typeof FILTROS)[number]["id"]) => id === "todas" ? f.cuenta : id === "otras" ? !f.cuenta : f.estado === id;
  const texto = q.trim().toLowerCase();
  const lista = facturas.filter((f) => cumple(f, filtro) && (!texto || `${f.numero} ${f.cliente} ${f.titulo}`.toLowerCase().includes(texto)));
  const visibles = lista.slice(0, cuantas);
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className={segmento} role="group" aria-label="Estado">
          {FILTROS.map((x) => {
            const n = facturas.filter((f) => cumple(f, x.id)).length;
            if (!n && x.id !== "todas") return null;
            return <Pastilla key={x.id} grupo="estado-factura" activo={filtro === x.id} onClick={() => setFiltro(x.id)}>{x.label}<span className="tabular-nums text-fg-faint">{n}</span></Pastilla>;
          })}
        </div>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar número, cliente o concepto" aria-label="Buscar factura" className="min-h-11 w-full rounded-lg border border-line-mid bg-panel px-3 text-base text-fg sm:text-sm lg:w-72" />
      </div>
      {lista.length ? (
        <>
          <dl className="grid grid-cols-3 gap-3 rounded-xl bg-fill p-3 text-sm">
            <div><dt className="text-xs text-fg-dim">Total</dt><dd className="tabular-nums font-semibold text-info">{dinero(suma(lista, (f) => f.total))}</dd></div>
            <div><dt className="text-xs text-fg-dim">Cobrado</dt><dd className="tabular-nums font-semibold text-ok">{dinero(suma(lista, (f) => f.pagado))}</dd></div>
            <div><dt className="text-xs text-fg-dim">Falta</dt><dd className="tabular-nums font-semibold text-warn">{dinero(suma(lista, (f) => f.falta))}</dd></div>
          </dl>
          <ul className="divide-y divide-line">
            {visibles.map((f, i) => (
              <motion.li key={f.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 12) * 0.02 }}>
                <Link href={`/empresa/facturas/${f.id}`} className="-mx-2 grid gap-2 rounded-lg px-2 py-3 hover:bg-fill sm:grid-cols-[minmax(0,1fr)_7rem_9rem] sm:items-center sm:gap-3">
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${ESTADO[f.estado].clase}`}>{ESTADO[f.estado].label}</span>
                      <span className="text-sm font-medium text-fg [overflow-wrap:anywhere]">{f.numero} · {f.cliente}</span>
                    </span>
                    <span className="mt-1 block truncate text-xs text-fg-dim">{f.titulo}</span>
                  </span>
                  <span className="text-xs text-fg-dim">
                    {fechaCorta(f.fecha)}
                    {f.falta > 0.005 && f.vence && <span className={`block ${f.estado === "vencida" ? "font-semibold text-danger" : ""}`}>{f.estado === "vencida" ? "Venció" : "Vence"} {fechaCorta(f.vence)}</span>}
                  </span>
                  <span className="grid gap-1 sm:text-right">
                    <span className="text-sm font-semibold tabular-nums text-fg">{dinero(f.total)}</span>
                    {f.cuenta && f.total > 0.005 && <Apilada total={f.total} partes={[{ valor: f.pagado, tono: "entro" }, { valor: f.falta, tono: f.estado === "vencida" ? "vencido" : "cobrar" }]} alto="h-1" />}
                    {f.falta > 0.005 && <span className="text-xs tabular-nums text-warn">faltan {dinero(f.falta)}</span>}
                  </span>
                </Link>
              </motion.li>
            ))}
          </ul>
          {lista.length > cuantas && <button type="button" onClick={() => setCuantas((c) => c + 50)} className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-line-mid text-sm font-semibold text-fg-mute hover:text-fg">Ver {Math.min(50, lista.length - cuantas)} más de {lista.length - cuantas}</button>}
          <dl className="grid gap-2 border-t-2 border-line-mid px-2 pt-3 text-sm sm:grid-cols-[minmax(0,1fr)_repeat(3,9rem)] sm:items-center">
            <dt className="font-semibold text-fg">Total · {lista.length} factura(s)</dt>
            <dd className="sm:text-right"><span className="block text-xs text-fg-faint">Facturado</span><span className="font-semibold tabular-nums text-info">{dinero(suma(lista, (f) => f.total))}</span></dd>
            <dd className="sm:text-right"><span className="block text-xs text-fg-faint">Cobrado</span><span className="font-semibold tabular-nums text-ok">{dinero(suma(lista, (f) => f.pagado))}</span></dd>
            <dd className="sm:text-right"><span className="block text-xs text-fg-faint">Falta</span><span className="font-semibold tabular-nums text-warn">{dinero(suma(lista, (f) => f.falta))}</span></dd>
          </dl>
        </>
      ) : (
        <Vacio titulo={texto ? "Ninguna factura coincide" : "Ninguna factura en este periodo"} texto={texto ? "Revisa el número o el nombre, o quita el filtro de estado." : "Elige otro año o «Todo el tiempo» en los filtros de arriba."} accion={<Link href="/empresa/facturas/nueva" className="inline-flex min-h-11 items-center rounded-lg border border-line-mid px-4 text-sm font-semibold text-fg hover:border-line-loud">Nueva factura</Link>} />
      )}
    </div>
  );
}

function Pagos({ entradas }: { entradas: DatosTablero["entradas"] }) {
  const [cuantos, setCuantos] = useState(50);
  if (!entradas.length) return <Vacio titulo="Ningún pago en este periodo" texto="Cuando un cliente pague y se confirme, aparece aquí con su fecha y método." />;
  const porMetodo = Object.entries(entradas.reduce<Record<string, number>>((a, e) => { const k = e.sinFecha ? "sin" : e.metodo; a[k] = (a[k] ?? 0) + e.monto; return a; }, {})).sort((a, b) => b[1] - a[1]);
  const total = suma(entradas, (e) => e.monto);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="inline-flex min-h-9 items-center rounded-lg bg-ok/10 px-3 font-semibold text-ok tabular-nums">Total {dinero(total)}</span>
        {porMetodo.map(([k, v]) => <span key={k} className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-fill px-3 text-fg-dim">{k === "sin" ? "Cobros viejos" : PAGO_METODO_LABEL[k as PagoMetodo] ?? k}<b className="tabular-nums text-fg">{dinero(v)}</b></span>)}
      </div>
      <ul className="divide-y divide-line">
        {entradas.slice(0, cuantos).map((e) => (
          <li key={e.id} className="grid gap-1 py-3 sm:grid-cols-[7rem_minmax(0,1fr)_9rem] sm:items-center sm:gap-3">
            <span className="text-xs text-fg-dim">{fechaCorta(e.fecha)}</span>
            <span className="min-w-0 text-sm">
              <span className="flex flex-wrap items-center gap-2">
                {e.clienteId ? <Link href={`/empresa/clientes/${e.clienteId}`} className="inline-flex min-h-11 items-center font-medium text-fg hover:underline [overflow-wrap:anywhere]">{e.cliente}</Link> : <span className="font-medium text-fg">{e.cliente}</span>}
                {e.sinFecha && <span className="rounded-full bg-warn/10 px-2 text-xs text-warn">fecha de la factura</span>}
              </span>
              <span className="block text-xs text-fg-dim [overflow-wrap:anywhere]">
                {e.facturaId ? <Link href={`/empresa/facturas/${e.facturaId}`} className="inline-flex min-h-11 items-center hover:underline">{e.numero ?? "Factura"}</Link> : "Sin factura"}
                {!e.sinFecha && ` · ${PAGO_METODO_LABEL[e.metodo as PagoMetodo] ?? e.metodo}`}{e.referencia ? ` · ref. ${e.referencia}` : ""}
              </span>
            </span>
            <span className="text-sm font-semibold tabular-nums text-ok sm:text-right">{dinero(e.monto)}</span>
          </li>
        ))}
      </ul>
      {entradas.length > cuantos && <button type="button" onClick={() => setCuantos((c) => c + 50)} className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-line-mid text-sm font-semibold text-fg-mute hover:text-fg">Ver {Math.min(50, entradas.length - cuantos)} más</button>}
      <div className="flex items-center justify-between gap-3 border-t-2 border-line-mid px-2 pt-3 text-sm">
        <span className="font-semibold text-fg">Total · {entradas.length} pago(s)</span>
        <span className="font-semibold tabular-nums text-ok">{dinero(total)}</span>
      </div>
    </div>
  );
}
