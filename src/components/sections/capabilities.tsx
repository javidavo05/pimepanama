"use client";
// Capacidades. Origen: la página "El sistema en detalle" de la propuesta (tabla de módulos con pills de fase)
// y las tarjetas de arquitectura. Sección sticky: al hacer scroll cambia la capacidad activa y la pantalla
// de la derecha se transforma (cross-fade + cambio de layout). Un solo IntersectionObserver propio.
import { useEffect, useRef, useState } from "react";
import { Eyebrow, LetterChip, Lines, Pill } from "@/components/ui/primitives";
import { Funnel, Gantt, HBars, Heat, Ring, Stacked } from "./charts";
import { CAPACIDADES } from "../../../content/home";
import type { Lang } from "../../../content/site";
import "./capabilities.css";

/* ---------- Escenas: una composición distinta por capacidad ---------- */
function EscenaERP({ lang }: { lang: Lang }) {
  const es = lang === "es";
  return (
    <div className="cs cs-erp">
      <div className="cs-kpis">
        {[[es ? "Órdenes" : "Orders", "1 284"], [es ? "Inventario" : "Inventory", "96 %"], [es ? "Cobrado" : "Collected", "US$ 48 250"]].map(([k, v]) => (
          <div className="cs-kpi" key={k}><span className="hw-kpi-k">{k}</span><b className="num">{v}</b></div>
        ))}
      </div>
      <div className="cs-split">
        <div className="hw-card"><span className="hw-kpi-k">{es ? "Carga por área" : "Load by area"}</span><HBars items={[{ label: es ? "Ventas" : "Sales", valor: 42 }, { label: es ? "Bodega" : "Warehouse", valor: 31 }, { label: es ? "Finanzas" : "Finance", valor: 24 }, { label: es ? "Soporte" : "Support", valor: 12 }]} unidad="%" id="erp-h" /></div>
        <div className="hw-card"><span className="hw-kpi-k">{es ? "Entregas de la semana" : "This week's deliveries"}</span><Gantt filas={[{ cliente: es ? "Pedido 1184" : "Order 1184", inicio: 0, fin: 2 }, { cliente: es ? "Pedido 1190" : "Order 1190", inicio: 1, fin: 3 }, { cliente: es ? "Pedido 1193" : "Order 1193", inicio: 3, fin: 4 }]} dias={es ? ["L", "M", "X", "J", "V"] : ["M", "T", "W", "T", "F"]} id="erp-g" /></div>
      </div>
    </div>
  );
}

function EscenaCRM({ lang }: { lang: Lang }) {
  const es = lang === "es";
  const [et, setEt] = useState(1);
  return (
    <div className="cs cs-crm">
      <div className="hw-card"><span className="hw-kpi-k">{es ? "Embudo" : "Funnel"}</span><Funnel etapas={[{ label: es ? "Prospectos" : "Prospects", n: 24 }, { label: es ? "Propuesta" : "Proposal", n: 11 }, { label: es ? "Negociación" : "Negotiation", n: 5 }, { label: es ? "Cerrados" : "Won", n: 3 }]} activa={et} onPick={setEt} id="crm-f" /></div>
      <div className="cs-cards">
        {[["LD", es ? "Laboratorio Delta" : "Delta Laboratory", es ? "Propuesta enviada · 2 d" : "Proposal sent · 2 d"], ["CH", es ? "Colegio Horizonte" : "Horizonte School", es ? "Llamada el jueves" : "Call on Thursday"], ["HB", es ? "Hotel Bahía" : "Bahía Hotel", es ? "Cotización en revisión" : "Quote under review"]].map(([c, n, s]) => (
          <div className="hw-card cs-contact" key={n}><LetterChip>{c}</LetterChip><div><div className="hv-card-t">{n}</div><div className="hw-sub">{s}</div></div></div>
        ))}
      </div>
    </div>
  );
}

function EscenaSaaS({ lang }: { lang: Lang }) {
  const es = lang === "es";
  const tenants = [["AX", "Academia Norte", "Pro"], ["SF", es ? "Clínica San Fernando" : "San Fernando Clinic", "Suite"], ["IC", es ? "Iglesia Central" : "Central Church", es ? "Básico" : "Basic"], ["IS", es ? "Inmobiliaria Sur" : "South Realty", "Pro"], ["SR", es ? "Sastrería Rey" : "Rey Tailoring", "Suite"], ["UA", es ? "Unión Adventista" : "Adventist Union", "Suite"]];
  return (
    <div className="cs cs-saas">
      <div className="cs-tenants">
        {tenants.map(([c, n, p], i) => (
          <div className="hw-card cs-tenant" key={n} style={{ "--i": i } as React.CSSProperties}>
            <span className="cs-tenant-mark" style={{ "--h": `${(i * 57) % 360}` } as React.CSSProperties}>{c}</span>
            <div className="hv-card-t">{n}</div>
            <div className="cs-tenant-f"><Pill variant={p === "Suite" ? "accent" : "ghost"}>{p}</Pill><span className="meta num">{es ? "datos aislados" : "isolated data"}</span></div>
          </div>
        ))}
      </div>
      <div className="hw-card cs-plan"><span className="hw-kpi-k">{es ? "Uso del plan" : "Plan usage"}</span><Ring valor={61} meta={100} label={es ? "Uso del plan" : "Plan usage"} id="saas-r" /><span className="hw-sub">{es ? "61 % de las cuentas incluidas" : "61% of included seats"}</span></div>
    </div>
  );
}

