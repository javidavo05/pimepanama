"use client";

/**
 * Pegar credenciales en tres pasos: Pegar → Revisar (qué encontré y a qué sistema va, todo precargado) → Listo
 * (qué se guardó y la segunda verificación de fases ↔ GitHub). El texto se queda en el navegador hasta guardar:
 * el servidor nunca devuelve un token, solo su vista enmascarada.
 */
import { useMemo, useState } from "react";
import Link from "@/components/empresa/link";
import { btn } from "@/components/empresa/page-header";
import { Icon, ICON } from "@/components/empresa/tasks/task-parts";
import type { Analisis, Destino, ResultadoAplicar } from "@/lib/credenciales/vincular";
import type { CheckFase, VerificacionFases } from "@/lib/credenciales/verificar-fases";
import { Badge, CopyButton, ErrorBar, inputCls, labelCls, LOCAL_ICON, pedirJson, sectionTitle, type Tone } from "../ui";

type Modo = "proyecto" | "cotizacion" | "nuevo";
const NINGUNO = "";
const CLIENTE_NUEVO = "__nuevo__";

const TONO: Record<CheckFase["estado"], Tone> = { ok: "ok", warn: "warn", fail: "danger" };
const PROVEEDOR = { github: "GitHub", vercel: "Vercel", supabase: "Supabase" } as const;

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="bg-panel border border-line rounded-2xl p-4 sm:p-6">
      <h2 className={sectionTitle}>{titulo}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Checks({ v }: { v: VerificacionFases }) {
  return (
    <ul className="space-y-2">
      {v.checks.map((c, i) => (
        <li key={i} className="flex items-start gap-3 text-sm">
          <Icon d={c.estado === "ok" ? ICON.check : LOCAL_ICON.alert} className={`w-4 h-4 mt-1 shrink-0 ${c.estado === "ok" ? "text-ok" : c.estado === "warn" ? "text-warn" : "text-danger"}`} />
          <span className="text-fg-soft leading-relaxed min-w-0 break-words">{c.texto}</span>
        </li>
      ))}
    </ul>
  );
}

