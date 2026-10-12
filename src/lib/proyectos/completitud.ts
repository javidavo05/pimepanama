/**
 * «Qué le falta» a un proyecto: qué tan enlazado está con todo lo que lo hace cobrable y visible
 * (cliente, fases con precio, acuerdo, repo, plataforma, reuniones, portal y cobro).
 *
 * Función pura: recibe lo que ya está guardado en la base y no llama a ninguna API externa. El repo se
 * da por verificado solo si la última verificación con GitHub quedó guardada sin error (Project.githubCheck).
 *
 * Un requisito marcado «No aplica» (Project.linkWaived, migración 0047) no cuenta en el porcentaje.
 * Algunos dejan de aplicar solos («auto»):
 * - el portal, cuando el proyecto no tiene cliente y se marcó «No aplica»;
 * - cotización o contrato, plan de cobro y portal, cuando el cliente es la empresa interna (Client.internal):
 *   un producto propio no se cotiza, no se cobra ni tiene cuenta de cliente.
 */

export const REQUISITOS = ["cliente", "fases", "acuerdo", "repo", "vercel", "supabase", "reunion", "portal", "cobro"] as const;
export type RequisitoKey = (typeof REQUISITOS)[number];

/** Pestañas del detalle del proyecto (?tab=). */
export type PestanaProyecto = "resumen" | "tareas" | "reuniones" | "fases" | "dinero" | "repo" | "tickets" | "clientes";

/** Adónde lleva el botón que resuelve un requisito: una pestaña del detalle (y un punto dentro) o un asistente. */
export type Accion = { tipo: "pestana"; tab: PestanaProyecto; ancla?: string; label: string } | { tipo: "enlace"; href: string; label: string };

export type DatosCompletitud = {
  id: string;
  clientes: { id: string }[];
  /** Fases vigentes (sin orden de cambio o con la orden aprobada). */
  fases: { price: number }[];
  presupuesto: number | null;
  cotizaciones: number;
  contratos: number;
  repo: string | null;
  /** Lo guardado de la última verificación con GitHub; null si nunca se verificó. */
  githubCheck: { error?: string | null } | null;
  plataformas: { id: string; vercel: boolean; supabase: boolean }[];
  reuniones: number;
  portalVisible: boolean;
  /** Facturas emitidas del proyecto (no anuladas). */
  facturas: number;
  planDeCobro: boolean;
  waived: string[];
  /** El proyecto es de la empresa interna (algún cliente con Client.internal). */
  interno?: boolean;
};

/** Requisitos que no aplican a un producto de la empresa interna. */
export const NO_APLICAN_A_INTERNOS: readonly RequisitoKey[] = ["acuerdo", "cobro", "portal"];

export type Requisito = {
  key: RequisitoKey;
  label: string;
  /** Qué hay (si se cumple) o qué falta (si no). */
  detalle: string;
  ok: boolean;
  /** Marcado «No aplica» a mano. */
  waived: boolean;
  /** Deja de aplicar solo, por otro requisito (p. ej. el portal en un proyecto interno). */
  auto: boolean;
  /** Se puede marcar «No aplica». */
  waivable: boolean;
  /** Por qué podría no aplicar: el texto del botón «No aplica». */
  porQueNoAplica: string;
  accion: Accion | null;
};

export type Completitud = { pct: number; cumplidos: number; aplican: number; requisitos: Requisito[]; faltan: Requisito[] };

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

