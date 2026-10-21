"use client";

/**
 * De quién es este correo: el lead o cliente al que quedó ligado (y por eso sale en su comunicación).
 *
 * Si la IA vio una solicitud de cotización de alguien nuevo, aquí está la sugerencia con los datos ya puestos:
 * el lead se crea solo cuando el equipo la aprueba. También se puede ligar a un lead o cliente que ya existe,
 * o decir que no es de nadie.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/empresa/link";
import { btn } from "@/components/empresa/page-header";
import { campo, etiqueta } from "@/components/empresa/clientes/formularios";
import { botonChico } from "@/components/empresa/crm-ficha/comun";

export type VinculoCorreo = { tipo: "lead" | "cliente"; id: string; nombre: string; detalle: string | null } | null;
export type SolicitudCorreo = {
  nombre: string | null; empresa: string | null; telefono: string | null; necesidad: string; valorEstimado: number | null; prioridad: "ALTA" | "MEDIA" | "BAJA";
} | null;

type Opcion = NonNullable<VinculoCorreo>;
type Modo = "ver" | "crear" | "buscar";

const PRIORIDAD: Record<string, string> = { ALTA: "Prioridad alta", MEDIA: "Prioridad media", BAJA: "Prioridad baja" };

async function pedir(emailId: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/empresa/mail/inbox/${emailId}/vinculo`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "No se pudo guardar. Intenta de nuevo.");
  return data as { mensaje: string; vinculo: VinculoCorreo };
}

export function CorreoVinculo({
  emailId, inicial, ignorado, solicitud, remitente,
}: {
  emailId: string;
  inicial: VinculoCorreo;
  ignorado: boolean;
  solicitud: SolicitudCorreo;
  /** Contraparte del correo: quien escribió, o a quien se le escribió. */
  remitente: { nombre: string | null; email: string };
}) {
  const router = useRouter();
  const [vinculo, setVinculo] = useState<VinculoCorreo>(inicial);
  const [descartado, setDescartado] = useState(ignorado);
  const [modo, setModo] = useState<Modo>("ver");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const sugerencia = !vinculo && !descartado && solicitud;

  async function hacer(body: Record<string, unknown>) {
    setOcupado(true); setError(null); setMensaje(null);
    try {
      const r = await pedir(emailId, body);
      setVinculo(r.vinculo);
      setDescartado(body.accion === "quitar");
      setMensaje(r.mensaje);
      setModo("ver");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className={`rounded-xl border p-5 space-y-4 ${sugerencia ? "border-sand/40 bg-sand/5" : "border-line bg-panel"}`}>
      <div>
        <h3 className="text-fg-dim text-xs uppercase tracking-widest font-medium">{sugerencia ? "Posible lead" : "Lead o cliente"}</h3>
        <p className="mt-1 text-fg-faint text-xs leading-relaxed">
          {sugerencia ? "La IA cree que esto es una solicitud de cotización. Revisa los datos y apruébalo." : "El correo queda en la comunicación de quien lo ligues, con los que vengan después."}
        </p>
      </div>

      {vinculo && modo === "ver" && (
        <div className="space-y-3">
          <div className="min-w-0">
            <p className="text-fg-faint text-xs">{vinculo.tipo === "cliente" ? "Cliente" : "Lead"}</p>
            <p className="text-fg text-sm font-medium [overflow-wrap:anywhere]">{vinculo.nombre}</p>
            {vinculo.detalle && <p className="text-fg-dim text-xs [overflow-wrap:anywhere]">{vinculo.detalle}</p>}
          </div>
          <Link href={vinculo.tipo === "cliente" ? `/empresa/clientes/${vinculo.id}` : `/empresa/leads/${vinculo.id}`} className={`${btn.secondary} w-full justify-center`}>
            {vinculo.tipo === "cliente" ? "Abrir ficha del cliente" : "Abrir ficha del lead"}
          </Link>
          <div className="flex flex-wrap gap-1 -ml-3">
            <button type="button" className={botonChico} onClick={() => setModo("buscar")}>Cambiar</button>
            <button type="button" className={`${botonChico} hover:text-danger`} disabled={ocupado} onClick={() => hacer({ accion: "quitar" })}>No es de nadie</button>
          </div>
        </div>
      )}

      {sugerencia && modo === "ver" && (
        <div className="space-y-3">
          <p className="text-fg-soft text-sm leading-relaxed [overflow-wrap:anywhere]">{solicitud.necesidad}</p>
          <p className="text-fg-dim text-xs">
            {[PRIORIDAD[solicitud.prioridad], solicitud.valorEstimado ? `≈ $${solicitud.valorEstimado.toLocaleString("en-US")}` : null].filter(Boolean).join(" · ")}
          </p>
          <button type="button" className={`${btn.primary} w-full justify-center`} onClick={() => setModo("crear")}>Revisar y crear el lead</button>
          <div className="flex flex-wrap gap-1 -ml-3">
            <button type="button" className={botonChico} onClick={() => setModo("buscar")}>Ya existe: ligarlo</button>
            <button type="button" className={`${botonChico} hover:text-danger`} disabled={ocupado} onClick={() => hacer({ accion: "quitar" })}>No es un lead</button>
          </div>
        </div>
      )}

      {!vinculo && !sugerencia && modo === "ver" && (
        <div className="space-y-3">
          <p className="text-fg-dim text-sm">{descartado ? "Marcado como de nadie: no sale en ninguna ficha." : "Este correo no está ligado a nadie todavía."}</p>
          <button type="button" className={`${btn.secondary} w-full justify-center`} onClick={() => setModo("buscar")}>Ligar a un lead o cliente</button>
          <button type="button" className={`${botonChico} -ml-3`} onClick={() => setModo("crear")}>Crear lead con este remitente</button>
        </div>
      )}

      {modo === "crear" && (
        <FormLead
          inicial={{ nombre: solicitud?.nombre || remitente.nombre || "", email: remitente.email, empresa: solicitud?.empresa ?? "", telefono: solicitud?.telefono ?? "", necesidad: solicitud?.necesidad ?? "" }}
          ocupado={ocupado}
          onCancelar={() => { setModo("ver"); setError(null); }}
          onCrear={(datos) => hacer({ accion: "crear-lead", ...datos })}
        />
      )}

      {modo === "buscar" && (
        <Buscar emailId={emailId} ocupado={ocupado} onCancelar={() => { setModo("ver"); setError(null); }}
          onElegir={(o) => hacer({ accion: "ligar", ...(o.tipo === "lead" ? { leadId: o.id } : { clientId: o.id }) })} />
      )}

      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      {mensaje && !error && <p className="text-sm text-ok" role="status">{mensaje}</p>}
    </div>
  );
}

type DatosLead = { nombre: string; email: string; empresa: string; telefono: string; necesidad: string };

function FormLead({ inicial, ocupado, onCancelar, onCrear }: { inicial: DatosLead; ocupado: boolean; onCancelar: () => void; onCrear: (d: DatosLead) => void }) {
  const [d, setD] = useState(inicial);
  const set = (k: keyof DatosLead) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setD((p) => ({ ...p, [k]: e.target.value }));
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onCrear(d); }}>
      <div>
        <label htmlFor="vl-nombre" className={etiqueta}>Nombre</label>
        <input id="vl-nombre" className={campo} value={d.nombre} onChange={set("nombre")} required autoComplete="off" />
      </div>
      <div>
        <label htmlFor="vl-email" className={etiqueta}>Correo</label>
        <input id="vl-email" type="email" className={campo} value={d.email} onChange={set("email")} required autoComplete="off" />
      </div>
      <div>
        <label htmlFor="vl-empresa" className={etiqueta}>Empresa</label>
        <input id="vl-empresa" className={campo} value={d.empresa} onChange={set("empresa")} autoComplete="off" placeholder="Si la mencionó" />
      </div>
      <div>
        <label htmlFor="vl-tel" className={etiqueta}>Teléfono</label>
        <input id="vl-tel" type="tel" className={campo} value={d.telefono} onChange={set("telefono")} autoComplete="off" />
      </div>
      <div>
        <label htmlFor="vl-pide" className={etiqueta}>Qué pide</label>
        <textarea id="vl-pide" rows={3} className={`${campo} py-2`} value={d.necesidad} onChange={set("necesidad")} placeholder="Una línea: queda en la ficha del lead" />
      </div>
      <button type="submit" className={`${btn.primary} w-full justify-center`} disabled={ocupado}>{ocupado ? "Creando…" : "Crear lead y ligar el correo"}</button>
      <button type="button" className={`${botonChico} -ml-3`} onClick={onCancelar}>Cancelar</button>
    </form>
  );
}

