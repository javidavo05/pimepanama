"use client";
// Escenas de capacidades: cinco mini-aplicaciones funcionales, una por capacidad. Cada una llena la pantalla
// y responde a lo que la persona toca: filtros, etapas, pestañas, interruptores, botones. Sin movimiento solo.
import { useEffect, useState } from "react";
import { LetterChip, Pill } from "@/components/ui/primitives";
import { Funnel, Gantt, HBars, Ring, Stacked, Heat } from "./charts";
import type { Lang } from "../../../content/site";

type Tono = "ok" | "run" | "ghost";
const t = (lang: Lang, es: string, en: string) => (lang === "es" ? es : en);

/* ---------- 1. ERP: órdenes con filtro por área, carga, Gantt y alta de orden ---------- */
export function EscenaERP({ lang }: { lang: Lang }) {
  const areas = [t(lang, "Todas", "All"), t(lang, "Ventas", "Sales"), t(lang, "Bodega", "Warehouse"), t(lang, "Finanzas", "Finance")];
  const base = [
    { id: 1184, cliente: t(lang, "Clínica San Fernando", "San Fernando Clinic"), area: 1, estado: { t: t(lang, "En curso", "In progress"), tono: "run" as Tono }, monto: "US$ 6 400" },
    { id: 1190, cliente: t(lang, "Academia Norte", "North Academy"), area: 2, estado: { t: t(lang, "Despachada", "Shipped"), tono: "ok" as Tono }, monto: "US$ 3 950" },
    { id: 1193, cliente: t(lang, "Sastrería Rey", "Rey Tailoring"), area: 1, estado: { t: t(lang, "Programada", "Scheduled"), tono: "ghost" as Tono }, monto: "US$ 5 200" },
    { id: 1197, cliente: t(lang, "Inmobiliaria Sur", "South Realty"), area: 3, estado: { t: t(lang, "Facturada", "Invoiced"), tono: "ok" as Tono }, monto: "US$ 1 800" },
    { id: 1201, cliente: t(lang, "Unión Adventista", "Adventist Union"), area: 3, estado: { t: t(lang, "En curso", "In progress"), tono: "run" as Tono }, monto: "US$ 7 300" },
  ];
  const [area, setArea] = useState(0);
  const [ordenes, setOrdenes] = useState(base);
  const lista = ordenes.filter((o) => area === 0 || o.area === area);
  const carga = [1, 2, 3].map((a) => ({ label: areas[a], valor: ordenes.filter((o) => o.area === a).length * 14 + 10, dim: area !== 0 && area !== a }));
  const nueva = () => setOrdenes((o) => [{ id: 1200 + o.length + 2, cliente: t(lang, "Hotel Bahía", "Bahía Hotel"), area: area || 1, estado: { t: t(lang, "Programada", "Scheduled"), tono: "ghost" }, monto: "US$ 2 400" }, ...o]);
  return (
    <div className="cs cs-erp" data-motion="scene-erp">
      <div className="cs-top">
        <div className="hw-chips" role="group" aria-label={t(lang, "Área", "Area")}>
          {areas.map((a, i) => <button key={a} type="button" className="hw-chip" aria-pressed={area === i} onClick={() => setArea(i)}>{a}</button>)}
        </div>
        <button type="button" className="hw-btn cs-btn" onClick={nueva}>+ {t(lang, "Nueva orden", "New order")}</button>
      </div>
      <div className="cs-kpis">
        {[[t(lang, "Órdenes", "Orders"), String(lista.length)], [t(lang, "En curso", "In progress"), String(lista.filter((o) => o.estado.tono === "run").length)], [t(lang, "Facturado", "Invoiced"), "US$ 48 250"]].map(([k, v]) => (
          <div className="cs-kpi" key={k}><span className="hw-kpi-k">{k}</span><b className="num">{v}</b></div>
        ))}
      </div>
      <div className="hw-table cs-table">
        <div className="hw-tr hw-th"><span>#</span><span>{t(lang, "Cliente", "Client")}</span><span>{t(lang, "Área", "Area")}</span><span>{t(lang, "Estado", "Status")}</span><span>{t(lang, "Monto", "Amount")}</span></div>
        {lista.length === 0 && <div className="hw-empty">{t(lang, "Sin órdenes en esta área.", "No orders in this area.")}</div>}
        {lista.slice(0, 5).map((o, i) => (
          <div className="hw-tr" key={o.id} style={{ "--i": i } as React.CSSProperties}>
            <span className="hw-td num">{o.id}</span><span className="hw-td strong">{o.cliente}</span><span className="hw-td">{areas[o.area]}</span>
            <span className="hw-td hw-estado"><Pill variant={o.estado.tono}>{o.estado.t}</Pill></span><span className="hw-td num right">{o.monto}</span>
          </div>
        ))}
      </div>
      <div className="cs-split">
        <div className="hw-card"><span className="hw-kpi-k">{t(lang, "Carga por área", "Load by area")}</span><HBars items={carga} unidad={t(lang, "órdenes activas", "active orders")} id={`erp-h-${area}-${ordenes.length}`} /></div>
        <div className="hw-card"><span className="hw-kpi-k">{t(lang, "Entregas de la semana", "This week's deliveries")}</span><Gantt filas={lista.slice(0, 3).map((o, i) => ({ cliente: `#${o.id}`, inicio: i, fin: Math.min(i + 2, 4) }))} dias={t(lang, "L,M,X,J,V", "M,T,W,T,F").split(",")} id={`erp-g-${area}`} /></div>
      </div>
    </div>
  );
}