export function PegarCredenciales({ proyectoInicial, llavesClaude }: { proyectoInicial: string | null; llavesClaude: number }) {
  const [texto, setTexto] = useState("");
  const [analisis, setAnalisis] = useState<Analisis | null>(null);
  const [resultado, setResultado] = useState<ResultadoAplicar | null>(null);
  const [cargando, setCargando] = useState<null | "analizar" | "aplicar" | "reparar">(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const [modo, setModo] = useState<Modo>("proyecto");
  const [projectId, setProjectId] = useState("");
  const [quoteId, setQuoteId] = useState("");
  const [clientId, setClientId] = useState("");
  const [clienteNuevo, setClienteNuevo] = useState("");
  const [nombreNuevo, setNombreNuevo] = useState("");
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
    const pid = proyectoInicial && a.opciones.proyectos.some((p) => p.id === proyectoInicial) ? proyectoInicial : s.projectId;
    setAnalisis(a);
    setModo(pid ? "proyecto" : s.quoteId ? "cotizacion" : "nuevo");
    setProjectId(pid ?? "");
    setQuoteId(s.quoteId ?? "");
    setClientId(s.clientId ?? "");
    setNombreNuevo(s.repo?.split("/")[1] ?? a.vercel.find((v) => v.id === s.vercelProjectId)?.name ?? "");
    setRepo(s.repo ?? "");
    setVercelId(s.vercelProjectId ?? "");
    setSupabaseRef(s.supabaseRef ?? "");
  }

  const destinoNombre = useMemo(() => {
    if (!analisis) return "";
    if (modo === "proyecto") return analisis.opciones.proyectos.find((p) => p.id === projectId)?.name ?? "";
    if (modo === "cotizacion") return analisis.opciones.cotizaciones.find((c) => c.id === quoteId)?.title ?? "";
    return nombreNuevo.trim();
  }, [analisis, modo, projectId, quoteId, nombreNuevo]);

  const listo = !!destinoNombre && (modo !== "nuevo" || clientId !== CLIENTE_NUEVO || !!clienteNuevo.trim());

  async function aplicar() {
    const destino: Destino = {
      repo: repo || null,
      vercelProjectId: vercelId || null,
      supabaseRef: supabaseRef || null,
      ...(modo === "proyecto" ? { projectId } : {}),
      ...(modo === "cotizacion" ? { quoteId } : {}),
      ...(modo === "nuevo"
        ? { nuevoProyecto: { name: nombreNuevo.trim() }, ...(clientId === CLIENTE_NUEVO ? { nuevoCliente: { name: clienteNuevo.trim() } } : { clientId: clientId || null }) }
        : {}),
    };
    setCargando("aplicar");
    setError(null);
    const r = await pedirJson<ResultadoAplicar>("/api/empresa/credenciales", { method: "POST", body: JSON.stringify({ accion: "aplicar", texto, destino }) });
    setCargando(null);
    if (r.error !== undefined) return setError(r.error);
    setResultado(r.data);
    setTexto("");
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
    setResultado(null);
    setError(null);
    setAviso(null);
  }

  // ─── Paso 3: listo ──────────────────────────────────────────────────────────
  if (resultado) {
    const v = resultado.verificacion;
    const reparable = v.sinMarcador > 0 || v.checks.some((c) => c.texto.startsWith("Sin webhook"));
    return (
      <div className="mt-6 space-y-4">
        {error && <ErrorBar message={error} onClose={() => setError(null)} />}
        <Seccion titulo="Guardado">
          <ul className="space-y-2">
            {resultado.guardado.map((g, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-fg-soft">
                <Icon d={ICON.check} className="w-4 h-4 mt-1 shrink-0 text-ok" />
                <span className="min-w-0 break-words">{g}</span>
              </li>
            ))}
            {resultado.avisos.map((a, i) => (
              <li key={`a${i}`} className="flex items-start gap-3 text-sm text-fg-soft">
                <Icon d={LOCAL_ICON.alert} className="w-4 h-4 mt-1 shrink-0 text-warn" />
                <span className="min-w-0 break-words">{a}</span>
              </li>
            ))}
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

  // ─── Paso 2: revisar ────────────────────────────────────────────────────────
  if (analisis) {
    const a = analisis;
    const reposOpciones = [...new Set([...(repo ? [repo] : []), ...a.repos])];
    const quote = a.opciones.cotizaciones.find((c) => c.id === quoteId);
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
                  {c.ok && c.yaGuardada && <span className="text-xs text-fg-faint">ya estaba, se actualiza</span>}
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
          <p className="mt-4 text-xs text-fg-faint leading-relaxed">
            Las cuentas se guardan cifradas en Cuentas; las demás llaves van a la bóveda de la plataforma.
          </p>
        </Seccion>

        <Seccion titulo="A qué sistema va">
          {a.sugerencia.motivo && <p className="text-sm text-fg-dim mb-4">Propuesto: {a.sugerencia.motivo}</p>}
          <div role="radiogroup" aria-label="Destino" className="grid grid-cols-3 gap-2 mb-4">
            {(
              [
                ["proyecto", "Proyecto"],
                ["cotizacion", "Cotización"],
                ["nuevo", "Nuevo"],
              ] as [Modo, string][]
            ).map(([k, l]) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={modo === k}
                onClick={() => setModo(k)}
                className={`min-h-11 px-2 rounded-lg border text-sm transition-colors ${modo === k ? "border-brand/50 bg-brand/10 text-brand-fg font-medium" : "border-line-mid text-fg-mute hover:text-fg"}`}
              >
                {l}
              </button>
            ))}
          </div>

          {modo === "proyecto" && (
            <label className="block">
              <span className={labelCls}>Proyecto</span>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputCls}>
                <option value={NINGUNO}>Elige el proyecto…</option>
                {a.opciones.proyectos.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}{p.repo ? ` · ${p.repo}` : ""}</option>
                ))}
              </select>
              {a.opciones.proyectos.length === 0 && <span className="block mt-2 text-xs text-fg-faint">No hay proyectos activos: usa una cotización o crea uno nuevo.</span>}
            </label>
          )}

          {modo === "cotizacion" && (
            <label className="block">
              <span className={labelCls}>Cotización</span>
              <select value={quoteId} onChange={(e) => setQuoteId(e.target.value)} className={inputCls}>
                <option value={NINGUNO}>Elige la cotización…</option>
                {a.opciones.cotizaciones.map((c) => (
                  <option key={c.id} value={c.id}>{c.number ? `${c.number} · ` : ""}{c.title}</option>
                ))}
              </select>
              <span className="block mt-2 text-xs text-fg-faint">
                {quote?.projectId ? "Esta cotización ya tiene proyecto: se liga a ese." : "Se crea el proyecto con el nombre y el cliente de la cotización. Sus fases se cargan después con el asistente Nuevo proyecto."}
              </span>
            </label>
          )}

          {modo === "nuevo" && (
            <div className="space-y-4">
              <label className="block">
                <span className={labelCls}>Nombre del proyecto</span>
                <input value={nombreNuevo} onChange={(e) => setNombreNuevo(e.target.value)} className={inputCls} placeholder="Tienda en línea de Cliente" />
              </label>
              <label className="block">
                <span className={labelCls}>Cliente</span>
                <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputCls}>
                  <option value={NINGUNO}>Sin cliente por ahora</option>
                  <option value={CLIENTE_NUEVO}>+ Cliente nuevo</option>
                  {a.opciones.clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
              {clientId === CLIENTE_NUEVO && (
                <label className="block">
                  <span className={labelCls}>Nombre del cliente nuevo</span>
                  <input value={clienteNuevo} onChange={(e) => setClienteNuevo(e.target.value)} className={inputCls} placeholder="Empresa o persona" />
                </label>
              )}
            </div>
          )}
        </Seccion>

        <Seccion titulo="Dónde vive">
          <div className="space-y-4">
            <label className="block">
              <span className={labelCls}>Repositorio de GitHub</span>
              <select value={repo} onChange={(e) => setRepo(e.target.value)} className={inputCls}>
                <option value={NINGUNO}>Sin repo por ahora</option>
                {reposOpciones.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelCls}>Proyecto de Vercel</span>
              <select value={vercelId} onChange={(e) => setVercelId(e.target.value)} className={inputCls} disabled={!a.vercel.length}>
                <option value={NINGUNO}>{a.vercel.length ? "Ninguno" : "No vino un token de Vercel que funcione"}</option>
                {a.vercel.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}{p.domain ? ` · ${p.domain}` : ""}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelCls}>Proyecto de Supabase</span>
              <select value={supabaseRef} onChange={(e) => setSupabaseRef(e.target.value)} className={inputCls}>
                <option value={NINGUNO}>Ninguno</option>
                {supabaseRef && !a.supabase.some((p) => p.ref === supabaseRef) && <option value={supabaseRef}>{supabaseRef} (del texto)</option>}
                {a.supabase.map((p) => (
                  <option key={p.ref} value={p.ref}>{p.name} · {p.ref}{p.status === "INACTIVE" ? " · pausado" : ""}</option>
                ))}
              </select>
            </label>
          </div>
        </Seccion>

        <div className="flex flex-col sm:flex-row gap-3">
          <button type="button" onClick={aplicar} disabled={!listo || cargando !== null} className={btn.primary}>
            {cargando === "aplicar" ? "Guardando y verificando…" : listo ? `Guardar y ligar a «${destinoNombre.length > 40 ? `${destinoNombre.slice(0, 40)}…` : destinoNombre}»` : "Elige a qué sistema va"}
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
          Tokens de GitHub, Vercel y Supabase, la URL o la cadena de conexión de la base, llaves de Resend, Stripe u otras. Lo que no sirva se ignora.
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
        Pega las credenciales en el chat de Claude Code dentro del proyecto: la skill de preflight las deja configuradas en el repo y las carga aquí en el mismo paso. Necesita una llave de esta Mac.
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
