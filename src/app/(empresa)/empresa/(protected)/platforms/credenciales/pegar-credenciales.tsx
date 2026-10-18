"use client";

/**
 * Pegar credenciales en cuatro pasos: Pegar → Destino (a quién va, todo precargado) → Confirmar (el plan: cliente,
 * proyecto y las fases que el cliente va a ver; nada se escribe hasta aquí) → Listo (qué se guardó, marcadores en
 * GitHub y la segunda verificación). El texto se queda en el navegador: el servidor nunca devuelve un token.
 */
import { useMemo, useState } from "react";
import Link from "@/components/empresa/link";
import { btn } from "@/components/empresa/page-header";
import { Icon, ICON } from "@/components/empresa/tasks/task-parts";
import type { Analisis, Destino, FaseNueva, Plan, ResultadoAplicar, TipoDestino } from "@/lib/credenciales/vincular";
import type { CheckFase, VerificacionFases } from "@/lib/credenciales/verificar-fases";
import { Badge, CopyButton, ErrorBar, inputCls, labelCls, LOCAL_ICON, pedirJson, sectionTitle, type Tone } from "../ui";

const NINGUNO = "";
const CLIENTE_NUEVO = "__nuevo__";
const INTERNO_NUEVO = "__nuevo__";
const TONO: Record<CheckFase["estado"], Tone> = { ok: "ok", warn: "warn", fail: "danger" };
const PROVEEDOR = { github: "GitHub", vercel: "Vercel", supabase: "Supabase" } as const;
const TIPOS: [TipoDestino, string][] = [["existente", "Existente"], ["nuevo", "Nuevo"], ["interno", "Interno"]];

type FaseForm = { nombre: string; precio: string; entregables: string };
const faseVacia = (): FaseForm => ({ nombre: "", precio: "", entregables: "" });

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="bg-panel border border-line rounded-2xl p-4 sm:p-6">
      <h2 className={sectionTitle}>{titulo}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Linea({ tono, children }: { tono: "ok" | "warn" | "danger"; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-sm text-fg-soft">
      <Icon d={tono === "ok" ? ICON.check : LOCAL_ICON.alert} className={`w-4 h-4 mt-1 shrink-0 ${tono === "ok" ? "text-ok" : tono === "warn" ? "text-warn" : "text-danger"}`} />
      <span className="min-w-0 break-words leading-relaxed">{children}</span>
    </li>
  );
}