/* ---------- 2. CRM: embudo que filtra, contactos que avanzan de etapa, actividad ---------- */
export function EscenaCRM({ lang }: { lang: Lang }) {
  const etapasL = [t(lang, "Prospectos", "Prospects"), t(lang, "Propuesta", "Proposal"), t(lang, "Negociación", "Negotiation"), t(lang, "Cerrados", "Won")];
  const [contactos, setContactos] = useState([
    { c: "LD", n: t(lang, "Laboratorio Delta", "Delta Laboratory"), s: t(lang, "Propuesta enviada", "Proposal sent"), e: 1, monto: "US$ 9 800" },
    { c: "CH", n: t(lang, "Colegio Horizonte", "Horizonte School"), s: t(lang, "Primera llamada", "First call"), e: 0, monto: "US$ 6 200" },
    { c: "HB", n: t(lang, "Hotel Bahía", "Bahía Hotel"), s: t(lang, "Cotización en revisión", "Quote under review"), e: 2, monto: "US$ 12 400" },
    { c: "FV", n: t(lang, "Ferretería Vega", "Vega Hardware"), s: t(lang, "Interesado", "Interested"), e: 0, monto: "US$ 4 100" },
    { c: "CP", n: t(lang, "Clínica del Pacífico", "Pacific Clinic"), s: t(lang, "Contrato firmado", "Contract signed"), e: 3, monto: "US$ 15 000" },
    { c: "TM", n: t(lang, "Transportes Mar", "Mar Transport"), s: t(lang, "Pidió referencias", "Asked for references"), e: 0, monto: "US$ 7 600" },
    { c: "DL", n: t(lang, "Distribuidora Luna", "Luna Distribution"), s: t(lang, "Reunión agendada", "Meeting scheduled"), e: 1, monto: "US$ 5 300" },
  ]);
  const [etapa, setEtapa] = useState(0);
  const [log, setLog] = useState<string[]>([t(lang, "Propuesta enviada a Laboratorio Delta", "Proposal sent to Delta Laboratory")]);
  const etapas = etapasL.map((label, i) => ({ label, n: contactos.filter((x) => x.e === i).length + [18, 8, 2, 31][i] }));
  const lista = contactos.filter((x) => x.e === etapa);
  const avanzar = (n: string) => {
    setContactos((cs) => cs.map((x) => (x.n === n && x.e < 3 ? { ...x, e: x.e + 1, s: t(lang, "Avanzó a ", "Moved to ") + etapasL[x.e + 1] } : x)));
    setLog((l) => [`${n} → ${etapasL[Math.min((contactos.find((x) => x.n === n)?.e ?? 0) + 1, 3)]}`, ...l].slice(0, 4));
  };
  return (
    <div className="cs cs-crm" data-motion="scene-crm">
      <div className="cs-kpis">
        {[[t(lang, "En embudo", "In funnel"), `US$ ${contactos.filter((x) => x.e < 3).length * 8 + 32} k`], [t(lang, "Cierres del mes", "Won this month"), String(etapas[3].n)], [t(lang, "Tasa de cierre", "Close rate"), "41 %"]].map(([k, v]) => (
          <div className="cs-kpi" key={k}><span className="hw-kpi-k">{k}</span><b className="num">{v}</b></div>
        ))}
      </div>
      <div className="hw-card cs-fill"><span className="hw-kpi-k">{t(lang, "Embudo", "Funnel")}</span><Funnel etapas={etapas} activa={etapa} onPick={setEtapa} id="crm-f" />
        <span className="hw-sub">{t(lang, "Tocá una etapa para ver sus cuentas", "Tap a stage to see its accounts")}</span></div>
      <div className="cs-col">
        <div className="cs-cards">
          {lista.length === 0 && <div className="hv-col-empty">{t(lang, "Sin cuentas en esta etapa", "No accounts in this stage")}</div>}
          {lista.map((x, i) => (
            <div className="hw-card cs-contact" key={x.n} style={{ "--i": i } as React.CSSProperties}>
              <LetterChip>{x.c}</LetterChip>
              <div className="cs-contact-b"><div className="hv-card-t">{x.n}</div><div className="hw-sub">{x.s} · {x.monto}</div></div>
              {x.e < 3 ? <button type="button" className="hw-chip" onClick={() => avanzar(x.n)}>{t(lang, "Avanzar", "Advance")} →</button> : <Pill variant="ok">{t(lang, "Cliente", "Client")}</Pill>}
            </div>
          ))}
        </div>
        <div className="hw-card"><span className="hw-kpi-k">{t(lang, "Actividad", "Activity")}</span>
          <ul className="cs-log">{log.map((l, i) => <li key={`${l}-${i}`} style={{ "--i": i } as React.CSSProperties}><span className="cs-log-dot" />{l}</li>)}</ul></div>
      </div>
    </div>
  );
}