export function completitudProyecto(d: DatosCompletitud): Completitud {
  const waived = new Set(d.waived.filter((k): k is RequisitoKey => (REQUISITOS as readonly string[]).includes(k)));
  const fasesConPrecio = d.fases.filter((f) => f.price > 0).length;
  const plataforma = d.plataformas[0] ?? null;
  const conVercel = d.plataformas.find((p) => p.vercel) ?? null;
  const conSupabase = d.plataformas.find((p) => p.supabase) ?? null;
  const verificado = !!d.repo && !!d.githubCheck && !d.githubCheck.error;
  const sinCliente = waived.has("cliente");
  const nuevaPlataforma = `/empresa/platforms?nueva=1&proyecto=${d.id}`;
  const abrirPlataforma = (id: string) => `/empresa/platforms?abrir=${id}`;

  const base: Omit<Requisito, "waived" | "auto">[] = [
    {
      key: "cliente",
      label: "Cliente asignado",
      ok: d.clientes.length > 0,
      detalle: d.clientes.length ? plural(d.clientes.length, "cliente", "clientes") : "Sin cliente: no se puede cobrar ni mostrar en su cuenta.",
      waivable: true,
      porQueNoAplica: "Es interno",
      accion: { tipo: "pestana", tab: "clientes", label: "Asignar cliente" },
    },
    {
      key: "fases",
      label: "Fases con precio",
      ok: fasesConPrecio > 0 || (d.presupuesto ?? 0) > 0,
      detalle: fasesConPrecio > 0 ? plural(fasesConPrecio, "fase con precio", "fases con precio") : (d.presupuesto ?? 0) > 0 ? "Presupuesto definido" : d.fases.length ? "Las fases no tienen precio." : "Sin fases ni presupuesto.",
      waivable: true,
      porQueNoAplica: "Se cobra por horas",
      accion: { tipo: "pestana", tab: "fases", ancla: "agregar-fase", label: d.fases.length ? "Ponerles precio" : "Agregar fases" },
    },
    {
      key: "acuerdo",
      label: "Cotización o contrato",
      ok: d.cotizaciones + d.contratos > 0,
      detalle: d.cotizaciones + d.contratos > 0 ? [d.cotizaciones ? plural(d.cotizaciones, "cotización", "cotizaciones") : "", d.contratos ? plural(d.contratos, "contrato", "contratos") : ""].filter(Boolean).join(" · ") : "Nada firmado ni cotizado.",
      waivable: true,
      porQueNoAplica: "Sin acuerdo formal",
      accion: { tipo: "pestana", tab: "dinero", ancla: "acuerdos", label: "Hacer cotización o contrato" },
    },
    {
      key: "repo",
      label: "Repo de GitHub verificado",
      ok: verificado,
      detalle: !d.repo ? "Sin repositorio conectado." : verificado ? d.repo : d.githubCheck?.error ? `${d.repo} · la última verificación falló` : `${d.repo} · sin verificar`,
      waivable: true,
      porQueNoAplica: "No lleva código",
      accion: { tipo: "pestana", tab: "repo", ancla: d.repo ? "verificar-github" : "conectar-repo", label: d.repo ? "Verificar con GitHub" : "Conectar repo" },
    },
    {
      key: "vercel",
      label: "Plataforma con Vercel",
      ok: !!conVercel,
      detalle: conVercel ? "Enlazada" : plataforma ? "La plataforma no tiene proyecto de Vercel." : "Sin plataforma registrada.",
      waivable: true,
      porQueNoAplica: "No se publica en Vercel",
      accion: plataforma ? { tipo: "enlace", href: abrirPlataforma(plataforma.id), label: "Enlazar Vercel" } : { tipo: "enlace", href: nuevaPlataforma, label: "Registrar plataforma" },
    },
    {
      key: "supabase",
      label: "Plataforma con Supabase",
      ok: !!conSupabase,
      detalle: conSupabase ? "Enlazada" : plataforma ? "La plataforma no tiene base de Supabase." : "Sin plataforma registrada.",
      waivable: true,
      porQueNoAplica: "No usa base de datos",
      accion: plataforma ? { tipo: "enlace", href: abrirPlataforma(plataforma.id), label: "Enlazar Supabase" } : { tipo: "enlace", href: nuevaPlataforma, label: "Registrar plataforma" },
    },
    {
      key: "reunion",
      label: "Al menos una reunión",
      ok: d.reuniones > 0,
      detalle: d.reuniones > 0 ? plural(d.reuniones, "reunión enlazada", "reuniones enlazadas") : "Ninguna reunión enlazada.",
      waivable: true,
      porQueNoAplica: "No hubo reuniones",
      accion: { tipo: "pestana", tab: "reuniones", label: "Enlazar o grabar reunión" },
    },
    {
      key: "portal",
      label: "Visible en la cuenta del cliente",
      ok: d.portalVisible,
      detalle: d.portalVisible ? "El cliente lo ve en su cuenta" : "Oculto: el cliente no ve su avance.",
      waivable: true,
      porQueNoAplica: "El cliente no debe verlo",
      accion: { tipo: "pestana", tab: "fases", ancla: "tipo-proyecto", label: "Mostrarlo al cliente" },
    },
    {
      key: "cobro",
      label: "Plan de cobro o factura",
      ok: d.planDeCobro || d.facturas > 0,
      detalle: d.facturas > 0 ? plural(d.facturas, "factura", "facturas") : d.planDeCobro ? "Plan de financiación definido" : "Sin facturas ni plan de cobro.",
      waivable: true,
      porQueNoAplica: "No se cobra",
      accion: { tipo: "pestana", tab: "dinero", label: "Cobrar o armar plan" },
    },
  ];

  const requisitos: Requisito[] = base.map((r) => {
    const auto = (r.key === "portal" && sinCliente) || (!!d.interno && NO_APLICAN_A_INTERNOS.includes(r.key));
    const w = waived.has(r.key) && r.waivable;
    return { ...r, waived: w, auto, accion: r.ok ? null : r.accion };
  });
  const aplican = requisitos.filter((r) => !r.waived && !r.auto);
  const cumplidos = aplican.filter((r) => r.ok).length;
  const pct = aplican.length ? Math.round((cumplidos / aplican.length) * 100) : 100;
  return { pct, cumplidos, aplican: aplican.length, requisitos, faltan: aplican.filter((r) => !r.ok) };
}

/** ¿La clave es un requisito que se puede marcar «No aplica»? (para validar lo que llega del navegador) */
export function esRequisito(k: unknown): k is RequisitoKey {
  return typeof k === "string" && (REQUISITOS as readonly string[]).includes(k);
}
