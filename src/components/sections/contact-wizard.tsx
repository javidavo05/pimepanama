"use client";
// Wizard de contacto (v2, al nivel visual del hero): a la izquierda, cuatro pasos con la opción más común ya
// marcada; a la derecha, la propuesta preliminar que se arma en vivo con cada respuesta (documento sobre
// tinta, como la portada de la propuesta real). Avance desde 25 %, botón que dice qué va a pasar, validación
// al salir del campo, precarga por URL (?tipo=&industria=&intencion=). El lead entra al CMS por /api/leads.
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Eyebrow, LetterChip, Lines } from "@/components/ui/primitives";
import { CONTACTO, CONTACTO_PREVIEW } from "../../../content/home";
import { SITE, type Lang } from "../../../content/site";
import "./contact-wizard.css";

type Estado = "editando" | "enviando" | "listo" | "error";
const CHIP: Record<string, string> = { erp: "ER", crm: "CR", saas: "SA", portal: "PO", ia: "IA", "no-se": "?" };

export function ContactWizard({ lang, industrias }: { lang: Lang; industrias: string[] }) {
  const t = CONTACTO[lang]; const pv = CONTACTO_PREVIEW[lang];
  const [paso, setPaso] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [tipo, setTipo] = useState(t.tipo.def);
  const [industria, setIndustria] = useState(t.industria.def);
  const [plazo, setPlazo] = useState(t.plazo.def);
  const [intencion, setIntencion] = useState("propuesta");
  const [d, setD] = useState({ nombre: "", empresa: "", correo: "", telefono: "", mensaje: "" });
  const [err, setErr] = useState<{ nombre?: string; correo?: string }>({});
  const [estado, setEstado] = useState<Estado>("editando");
  const panel = useRef<HTMLDivElement>(null);
  const opcionesInd = [...industrias, t.industria.otra];

  useEffect(() => {
    const u = new URL(location.href);
    const q = { tipo: u.searchParams.get("tipo"), ind: u.searchParams.get("industria"), int: u.searchParams.get("intencion") };
    const id = setTimeout(() => {
      if (q.tipo && t.tipo.opciones.some((o) => o.id === q.tipo)) setTipo(q.tipo);
      if (q.ind && opcionesInd.includes(q.ind)) setIndustria(q.ind);
      if (q.int && t.intencion[q.int]) setIntencion(q.int);
    }, 0);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ir = (n: number) => {
    setDir(n > paso ? 1 : -1); setPaso(n);
    setTimeout(() => { const h = panel.current?.querySelector<HTMLElement>("h2"); h?.focus({ preventScroll: true }); if (innerWidth < 1024) h?.scrollIntoView({ block: "start", behavior: "smooth" }); }, 50);
  };
  const valida = () => {
    const e: typeof err = {};
    if (!d.nombre.trim()) e.nombre = t.val.nombre;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.correo.trim())) e.correo = t.val.correo;
    setErr(e); return Object.keys(e).length === 0;
  };
  const tipoL = t.tipo.opciones.find((o) => o.id === tipo)?.label ?? tipo;
  const plazoL = t.plazo.opciones.find((o) => o.id === plazo)?.label ?? plazo;
  const enviar = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!valida()) return;
    setEstado("enviando");
    const message = [`${t.pasos[0]}: ${tipoL}`, `${t.pasos[1]}: ${industria}`, `${t.pasos[2]}: ${plazoL}`, t.intencion[intencion], d.mensaje.trim() ? `\n${d.mensaje.trim()}` : ""].filter(Boolean).join("\n");
    try {
      const r = await fetch("/api/leads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: d.nombre.trim(), email: d.correo.trim(), company: d.empresa.trim(), phone: d.telefono.trim(), message, locale: lang }) });
      setEstado(r.ok ? "listo" : "error");
      if (r.ok) scrollTo({ top: 0, behavior: "smooth" });
    } catch { setEstado("error"); }
  };

  const pct = ((paso + 1) / t.pasos.length) * 100;
  const listo = estado === "listo";

  /* Propuesta preliminar: documento sobre tinta que se actualiza con cada respuesta */
  const Preview = (
    <aside className="cw-doc" data-theme="ink" data-motion="morph" aria-live="polite">
      <div className="cw-doc-head">
        <span className="cw-doc-brand"><i aria-hidden="true" />PIME</span>
        <span className="caps">{pv.eyebrow}</span>
      </div>
      <div className="cw-doc-body">
        <p className="cw-doc-sub">{pv.sub}</p>
        <h3 className="cw-doc-t"><span key={tipo} className="cw-swap">{tipoL}</span></h3>
        <dl className="cw-doc-rows">
          <div className={paso === 1 ? "on" : ""}><dt>{pv.campos.industria}</dt><dd key={industria} className="cw-swap">{industria}</dd></div>
          <div className={paso === 2 ? "on" : ""}><dt>{pv.campos.plazo}</dt><dd key={plazo} className="cw-swap">{plazoL}</dd></div>
          <div><dt>{pv.campos.intencion}</dt><dd key={intencion} className="cw-swap">{t.intencion[intencion]}</dd></div>
          {d.empresa.trim() && <div className={paso === 3 ? "on" : ""}><dt>{t.datos.empresa}</dt><dd className="cw-swap">{d.empresa}</dd></div>}
        </dl>
        <div className="cw-doc-sec">
          <span className="caps">{pv.incluye}</span>
          <ul className="cw-doc-list" key={tipo}>{(pv.alcance[tipo] ?? []).map((x, i) => <li key={x} style={{ "--i": i } as React.CSSProperties}><i aria-hidden="true" />{x}</li>)}</ul>
        </div>
        <div className="cw-doc-sec">
          <span className="caps">{pv.fases}</span>
          <ol className="cw-doc-fases">{pv.faseItems.map((f, i) => <li key={f} className={i === 0 ? "on" : ""}><b>{i + 1}</b>{f}</li>)}</ol>
        </div>
      </div>
      <div className="cw-doc-foot">{pv.pie.map((x) => <span key={x}>{x}</span>)}</div>
      {listo && <span className="cw-stamp" aria-hidden="true">{pv.recibida}</span>}
    </aside>
  );

  return (
    <div className="cw" data-motion="wizard">
      <div className="cw-main">
        {listo ? (
          <div className="cw-listo" role="status">
            <span className="cw-check" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" pathLength={1} /></svg></span>
            <Lines as="h1" className="t-1" lines={[t.listo.titulo]} eager />
            <p className="lead">{t.listo.texto}</p>
            <div className="cw-fin"><Link href={`/${lang}/portfolio`} className="btn primary">{t.listo.portfolio}</Link><Link href={`/${lang}`} className="btn secondary">{t.listo.inicio}</Link></div>
          </div>
        ) : (
          <form onSubmit={enviar} noValidate className="cw-form">
            <header className="cw-head">
              <Eyebrow eager>{t.eyebrow}</Eyebrow>
              <Lines as="h1" className="t-1" lines={[t.titulo]} eager />
              <p className="lead eager-rise" style={{ "--delay": "200ms" } as React.CSSProperties}>{t.bajada}</p>
            </header>
            <div className="cw-progress eager-rise" style={{ "--delay": "300ms" } as React.CSSProperties} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={t.pasos[paso]}>
              <ol className="cw-steps">{t.pasos.map((p, i) => <li key={p} className={i < paso ? "done" : i === paso ? "on" : ""}><button type="button" onClick={() => i < paso && ir(i)} disabled={i > paso}><span className="cw-step-n">{i < paso ? "✓" : i + 1}</span><span className="cw-step-l">{p}</span></button></li>)}</ol>
              <span className="cw-bar"><i style={{ "--p": `${pct}%` } as React.CSSProperties} /></span>
            </div>
            <div className="cw-panel" ref={panel} key={paso} data-dir={dir}>
              {paso === 0 && (
                <fieldset className="cw-fs"><legend className="cw-q"><h2 className="t-2" tabIndex={-1}>{t.tipo.label}</h2></legend>
                  <div className="cw-opts">
                    {t.tipo.opciones.map((o, i) => (
                      <button type="button" key={o.id} className={`cw-opt ${tipo === o.id ? "on" : ""}`} aria-pressed={tipo === o.id} onClick={() => setTipo(o.id)} style={{ "--i": i } as React.CSSProperties}>
                        <LetterChip>{CHIP[o.id] ?? "·"}</LetterChip>
                        <span className="cw-opt-body"><span className="cw-opt-t">{o.label}</span><span className="cw-opt-d">{o.detalle}</span></span>
                        <span className="cw-opt-check" aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}
              {paso === 1 && (
                <fieldset className="cw-fs"><legend className="cw-q"><h2 className="t-2" tabIndex={-1}>{t.industria.label}</h2></legend>
                  <div className="cw-pills">
                    {opcionesInd.map((i, k) => <button type="button" key={i} className={`cw-pill ${industria === i ? "on" : ""}`} aria-pressed={industria === i} onClick={() => setIndustria(i)} style={{ "--i": k } as React.CSSProperties}>{i}</button>)}
                  </div>
                </fieldset>
              )}
              {paso === 2 && (
                <fieldset className="cw-fs"><legend className="cw-q"><h2 className="t-2" tabIndex={-1}>{t.plazo.label}</h2></legend>
                  <div className="cw-opts cw-opts-row">
                    {t.plazo.opciones.map((o, i) => <button type="button" key={o.id} className={`cw-opt cw-opt-sm ${plazo === o.id ? "on" : ""}`} aria-pressed={plazo === o.id} onClick={() => setPlazo(o.id)} style={{ "--i": i } as React.CSSProperties}><span className="cw-opt-body"><span className="cw-opt-t">{o.label}</span></span><span className="cw-opt-check" aria-hidden="true" /></button>)}
                  </div>
                </fieldset>
              )}
              {paso === 3 && (
                <fieldset className="cw-fs"><legend className="cw-q"><h2 className="t-2" tabIndex={-1}>{t.pasos[3]}</h2></legend>
                  <div className="cw-fields">
                    <label className="cw-field" style={{ "--i": 0 } as React.CSSProperties}><span>{t.datos.nombre}</span><input name="name" autoComplete="name" required value={d.nombre} onChange={(e) => setD({ ...d, nombre: e.target.value })} onBlur={() => d.nombre.trim() && setErr({ ...err, nombre: undefined })} aria-invalid={!!err.nombre} aria-describedby={err.nombre ? "e-nombre" : undefined} />{err.nombre && <em id="e-nombre" className="cw-err">{err.nombre}</em>}</label>
                    <label className="cw-field" style={{ "--i": 1 } as React.CSSProperties}><span>{t.datos.empresa}</span><input name="organization" autoComplete="organization" value={d.empresa} onChange={(e) => setD({ ...d, empresa: e.target.value })} /></label>
                    <label className="cw-field" style={{ "--i": 2 } as React.CSSProperties}><span>{t.datos.correo}</span><input name="email" type="email" inputMode="email" autoComplete="email" required value={d.correo} onChange={(e) => setD({ ...d, correo: e.target.value })} onBlur={() => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.correo.trim()) && setErr({ ...err, correo: undefined })} aria-invalid={!!err.correo} aria-describedby={err.correo ? "e-correo" : undefined} />{err.correo && <em id="e-correo" className="cw-err">{err.correo}</em>}</label>
                    <label className="cw-field" style={{ "--i": 3 } as React.CSSProperties}><span>{t.datos.telefono}</span><input name="tel" type="tel" inputMode="tel" autoComplete="tel" value={d.telefono} onChange={(e) => setD({ ...d, telefono: e.target.value })} /><small className="meta">{t.datos.telefonoAyuda}</small></label>
                    <label className="cw-field cw-field-full" style={{ "--i": 4 } as React.CSSProperties}><span>{t.datos.mensaje}</span><textarea name="message" rows={4} value={d.mensaje} onChange={(e) => setD({ ...d, mensaje: e.target.value })} /><small className="meta">{t.datos.mensajeAyuda}</small></label>
                  </div>
                  {estado === "error" && <div className="cw-error" role="alert"><b>{t.error.titulo}</b><span>{t.error.texto}</span></div>}
                </fieldset>
              )}
            </div>
            <div className="cw-nav">
              {paso > 0 ? <button type="button" className="btn secondary" onClick={() => ir(paso - 1)}>{t.botones.atras}</button> : <span className="meta cw-paso">{paso + 1} / {t.pasos.length}</span>}
              {paso < 3
                ? <button type="button" className="btn primary" onClick={() => ir(paso + 1)}>{t.botones.seguir} <span aria-hidden="true">→</span></button>
                : <button type="submit" className="btn accent" disabled={estado === "enviando"}>{estado === "enviando" ? t.botones.enviando : estado === "error" ? t.error.reintentar : t.botones.enviar}</button>}
            </div>
          </form>
        )}
      </div>
      <div className="cw-side">
        {Preview}
        <ul className="cw-trust">
          <li><b className="num">{SITE.cifras.anios}</b><span>{pv.confianza.anios}</span></li>
          <li><b className="num">{SITE.cifras.proyectos}+</b><span>{pv.confianza.proyectos}</span></li>
          <li><b className="num">{SITE.cifras.mesesGarantia}</b><span>{pv.confianza.garantia}</span></li>
        </ul>
      </div>
    </div>
  );
}