/* ---------- 3. SaaS: empresas, detalle con plan e interruptores de módulos ---------- */
export function EscenaSaaS({ lang }: { lang: Lang }) {
  const planes = [t(lang, "Básico", "Basic"), "Pro", "Suite"];
  const [tenants, setTenants] = useState([
    { c: "AN", n: t(lang, "Academia Norte", "North Academy"), plan: 1, mods: [true, true, false, false], uso: 61 },
    { c: "SF", n: t(lang, "Clínica San Fernando", "San Fernando Clinic"), plan: 2, mods: [true, true, true, true], uso: 84 },
    { c: "IC", n: t(lang, "Iglesia Central", "Central Church"), plan: 0, mods: [true, false, false, false], uso: 32 },
    { c: "IS", n: t(lang, "Inmobiliaria Sur", "South Realty"), plan: 1, mods: [true, true, true, false], uso: 48 },
    { c: "SR", n: t(lang, "Sastrería Rey", "Rey Tailoring"), plan: 2, mods: [true, true, true, true], uso: 72 },
    { c: "UA", n: t(lang, "Unión Adventista", "Adventist Union"), plan: 2, mods: [true, true, false, true], uso: 90 },
  ]);
  const [sel, setSel] = useState(1);
  const mods = [t(lang, "Operaciones", "Operations"), t(lang, "Cobros", "Billing"), t(lang, "Documentos", "Documents"), t(lang, "Reportes", "Reports")];
  const x = tenants[sel];
  const setPlan = (p: number) => setTenants((ts) => ts.map((y, i) => (i === sel ? { ...y, plan: p, uso: Math.max(20, y.uso - (p - y.plan) * 15) } : y)));
  const toggle = (m: number) => setTenants((ts) => ts.map((y, i) => (i === sel ? { ...y, mods: y.mods.map((v, j) => (j === m ? !v : v)) } : y)));
  return (
    <div className="cs cs-saas" data-motion="scene-saas">
      <div className="cs-kpis">
        {[[t(lang, "Empresas activas", "Active companies"), String(tenants.length)], [t(lang, "Ingreso mensual", "Monthly revenue"), `US$ ${tenants.reduce((a, y) => a + [120, 240, 420][y.plan], 0).toLocaleString("es-PA").replace(/[.,]/g, " ")}`], [t(lang, "Cuentas de usuario", "User accounts"), "212"]].map(([k, v]) => (
          <div className="cs-kpi" key={k}><span className="hw-kpi-k">{k}</span><b className="num">{v}</b></div>
        ))}
      </div>
      <div className="cs-tenants" role="listbox" aria-label={t(lang, "Empresas", "Companies")}>
        {tenants.map((y, i) => (
          <button type="button" role="option" aria-selected={sel === i} className="hw-card cs-tenant" key={y.n} onClick={() => setSel(i)} style={{ "--i": i } as React.CSSProperties}>
            <span className="cs-tenant-mark">{y.c}</span>
            <span className="hv-card-t">{y.n}</span>
            <span className="cs-tenant-f"><Pill variant={y.plan === 2 ? "accent" : "ghost"}>{planes[y.plan]}</Pill><span className="meta num">{y.uso} %</span></span>
          </button>
        ))}
      </div>
      <div className="hw-card cs-detail">
        <div className="cs-detail-h"><span className="cs-tenant-mark">{x.c}</span><div><div className="hv-card-t">{x.n}</div><div className="hw-sub">{t(lang, "Datos aislados · marca propia", "Isolated data · own brand")}</div></div></div>
        <span className="hw-kpi-k">{t(lang, "Plan", "Plan")}</span>
        <div className="hw-chips">{planes.map((p, i) => <button key={p} type="button" className="hw-chip" aria-pressed={x.plan === i} onClick={() => setPlan(i)}>{p}</button>)}</div>
        <div className="cs-detail-ring"><Ring valor={x.uso} meta={100} label={t(lang, "Uso del plan", "Plan usage")} id={`r-${sel}-${x.plan}`} /><span className="hw-sub">{t(lang, "del plan en uso", "of the plan in use")}</span></div>
        <span className="hw-kpi-k">{t(lang, "Módulos", "Modules")}</span>
        <ul className="cs-switches">
          {mods.map((m, j) => (
            <li key={m}><label><span>{m}</span><input type="checkbox" role="switch" checked={x.mods[j]} onChange={() => toggle(j)} /><i aria-hidden="true" /></label></li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ---------- 4. Portal: editor con páginas, bloques que se ocultan y publicación ---------- */
export function EscenaPortal({ lang }: { lang: Lang }) {
  const paginas = [t(lang, "Inicio", "Home"), t(lang, "Catálogo", "Catalog"), t(lang, "Reservas", "Bookings"), t(lang, "Contacto", "Contact")];
  const bloquesPor = [["hero", "cards", "cta"], ["hero", "grid", "cards"], ["hero", "form", "cta"], ["hero", "form"]];
  const nombres: Record<string, string> = { hero: t(lang, "Portada", "Hero"), cards: t(lang, "Tarjetas", "Cards"), cta: t(lang, "Llamado a la acción", "Call to action"), grid: t(lang, "Grilla de productos", "Product grid"), form: t(lang, "Formulario", "Form") };
  const [pag, setPag] = useState(1);
  const [ocultos, setOcultos] = useState<string[]>([]);
  const [estado, setEstado] = useState<"borrador" | "publicando" | "publicado">("borrador");
  const [periodo, setPeriodo] = useState(0);
  useEffect(() => { if (estado !== "publicando") return; const id = setTimeout(() => setEstado("publicado"), 900); return () => clearTimeout(id); }, [estado]);
  const bloques = bloquesPor[pag].filter((b) => !ocultos.includes(`${pag}-${b}`));
  const key = (b: string) => `${pag}-${b}`;
  const series = [[[8, 12, 14, 18], [5, 6, 9, 11]], [[31, 36, 42, 47], [18, 22, 26, 30]]][periodo];
  return (
    <div className="cs cs-portal" data-motion="scene-portal">
      <div className="cs-editor">
        <div className="cs-editor-side" role="tablist" aria-label={t(lang, "Páginas", "Pages")}>
          {paginas.map((p, i) => <button key={p} type="button" role="tab" aria-selected={pag === i} className="cs-page" onClick={() => { setPag(i); setEstado("borrador"); }}>{p}</button>)}
        </div>
        <div className="cs-editor-main">
          <div className="cs-editor-bar">
            <span className="hw-kpi-k">{paginas[pag]} · {estado === "publicado" ? t(lang, "publicada", "published") : estado === "publicando" ? t(lang, "publicando…", "publishing…") : t(lang, "borrador", "draft")}</span>
            <button type="button" className="hw-btn cs-btn" onClick={() => setEstado("publicando")} disabled={estado !== "borrador"}>{estado === "publicado" ? "✓ " + t(lang, "En línea", "Live") : t(lang, "Publicar", "Publish")}</button>
          </div>
          <div className="cs-blocks">
            {bloques.length === 0 && <div className="hv-col-empty">{t(lang, "Página vacía. Mostrá un bloque.", "Empty page. Show a block.")}</div>}
            {bloques.map((b) => (
              <div className={`cs-block cs-block-${b}`} key={key(b)}>
                <div className="cs-block-h"><span>{nombres[b]}</span><button type="button" className="cs-x" aria-label={t(lang, "Ocultar bloque", "Hide block")} onClick={() => { setOcultos((o) => [...o, key(b)]); setEstado("borrador"); }}>×</button></div>
                <div className="cs-block-art"><i /><b /><em /></div>
              </div>
            ))}
          </div>
          {bloquesPor[pag].some((b) => ocultos.includes(key(b))) && (
            <div className="hw-chips">{bloquesPor[pag].filter((b) => ocultos.includes(key(b))).map((b) => <button key={b} type="button" className="hw-chip" onClick={() => { setOcultos((o) => o.filter((k) => k !== key(b))); setEstado("borrador"); }}>+ {nombres[b]}</button>)}</div>
          )}
        </div>
      </div>
      <div className="hw-card">
        <div className="hw-card-head"><span className="hw-kpi-k">{t(lang, "Reservas desde el portal", "Bookings from the portal")}</span>
          <div className="hw-chips">{[t(lang, "Mes", "Month"), t(lang, "Trimestre", "Quarter")].map((p, i) => <button key={p} type="button" className="hw-chip" aria-pressed={periodo === i} onClick={() => setPeriodo(i)}>{p}</button>)}</div></div>
        <Stacked series={series} tipos={["Web", "App"]} meses={periodo ? ["S1", "S2", "S3", "S4"].map((s) => s.replace("S", "M")) : ["S1", "S2", "S3", "S4"]} id={`portal-s-${periodo}`} unidad={t(lang, "reservas", "bookings")} />
      </div>
    </div>
  );
}

/* ---------- 5. IA: mensaje de entrada, clasificación en pasos y resultado en el sistema ---------- */
export function EscenaIA({ lang }: { lang: Lang }) {
  const ejemplos = [
    { canal: "WhatsApp", texto: t(lang, "Hola, necesito mover mi cita del jueves al viernes por la tarde", "Hi, I need to move my Thursday appointment to Friday afternoon"), tipo: t(lang, "Reprogramar cita", "Reschedule appointment"), accion: t(lang, "Cita movida al viernes 15:00 · confirmación enviada", "Appointment moved to Friday 3:00 pm · confirmation sent"), respuesta: t(lang, "Listo. Tu cita quedó el viernes a las 3:00 p. m. con la Dra. Mendoza. Te llega la confirmación por WhatsApp.", "Done. Your appointment is now Friday at 3:00 pm with Dr. Mendoza. The confirmation is on its way by WhatsApp.") },
    { canal: t(lang, "Correo", "Email"), texto: t(lang, "Adjunto la factura 2026-118 pagada, favor confirmar", "Attached invoice 2026-118 paid, please confirm"), tipo: t(lang, "Pago recibido", "Payment received"), accion: t(lang, "Factura conciliada en Cobros · recibo enviado", "Invoice reconciled in Billing · receipt sent"), respuesta: t(lang, "Recibido. La factura 2026-118 quedó pagada y conciliada. Adjunto el recibo.", "Received. Invoice 2026-118 is paid and reconciled. Receipt attached.") },
    { canal: "Wasi", texto: t(lang, "Nueva propiedad publicada: apartamento en Costa del Este", "New property published: apartment in Costa del Este"), tipo: t(lang, "Alta de propiedad", "Property added"), accion: t(lang, "Ficha creada en el CMS con 12 fotos", "Listing created in the CMS with 12 photos"), respuesta: t(lang, "Ficha publicada en el sitio: Apartamento en Costa del Este, 2 recámaras, US$ 1 450/mes.", "Listing published on the site: Apartment in Costa del Este, 2 bedrooms, US$ 1,450/month.") },
  ];
  const [ej, setEj] = useState(0);
  const [paso, setPaso] = useState(-1);
  useEffect(() => { if (paso < 0 || paso >= 4) return; const id = setTimeout(() => setPaso((p) => p + 1), 650); return () => clearTimeout(id); }, [paso]);
  const pasos = [t(lang, "Mensaje recibido", "Message received"), t(lang, "Modelo de IA lee y clasifica", "AI model reads and classifies"), t(lang, "Acción en el sistema", "Action in the system"), t(lang, "Respuesta enviada", "Reply sent")];
  const e = ejemplos[ej];
  return (
    <div className="cs cs-ia" data-motion="scene-ia">
      <div className="hw-card cs-ia-in">
        <div className="hw-card-head"><span className="hw-kpi-k">{t(lang, "Mensaje de entrada", "Incoming message")}</span>
          <div className="hw-chips">{ejemplos.map((x, i) => <button key={x.canal} type="button" className="hw-chip" aria-pressed={ej === i} onClick={() => { setEj(i); setPaso(-1); }}>{x.canal}</button>)}</div></div>
        <p className="cs-msg">“{e.texto}”</p>
        <button type="button" className="hw-btn cs-btn" onClick={() => setPaso(0)} disabled={paso >= 0 && paso < 4}>{paso >= 4 ? t(lang, "Procesar de nuevo", "Process again") : t(lang, "Procesar con IA", "Process with AI")}</button>
        <ol className="cs-steps">
          {pasos.map((p, i) => <li key={p} data-estado={paso > i ? "hecho" : paso === i ? "en_curso" : "pendiente"}><span className="cs-step-n num">{paso > i ? "✓" : i + 1}</span><span>{p}</span></li>)}
        </ol>
        <div className="cs-reply" data-listo={paso >= 4 || undefined}>
          <span className="hw-kpi-k">{t(lang, "Respuesta al cliente", "Reply to the client")}</span>
          <p className="small">{paso >= 4 ? e.respuesta : t(lang, "Aparece cuando el flujo termina.", "Appears when the flow finishes.")}</p>
        </div>
      </div>
      <div className="cs-col">
        <div className="hw-card">
          <div className="hw-card-head"><span className="hw-kpi-k">{t(lang, "Cola de mensajes", "Message queue")}</span><Pill variant="run">{3 - (paso >= 4 ? 1 : 0)} {t(lang, "pendientes", "pending")}</Pill></div>
          <ul className="cs-queue">
            {ejemplos.map((x, i) => (
              <li key={x.canal}><button type="button" className="cs-queue-item" aria-pressed={ej === i} onClick={() => { setEj(i); setPaso(-1); }}><span className="hw-mini-chip">{x.canal.slice(0, 2).toUpperCase()}</span><span className="cs-queue-t">{x.texto}</span>{paso >= 4 && ej === i ? <Pill variant="ok">{t(lang, "Listo", "Done")}</Pill> : <span className="meta">{x.canal}</span>}</button></li>
            ))}
          </ul>
        </div>
        <div className="hw-card cs-result" data-listo={paso >= 4 || undefined}>
          <span className="hw-kpi-k">{t(lang, "Resultado", "Result")}</span>
          {paso >= 2 ? (<><Pill variant="accent">{e.tipo}</Pill><p className="small">{e.accion}</p></>) : (<p className="hw-sub">{t(lang, "Procesá el mensaje para ver qué hace el sistema.", "Process the message to see what the system does.")}</p>)}
        </div>
        <div className="hw-card"><span className="hw-kpi-k">{t(lang, "Mensajes procesados esta semana", "Messages processed this week")}</span>
          <Heat filas={["WhatsApp", t(lang, "Correo", "Email"), "Wasi", t(lang, "Banco", "Bank")]} cols={t(lang, "L,M,X,J,V", "M,T,W,T,F").split(",")} datos={[[12, 18, 15, 22, 27], [40, 44, 38, 51, 49], [9, 14, 11, 16, 20], [3, 5, 4, 6, 8]]} id="ia-h" unidad={t(lang, "mensajes", "messages")} /></div>
      </div>
    </div>
  );
}