function Buscar({ emailId, ocupado, onCancelar, onElegir }: { emailId: string; ocupado: boolean; onCancelar: () => void; onElegir: (o: Opcion) => void }) {
  const [q, setQ] = useState("");
  const [opciones, setOpciones] = useState<Opcion[]>([]);
  const [sugeridas, setSugeridas] = useState(true);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Al abrir trae las sugeridas (mismo dominio o nombre); al escribir, busca con 250 ms de pausa.
  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setCargando(true); setError(null);
      try {
        const res = await fetch(`/api/empresa/mail/inbox/${emailId}/vinculo?q=${encodeURIComponent(q.trim())}`, { signal: ctrl.signal });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "No se pudo buscar.");
        setOpciones(data.opciones ?? []); setSugeridas(!!data.sugeridas);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError(e instanceof Error ? e.message : "No se pudo buscar.");
      } finally {
        if (!ctrl.signal.aborted) setCargando(false);
      }
    }, q ? 250 : 0);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [emailId, q]);

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="vl-buscar" className={etiqueta}>Buscar lead o cliente</label>
        <input id="vl-buscar" type="search" className={campo} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre, empresa o correo" autoComplete="off" autoFocus />
      </div>
      {!q && opciones.length > 0 && sugeridas && <p className="text-fg-faint text-xs">Parecidos al remitente:</p>}
      {error ? (
        <p className="text-sm text-danger" role="alert">{error}</p>
      ) : cargando && !opciones.length ? (
        <p className="text-sm text-fg-dim">Buscando…</p>
      ) : opciones.length ? (
        <ul className="space-y-1" aria-busy={cargando}>
          {opciones.map((o) => (
            <li key={`${o.tipo}:${o.id}`}>
              <button type="button" disabled={ocupado} onClick={() => onElegir(o)}
                className="w-full min-h-11 rounded-lg border border-line px-3 py-2 text-left hover:border-brand/40 hover:bg-fill disabled:opacity-50">
                <span className="block text-fg text-sm font-medium [overflow-wrap:anywhere]">{o.nombre}</span>
                <span className="block text-fg-dim text-xs [overflow-wrap:anywhere]">{o.tipo === "cliente" ? "Cliente" : "Lead"}{o.detalle ? ` · ${o.detalle}` : ""}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-fg-dim">{q ? `Nadie coincide con «${q.trim()}». Prueba con la empresa o el correo, o crea el lead.` : "Escribe el nombre, la empresa o el correo."}</p>
      )}
      <button type="button" className={`${botonChico} -ml-3`} onClick={onCancelar}>Cancelar</button>
    </div>
  );
}