function Checks({ v }: { v: VerificacionFases }) {
  return (
    <ul className="space-y-2">
      {v.checks.map((c, i) => (
        <Linea key={i} tono={c.estado === "fail" ? "danger" : c.estado}>{c.texto}</Linea>
      ))}
    </ul>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}

/** Fases y entregables que el cliente va a ver. Un entregable por línea, en palabras del cliente. */
function EditorFases({ fases, onChange }: { fases: FaseForm[]; onChange: (f: FaseForm[]) => void }) {
  const set = (i: number, p: Partial<FaseForm>) => onChange(fases.map((f, j) => (j === i ? { ...f, ...p } : f)));
  return (
    <div className="space-y-4">
      {fases.map((f, i) => (
        <div key={i} className="rounded-xl border border-line p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-fg">Fase {i + 1}</span>
            {fases.length > 1 && (
              <button type="button" onClick={() => onChange(fases.filter((_, j) => j !== i))} className="min-h-11 lg:min-h-8 px-2 text-xs text-fg-dim hover:text-danger">
                Quitar
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_8rem] gap-3">
            <Campo label="Nombre (lo que el cliente ve y aprueba)">
              <input value={f.nombre} onChange={(e) => set(i, { nombre: e.target.value })} className={inputCls} placeholder="Pedidos y pagos en línea" />
            </Campo>
            <Campo label="Precio (USD)">
              <input value={f.precio} onChange={(e) => set(i, { precio: e.target.value.replace(/[^\d.]/g, "") })} inputMode="decimal" className={inputCls} placeholder="0" />
            </Campo>
          </div>
          <Campo label="Entregables, uno por línea">
            <textarea value={f.entregables} onChange={(e) => set(i, { entregables: e.target.value })} rows={4} className={`${inputCls} py-3 leading-relaxed`} placeholder={"Los clientes pagan con tarjeta\nEl dueño ve los pedidos del día"} />
          </Campo>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...fases, faseVacia()])} className={btn.secondary}>
        <Icon d={ICON.plus} />
        Agregar fase
      </button>
    </div>
  );
}

export function PegarCredenciales({ proyectoInicial, llavesClaude }: { proyectoInicial: string | null; llavesClaude: number }) {
  const [texto, setTexto] = useState("");
  const [analisis, setAnalisis] = useState<Analisis | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [resultado, setResultado] = useState<ResultadoAplicar | null>(null);
  const [cargando, setCargando] = useState<null | "analizar" | "previa" | "aplicar" | "reparar">(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState(false);

  const [tipo, setTipo] = useState<TipoDestino>("existente");
  const [projectId, setProjectId] = useState("");
  const [clientId, setClientId] = useState("");
  const [clienteNuevo, setClienteNuevo] = useState("");
  const [correoNuevo, setCorreoNuevo] = useState("");
  const [esOtroCliente, setEsOtroCliente] = useState(false);
  const [quoteId, setQuoteId] = useState("");
  const [nombre, setNombre] = useState("");
  const [internoId, setInternoId] = useState(INTERNO_NUEVO);
  const [fases, setFases] = useState<FaseForm[]>([faseVacia()]);
  const [repo, setRepo] = useState("");
  const [vercelId, setVercelId] = useState("");
  const [supabaseRef, setSupabaseRef] = useState("");

  async function analizar() {
    setCargando("analizar");
    setError(null);
    const r = await pedirJson<Analisis>("/api/empresa/credenciales", { method: "POST", body: JSON.stringify({ accion: "analizar", texto }) });
    setCargando(null);
    if (r.error !== undefined) return setError(r.error);
    const a = r.data;
    const s = a.sugerencia;
    const inicial = proyectoInicial ? a.opciones.proyectos.find((p) => p.id === proyectoInicial) : undefined;
    const pid = inicial?.id ?? s.projectId;
    const t: TipoDestino = inicial ? (inicial.interno ? "interno" : "existente") : s.tipo ?? (pid ? "existente" : "nuevo");
    setAnalisis(a);
    setTipo(t);
    setProjectId(t === "existente" ? pid ?? "" : "");
    setInternoId(t === "interno" && pid ? pid : INTERNO_NUEVO);
    setClientId(s.clientId ?? "");
    setQuoteId(s.quoteId ?? "");
    const q = a.opciones.cotizaciones.find((c) => c.id === s.quoteId);
    setNombre(q?.title ?? s.repo?.split("/")[1] ?? a.vercel.find((v) => v.id === s.vercelProjectId)?.name ?? "");
    setFases(q?.lineas.length ? q.lineas.map((l) => ({ nombre: l.nombre, precio: l.precio ? String(l.precio) : "", entregables: "" })) : [faseVacia()]);
    setRepo(s.repo ?? "");
    setVercelId(s.vercelProjectId ?? "");
    setSupabaseRef(s.supabaseRef ?? "");
  }

  const proyecto = analisis?.opciones.proyectos.find((p) => p.id === projectId);
  const necesitaFases = tipo === "nuevo" || (tipo === "existente" && !!proyecto && proyecto.fases === 0) || (tipo === "interno" && internoId === INTERNO_NUEVO);

  const destino = useMemo<Destino>(() => {
    const fs: FaseNueva[] = necesitaFases
      ? fases.map((f) => ({ nombre: f.nombre, precio: f.precio ? Number(f.precio) : null, entregables: f.entregables.split("\n").map((x) => x.trim()).filter(Boolean) })).filter((f) => f.nombre.trim())
      : [];
    const base = { repo: repo || null, vercelProjectId: vercelId || null, supabaseRef: supabaseRef || null, fases: fs };
    if (tipo === "existente") return { tipo, projectId, clientId: proyecto?.clientId ? null : clientId || null, ...base };
    if (tipo === "interno") return { tipo, ...(internoId === INTERNO_NUEVO ? { nombreProyecto: nombre } : { projectId: internoId }), ...base };
    return {
      tipo,
      ...(clientId === CLIENTE_NUEVO ? { nuevoCliente: { name: clienteNuevo, email: correoNuevo || null }, forzarClienteNuevo: esOtroCliente } : { clientId: clientId || null }),
      quoteId: quoteId || null,
      nombreProyecto: nombre,
      ...base,
    };
  }, [tipo, projectId, proyecto, clientId, clienteNuevo, correoNuevo, esOtroCliente, quoteId, nombre, internoId, fases, necesitaFases, repo, vercelId, supabaseRef]);

  async function previa() {
    setCargando("previa");
    setError(null);
    setConfirmado(false);
    const r = await pedirJson<Plan>("/api/empresa/credenciales", { method: "POST", body: JSON.stringify({ accion: "previa", texto, destino }) });
    setCargando(null);
    if (r.error !== undefined) return setError(r.error);
    setPlan(r.data);
    window.scrollTo({ top: 0 });
  }

  async function aplicar() {
    if (!plan?.confirmacion) return;
    setCargando("aplicar");
    setError(null);
    const r = await pedirJson<ResultadoAplicar>("/api/empresa/credenciales", { method: "POST", body: JSON.stringify({ accion: "aplicar", texto, destino, confirmacion: plan.confirmacion }) });
    setCargando(null);
    if (r.error !== undefined) return setError(r.error);
    setResultado(r.data);
    setTexto("");
    window.scrollTo({ top: 0 });
  }

  async function reparar() {
    if (!resultado) return;
    setCargando("reparar");
    setError(null);
    setAviso(null);
    const r = await pedirJson<{ verificacion: VerificacionFases; reparado: { fases: number; tareas: number; avisos: string[] } | null }>("/api/empresa/credenciales", {
      method: "POST",
      body: JSON.stringify({ accion: "reparar", projectId: resultado.projectId }),
    });
    setCargando(null);
    if (r.error !== undefined) return setError(r.error);
    setResultado({ ...resultado, verificacion: r.data.verificacion });
    const rep = r.data.reparado;
    if (rep) setAviso([rep.fases ? `${rep.fases} fase(s) con marcador nuevo y ${rep.tareas} tarea(s) en GitHub.` : "No había fases sin marcador.", ...rep.avisos].join(" "));
  }

  function reiniciar() {
    setAnalisis(null);
    setPlan(null);
    setResultado(null);
    setError(null);
    setAviso(null);
  }

  // ─── Paso 4: listo ──────────────────────────────────────────────────────────
  if (resultado) {
    const v = resultado.verificacion;
    const reparable = v.sinMarcador > 0 || v.checks.some((c) => c.texto.startsWith("Sin webhook"));
    return (
      <div className="mt-6 space-y-4">
        {error && <ErrorBar message={error} onClose={() => setError(null)} />}
        <Seccion titulo="Guardado">
          <ul className="space-y-2">
            {resultado.guardado.map((g, i) => <Linea key={i} tono="ok">{g}</Linea>)}
            {resultado.avisos.map((a, i) => <Linea key={`a${i}`} tono="warn">{a}</Linea>)}
          </ul>
        </Seccion>
        <Seccion titulo="Fases en GitHub — segunda verificación">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Badge tone={TONO[v.estado]}>{v.estado === "ok" ? "Todo cuadra" : v.estado === "warn" ? "Revisar" : "Falta algo"}</Badge>
            <span className="text-sm text-fg-dim">
              {v.fases} fase{v.fases === 1 ? "" : "s"} en Pime · {v.conMarcador} con marcador{v.repo ? ` · ${v.repo}` : ""}
            </span>
          </div>
          <Checks v={v} />
          {aviso && <p role="status" className="mt-4 text-sm text-fg-dim">{aviso}</p>}
          {reparable && v.repo && (
            <button type="button" onClick={reparar} disabled={cargando !== null} className={`${btn.secondary} mt-4`}>
              {cargando === "reparar" ? "Creando en GitHub…" : "Crear los marcadores que faltan"}
            </button>
          )}
        </Seccion>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href={`/empresa/proyectos/${resultado.projectId}`} className={btn.primary}>
            Abrir «{resultado.projectName}»
          </Link>
          <button type="button" onClick={reiniciar} className={btn.secondary}>
            Pegar otras credenciales
          </button>
        </div>
      </div>
    );
  }

  // ─── Paso 3: confirmar ──────────────────────────────────────────────────────
  if (plan) {
    const destinoNombre = plan.cliente?.nombre ?? "Pime (interno)";
    const corto = destinoNombre.length > 32 ? `${destinoNombre.slice(0, 32)}…` : destinoNombre;
    return (
      <div className="mt-6 space-y-4">
        {error && <ErrorBar message={error} onClose={() => setError(null)} />}
        <section className="bg-panel border border-line rounded-2xl p-4 sm:p-6">
          <h2 className={sectionTitle}>Se sube a</h2>
          <p className="mt-2 text-xl font-semibold text-fg break-words">{destinoNombre}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {plan.cliente && <Badge tone={plan.cliente.nuevo ? "brand" : "mute"}>{plan.cliente.nuevo ? "Cliente nuevo" : "Cliente existente"}</Badge>}
            {!plan.cliente && <Badge tone="mute">Sin portal de cliente</Badge>}
            {plan.cliente?.correo && <span className="text-sm text-fg-dim break-all">{plan.cliente.correo}</span>}
          </div>
          <p className="mt-4 text-sm text-fg-soft">
            Proyecto <span className="font-medium text-fg">«{plan.proyecto.nombre}»</span> · {plan.proyecto.nuevo ? "se crea" : "ya existe"}
            {plan.proyecto.cotizacion && <> · desde la cotización «{plan.proyecto.cotizacion.titulo}»</>}
          </p>
        </section>

        {(plan.bloqueantes.length > 0 || plan.avisos.length > 0) && (
          <Seccion titulo={plan.bloqueantes.length ? "Antes de subir" : "Avisos"}>
            <ul className="space-y-2">
              {plan.bloqueantes.map((b, i) => <Linea key={i} tono="danger">{b}</Linea>)}
              {plan.avisos.map((a, i) => <Linea key={`a${i}`} tono="warn">{a}</Linea>)}
            </ul>
          </Seccion>
        )}

        <Seccion titulo={plan.visibleCliente ? "Lo que el cliente va a ver en su cuenta" : "Fases"}>
          {plan.fases.length === 0 ? (
            <p className="text-sm text-fg-dim">Sin fases.</p>
          ) : (
            <ol className="space-y-3">
              {plan.fases.map((f, i) => (
                <li key={i} className="text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-fg">Fase {i + 1} · {f.nombre}</span>
                    <Badge tone={f.marcador === "existe" ? "ok" : f.marcador === "se_crea" ? "brand" : "mute"}>
                      {f.marcador === "existe" ? "Ya en GitHub" : f.marcador === "se_crea" ? "Se crea en GitHub" : "Sin marcador"}
                    </Badge>
                  </div>
                  {f.entregables.length > 0 && (
                    <ul className="mt-1 ml-4 list-disc text-fg-dim space-y-1">
                      {f.entregables.slice(0, 6).map((e, j) => <li key={j} className="break-words">{e}</li>)}
                      {f.entregables.length > 6 && <li>y {f.entregables.length - 6} más</li>}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          )}
          {plan.github.marcadoresNuevos > 0 && (
            <p className="mt-4 text-xs text-fg-faint leading-relaxed">
              Se crean {plan.github.marcadoresNuevos} marcador{plan.github.marcadoresNuevos === 1 ? "" : "es"} y {plan.github.tareasNuevas} tarea{plan.github.tareasNuevas === 1 ? "" : "s"} en {plan.repo?.nombre}
              {plan.github.webhook === "se_crea" ? ", con el webhook para que el avance se mueva al instante." : "."}
            </p>
          )}
        </Seccion>

        <Seccion titulo="Dónde vive y qué se guarda">
          <ul className="space-y-2 text-sm text-fg-soft">
            <li className="break-words">Repo: {plan.repo ? `${plan.repo.nombre} · lo lee ${plan.repo.cuenta ?? "—"}` : "sin repo"}</li>
            <li className="break-words">Vercel: {plan.vercel ? `${plan.vercel.nombre}${plan.vercel.dominio ? ` · ${plan.vercel.dominio}` : ""}` : "—"}</li>
            <li className="break-words">Supabase: {plan.supabase ? plan.supabase.nombre : "—"}</li>
            <li className="break-words">
              Cuentas: {plan.cuentas.filter((c) => c.ok).map((c) => `${PROVEEDOR[c.proveedor]} ${c.cuenta ?? ""}`.trim()).join(", ") || "ninguna"}
              {plan.boveda > 0 && ` · ${plan.boveda} llave${plan.boveda === 1 ? "" : "s"} a la bóveda`}
            </li>
          </ul>
        </Seccion>

        {plan.confirmacion && (
          <label className="flex items-start gap-3 rounded-xl border border-line bg-panel p-4 cursor-pointer">
            <input type="checkbox" checked={confirmado} onChange={(e) => setConfirmado(e.target.checked)} className="mt-1 w-5 h-5 shrink-0 accent-brand" />
            <span className="text-sm text-fg-soft">
              Confirmo que este sistema es de <span className="font-medium text-fg">{destinoNombre}</span>
              {plan.visibleCliente ? " y que puede ver estas fases en su cuenta." : "."}
            </span>
          </label>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button type="button" onClick={aplicar} disabled={!plan.confirmacion || !confirmado || cargando !== null} className={btn.primary}>
            {cargando === "aplicar" ? "Subiendo y creando en GitHub…" : plan.confirmacion ? `Subir a ${corto}` : "Resuelve lo de arriba"}
          </button>
          <button type="button" onClick={() => setPlan(null)} disabled={cargando !== null} className={btn.secondary}>
            Cambiar destino
          </button>
        </div>
      </div>
    );
  }

  // ─── Paso 2: destino ────────────────────────────────────────────────────────
  if (analisis) {
    const a = analisis;
    const reposOpciones = [...new Set([...(repo ? [repo] : []), ...a.repos])];
    const deClientes = a.opciones.proyectos.filter((p) => !p.interno);
    const internos = a.opciones.proyectos.filter((p) => p.interno);
    const cotizaciones = a.opciones.cotizaciones.filter((c) => !c.projectId && (!clientId || clientId === CLIENTE_NUEVO ? true : c.clientId === clientId));
    const elegirCotizacion = (id: string) => {
      setQuoteId(id);
      const q = a.opciones.cotizaciones.find((c) => c.id === id);
      if (!q) return;
      if (q.clientId) setClientId(q.clientId);
      setNombre(q.title);
      if (q.lineas.length) setFases(q.lineas.map((l) => ({ nombre: l.nombre, precio: l.precio ? String(l.precio) : "", entregables: "" })));
    };
    return (
      <div className="mt-6 space-y-4">
        {error && <ErrorBar message={error} onClose={() => setError(null)} />}

        <Seccion titulo={`Lo que encontré (${a.hallazgos.length})`}>
          {a.cuentas.length > 0 && (
            <ul className="space-y-3 mb-4">
              {a.cuentas.map((c, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium text-fg">{PROVEEDOR[c.proveedor]}</span>
                  <code className="text-xs text-fg-faint">{c.vista}</code>
                  {c.ok ? (
                    <Badge tone="ok">{`Funciona · ${c.cuenta ?? "cuenta"}${c.proyectos != null ? ` · ${c.proyectos} ${c.proveedor === "github" ? "repos" : "proyectos"}` : ""}`}</Badge>
                  ) : (
                    <Badge tone="danger">No funciona</Badge>
                  )}
                  {!c.ok && c.error && <span className="w-full text-xs text-danger">{c.error}</span>}
                </li>
              ))}
            </ul>
          )}
          <ul className="divide-y divide-line">
            {a.hallazgos.filter((h) => !["github_token", "vercel_token", "supabase_token"].includes(h.tipo)).map((h, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="text-fg-soft">
                  {h.nombre}
                  {h.clave && <span className="text-fg-faint"> · {h.clave}</span>}
                </span>
                <code className="text-xs text-fg-faint break-all">{h.vista}</code>
              </li>
            ))}
          </ul>
        </Seccion>

        <Seccion titulo="A quién va">
          {a.sugerencia.motivo && (
            <p className={`text-sm mb-4 ${a.sugerencia.fuerte ? "text-fg-dim" : "text-warn"}`}>Propuesto: {a.sugerencia.motivo}</p>
          )}
          <div role="radiogroup" aria-label="Tipo de proyecto" className="grid grid-cols-3 gap-2 mb-4">
            {TIPOS.map(([k, l]) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={tipo === k}
                onClick={() => setTipo(k)}
                className={`min-h-11 px-2 rounded-lg border text-sm transition-colors ${tipo === k ? "border-brand/50 bg-brand/10 text-brand-fg font-medium" : "border-line-mid text-fg-mute hover:text-fg"}`}
              >
                {l}
              </button>
            ))}
          </div>

          {tipo === "existente" && (
            <div className="space-y-4">
              <Campo label="Proyecto del cliente">
                <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputCls}>
                  <option value={NINGUNO}>Elige el proyecto…</option>
                  {deClientes.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} · {p.cliente ?? "sin cliente"}</option>
                  ))}
                </select>
              </Campo>
              {proyecto && (
                <p className="text-sm text-fg-dim">
                  Cliente: <span className="font-medium text-fg">{proyecto.cliente ?? "sin cliente"}</span> · {proyecto.fases} fase{proyecto.fases === 1 ? "" : "s"} en Pime
                  {proyecto.repo ? ` · ${proyecto.repo}` : ""}
                </p>
              )}
              {proyecto && !proyecto.clientId && (
                <Campo label="¿De qué cliente es?">
                  <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputCls}>
                    <option value={NINGUNO}>Elige el cliente…</option>
                    {a.opciones.clientes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Campo>
              )}
              {deClientes.length === 0 && <p className="text-xs text-fg-faint">No hay proyectos de clientes activos: usa «Nuevo».</p>}
            </div>
          )}

          {tipo === "nuevo" && (
            <div className="space-y-4">
              <Campo label="Cliente">
                <select value={clientId} onChange={(e) => { setClientId(e.target.value); setQuoteId(""); }} className={inputCls}>
                  <option value={NINGUNO}>Elige el cliente…</option>
                  <option value={CLIENTE_NUEVO}>+ Cliente nuevo</option>
                  {a.opciones.clientes.map((c) => <option key={c.id} value={c.id}>{c.name}{c.email ? ` · ${c.email}` : ""}</option>)}
                </select>
              </Campo>
              {clientId === CLIENTE_NUEVO && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Campo label="Nombre del cliente">
                    <input value={clienteNuevo} onChange={(e) => setClienteNuevo(e.target.value)} className={inputCls} placeholder="Empresa o persona" />
                  </Campo>
                  <Campo label="Correo (opcional)">
                    <input value={correoNuevo} onChange={(e) => setCorreoNuevo(e.target.value)} type="email" inputMode="email" className={inputCls} placeholder="contacto@cliente.com" />
                  </Campo>
                  <label className="sm:col-span-2 flex items-center gap-3 text-sm text-fg-dim min-h-11">
                    <input type="checkbox" checked={esOtroCliente} onChange={(e) => setEsOtroCliente(e.target.checked)} className="w-5 h-5 accent-brand" />
                    Es un cliente distinto aunque se llame parecido a otro
                  </label>
                </div>
              )}
              <Campo label="Cotización (opcional)">
                <select value={quoteId} onChange={(e) => elegirCotizacion(e.target.value)} className={inputCls}>
                  <option value={NINGUNO}>Sin cotización</option>
                  {cotizaciones.map((c) => <option key={c.id} value={c.id}>{c.number ? `${c.number} · ` : ""}{c.title}{c.cliente ? ` · ${c.cliente}` : ""}</option>)}
                </select>
              </Campo>
              <Campo label="Nombre del proyecto">
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} placeholder="Tienda en línea" />
              </Campo>
            </div>
          )}

          {tipo === "interno" && (
            <div className="space-y-4">
              <p className="text-sm text-fg-dim">Producto de Pime: sin cliente y sin portal. Las fases son opcionales.</p>
              <Campo label="Proyecto interno">
                <select value={internoId} onChange={(e) => setInternoId(e.target.value)} className={inputCls}>
                  <option value={INTERNO_NUEVO}>+ Proyecto interno nuevo</option>
                  {internos.map((p) => <option key={p.id} value={p.id}>{p.name}{p.repo ? ` · ${p.repo}` : ""}</option>)}
                </select>
              </Campo>
              {internoId === INTERNO_NUEVO && (
                <Campo label="Nombre del proyecto">
                  <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} placeholder="Pime Guard" />
                </Campo>
              )}
            </div>
          )}
        </Seccion>

        {necesitaFases && (
          <Seccion titulo={tipo === "interno" ? "Fases (opcional)" : "Fases que el cliente va a ver"}>
            <p className="text-sm text-fg-dim mb-4 leading-relaxed">
              {tipo === "interno"
                ? "Si las cargas, cada una tendrá su marcador en GitHub."
                : "Cada fase es algo que el cliente ve y aprueba; cada entregable, lo que lee cuando se cierra su tarea. Se crean en Pime y en GitHub en el mismo paso."}
            </p>
            <EditorFases fases={fases} onChange={setFases} />
          </Seccion>
        )}

        <Seccion titulo="Dónde vive">
          <div className="space-y-4">
            <Campo label="Repositorio de GitHub">
              <select value={repo} onChange={(e) => setRepo(e.target.value)} className={inputCls}>
                <option value={NINGUNO}>Sin repo por ahora</option>
                {reposOpciones.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Campo>
            <Campo label="Proyecto de Vercel">
              <select value={vercelId} onChange={(e) => setVercelId(e.target.value)} className={inputCls} disabled={!a.vercel.length}>
                <option value={NINGUNO}>{a.vercel.length ? "Ninguno" : "No vino un token de Vercel que funcione"}</option>
                {a.vercel.map((p) => <option key={p.id} value={p.id}>{p.name}{p.domain ? ` · ${p.domain}` : ""}</option>)}
              </select>
            </Campo>
            <Campo label="Proyecto de Supabase">
              <select value={supabaseRef} onChange={(e) => setSupabaseRef(e.target.value)} className={inputCls}>
                <option value={NINGUNO}>Ninguno</option>
                {supabaseRef && !a.supabase.some((p) => p.ref === supabaseRef) && <option value={supabaseRef}>{supabaseRef} (del texto)</option>}
                {a.supabase.map((p) => <option key={p.ref} value={p.ref}>{p.name} · {p.ref}{p.status === "INACTIVE" ? " · pausado" : ""}</option>)}
              </select>
            </Campo>
          </div>
        </Seccion>

        <div className="flex flex-col sm:flex-row gap-3">
          <button type="button" onClick={previa} disabled={cargando !== null} className={btn.primary}>
            {cargando === "previa" ? "Revisando…" : "Revisar antes de subir"}
          </button>
          <button type="button" onClick={reiniciar} disabled={cargando !== null} className={btn.secondary}>
            Volver a pegar
          </button>
        </div>
      </div>
    );
  }

  // ─── Paso 1: pegar ──────────────────────────────────────────────────────────
  return (
    <div className="mt-6 space-y-4">
      {error && <ErrorBar message={error} onClose={() => setError(null)} />}
      <section className="bg-panel border border-line rounded-2xl p-4 sm:p-6">
        <label htmlFor="credenciales" className="block text-sm font-medium text-fg">
          Credenciales del sistema
        </label>
        <p className="text-xs text-fg-dim mt-1 leading-relaxed">
          Tokens de GitHub, Vercel y Supabase, la URL o la cadena de conexión de la base, llaves de Resend, Stripe u otras. Nada se guarda hasta que confirmes a quién va.
        </p>
        <textarea
          id="credenciales"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={10}
          spellCheck={false}
          autoComplete="off"
          placeholder={"GITHUB_TOKEN=ghp_…\nVERCEL_TOKEN=…\nSUPABASE_ACCESS_TOKEN=sbp_…\nhttps://github.com/cliente/sistema"}
          className={`${inputCls} mt-4 py-3 leading-relaxed min-h-48`}
        />
        <button type="button" onClick={analizar} disabled={!texto.trim() || cargando !== null} className={`${btn.primary} mt-4 w-full sm:w-auto`}>
          {cargando === "analizar" ? "Probando cada token…" : "Revisar credenciales"}
        </button>
      </section>
      <LlaveClaude llaves={llavesClaude} />
    </div>
  );
}

/** Llave pmg_ para que la skill pime-project-preflight cargue credenciales desde Claude Code. Se muestra una vez. */
function LlaveClaude({ llaves }: { llaves: number }) {
  const [llave, setLlave] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function crear() {
    setCargando(true);
    setError(null);
    const r = await pedirJson<{ token: string }>("/api/empresa/devices", { method: "POST", body: JSON.stringify({ name: "Claude Code · preflight" }) });
    setCargando(false);
    if (r.error !== undefined) return setError(r.error);
    setLlave(r.data.token);
  }

  const comando = llave ? `node ~/.claude/skills/pime-project-preflight/scripts/cargar-credenciales.mjs --guardar-llave ${llave}` : "";
  return (
    <section className="bg-panel border border-line rounded-2xl p-4 sm:p-6">
      <h2 className="text-sm font-semibold text-fg">Desde Claude Code</h2>
      <p className="text-xs text-fg-dim mt-1 leading-relaxed">
        Pega las credenciales en el chat de Claude Code dentro del proyecto: la skill de preflight configura el repo, te muestra a quién va y lo sube aquí cuando confirmas. Necesita una llave de esta Mac.
        {llaves > 0 && ` Ya hay ${llaves} llave${llaves === 1 ? "" : "s"} de Claude Code; se desvinculan en Configuración → Mac.`}
      </p>
      {llave ? (
        <div className="mt-4">
          <p className="text-xs text-fg-dim mb-2">Corre esto una vez en la Terminal. La llave no se vuelve a mostrar.</p>
          <div className="flex items-start gap-2 rounded-lg border border-line bg-fill p-3">
            <code className="flex-1 min-w-0 text-xs text-fg-soft break-all">{comando}</code>
            <CopyButton value={comando} label="comando" />
          </div>
        </div>
      ) : (
        <button type="button" onClick={crear} disabled={cargando} className={`${btn.secondary} mt-4 w-full sm:w-auto`}>
          {cargando ? "Creando la llave…" : "Crear llave para Claude Code"}
        </button>
      )}
      {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
    </section>
  );
}