function EscenaPortal({ lang }: { lang: Lang }) {
  const es = lang === "es";
  return (
    <div className="cs cs-portal">
      <div className="cs-editor">
        <div className="cs-editor-side">
          {[es ? "Inicio" : "Home", es ? "Catálogo" : "Catalog", es ? "Reservas" : "Bookings", es ? "Contacto" : "Contact"].map((p, i) => <span key={p} className={`cs-page ${i === 1 ? "on" : ""}`}>{p}</span>)}
        </div>
        <div className="cs-editor-main">
          <div className="cs-editor-bar"><span className="hw-kpi-k">{es ? "Catálogo · editando" : "Catalog · editing"}</span><span className="hw-btn">{es ? "Publicar" : "Publish"}</span></div>
          <div className="cs-blocks">
            <div className="cs-block cs-block-hero"><i /><b /><em /></div>
            <div className="cs-block-row">{[0, 1, 2].map((k) => <div className="cs-block cs-block-card" key={k}><i /><b /></div>)}</div>
          </div>
        </div>
      </div>
      <div className="hw-card"><span className="hw-kpi-k">{es ? "Reservas por semana" : "Bookings per week"}</span><Stacked series={[[8, 12, 14, 18], [5, 6, 9, 11]]} tipos={[es ? "Web" : "Web", es ? "App" : "App"]} meses={["S1", "S2", "S3", "S4"]} id="portal-s" unidad={es ? "reservas" : "bookings"} /></div>
    </div>
  );
}

function EscenaIA({ lang }: { lang: Lang }) {
  const es = lang === "es";
  const pasos = es ? ["Correo o WhatsApp", "Modelo de IA", "Clasificación", "Sistema", "Respuesta"] : ["Email or WhatsApp", "AI model", "Classification", "System", "Reply"];
  return (
    <div className="cs cs-ia">
      <div className="hw-card cs-flow">
        <span className="hw-kpi-k">{es ? "Flujo automatizado" : "Automated flow"}</span>
        <ol className="cs-steps">
          {pasos.map((p, i) => <li key={p} style={{ "--i": i } as React.CSSProperties}><span className="cs-step-n num">{i + 1}</span><span>{p}</span></li>)}
        </ol>
      </div>
      <div className="hw-card"><span className="hw-kpi-k">{es ? "Muestras procesadas por día" : "Samples processed per day"}</span><Heat filas={es ? ["Wasi", "Workspace", "WhatsApp", "Banco"] : ["Wasi", "Workspace", "WhatsApp", "Bank"]} cols={es ? ["L", "M", "X", "J", "V"] : ["M", "T", "W", "T", "F"]} datos={[[12, 18, 15, 22, 27], [40, 44, 38, 51, 49], [9, 14, 11, 16, 20], [3, 5, 4, 6, 8]]} id="ia-h" unidad={es ? "operaciones" : "operations"} /></div>
    </div>
  );
}

const ESCENAS = [EscenaERP, EscenaCRM, EscenaSaaS, EscenaPortal, EscenaIA];

export function Capabilities({ lang }: { lang: Lang }) {
  const c = CAPACIDADES[lang];
  const [activa, setActiva] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current; if (!root) return;
    const steps = Array.from(root.querySelectorAll<HTMLElement>("[data-step]"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActiva(Number((e.target as HTMLElement).dataset.step));
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    steps.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  return (
    <section className="capsec" id="capacidades" data-motion="sticky-morph" aria-labelledby="caps-title">
      <div className="wrap caps-head">
        <Eyebrow>{c.eyebrow}</Eyebrow>
        <Lines as="h2" className="t-1" lines={c.titulo} />
        <span id="caps-title" className="sr-only">{c.titulo.join(" ")}</span>
        <p className="lead" data-reveal="rise" style={{ "--delay": "200ms" } as React.CSSProperties}>{c.bajada}</p>
      </div>
      <div className="wrap caps-grid" ref={ref}>
        <ol className="caps-steps">
          {c.items.map((it, i) => (
            <li key={it.id} className="caps-step" data-step={i} aria-current={activa === i ? "step" : undefined}>
              <button type="button" className="caps-step-btn" onClick={() => document.querySelector<HTMLElement>(`[data-step="${i}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" })}>
                <span className="caps-n num">{it.n}</span>
                <span className="caps-t">{it.titulo}</span>
              </button>
              <p className="caps-apoyo">{it.apoyo}</p>
              <div className="caps-mods">{it.modulos.map((m) => <Pill key={m} variant="ghost">{m}</Pill>)}</div>
              <div className="caps-scene-inline">
                {(() => { const E = ESCENAS[i]; return <E lang={lang} />; })()}
              </div>
            </li>
          ))}
        </ol>
        <div className="caps-sticky">
          <div className="caps-frame">
            <div className="caps-frame-bar">
              <span className="hw-logo" /><span className="caps-frame-t">{c.items[activa].titulo}</span>
              <span className="caps-dots" aria-hidden="true">{c.items.map((_, i) => <i key={i} className={i === activa ? "on" : ""} />)}</span>
            </div>
            <div className="caps-scenes">
              {ESCENAS.map((E, i) => (
                <div className="caps-scene" key={i} data-on={i === activa || undefined} aria-hidden={i !== activa} inert={i !== activa}>
                  <E lang={lang} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
