"use client";
// Wizard de contacto: proyecto → industria → plazo → datos. Cada paso trae la opción más común ya marcada
// (nunca un formulario vacío), la barra de avance arranca en 25 % y el botón dice qué va a pasar. Se puede
// precargar desde la URL (?tipo=&industria=&intencion=). El lead entra al CMS por /api/leads. Estados:
// editando, enviando, listo y error (con las respuestas intactas para reintentar).
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Eyebrow } from "@/components/ui/primitives";
import { CONTACTO } from "../../../content/home";
import type { Lang } from "../../../content/site";
import "./contact-wizard.css";

type Estado = "editando" | "enviando" | "listo" | "error";

export function ContactWizard({ lang, industrias }: { lang: Lang; industrias: string[] }) {
  const t = CONTACTO[lang];
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

  useEffect(() => { // precarga desde la URL
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
    setTimeout(() => { const h = panel.current?.querySelector<HTMLElement>("h2"); h?.focus({ preventScroll: true }); h?.scrollIntoView({ block: "center", behavior: "smooth" }); }, 50);
  };
  const valida = () => {
    const e: typeof err = {};
    if (!d.nombre.trim()) e.nombre = t.val.nombre;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.correo.trim())) e.correo = t.val.correo;
    setErr(e); return Object.keys(e).length === 0;
  };
  const enviar = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!valida()) return;
    setEstado("enviando");
    const tipoL = t.tipo.opciones.find((o) => o.id === tipo)?.label ?? tipo;
    const plazoL = t.plazo.opciones.find((o) => o.id === plazo)?.label ?? plazo;
    const message = [`${t.pasos[0]}: ${tipoL}`, `${t.pasos[1]}: ${industria}`, `${t.pasos[2]}: ${plazoL}`, t.intencion[intencion], d.mensaje.trim() ? `\n${d.mensaje.trim()}` : ""].filter(Boolean).join("\n");
    try {
      const r = await fetch("/api/leads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: d.nombre.trim(), email: d.correo.trim(), company: d.empresa.trim(), phone: d.telefono.trim(), message, locale: lang }) });
      setEstado(r.ok ? "listo" : "error");
      if (r.ok) scrollTo({ top: 0, behavior: "smooth" }); // el panel de confirmación es más corto que el formulario
    } catch { setEstado("error"); }
  };

  if (estado === "listo") {
    return (
      <div className="cw cw-listo" data-motion="wizard" role="status">
        <span className="cw-check" aria-hidden="true">✓</span>
        <h2 className="t-2">{t.listo.titulo}</h2>
        <p className="lead">{t.listo.texto}</p>
        <div className="cw-fin"><Link href={`/${lang}/portfolio`} className="btn primary">{t.listo.portfolio}</Link><Link href={`/${lang}`} className="btn secondary">{t.listo.inicio}</Link></div>
      </div>
    );
  }

  const pct = ((paso + 1) / t.pasos.length) * 100;
  return (
    <form className="cw" data-motion="wizard" onSubmit={enviar} noValidate>
      <header className="cw-head">
        <Eyebrow>{t.eyebrow}</Eyebrow>
        <h1 className="t-1">{t.titulo}</h1>
        <p className="lead">{t.bajada}</p>
      </header>
      <div className="cw-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={t.pasos[paso]}>
        <span className="cw-bar" style={{ "--p": `${pct}%` } as React.CSSProperties} />
        <ol className="cw-steps">{t.pasos.map((p, i) => <li key={p} className={i < paso ? "done" : i === paso ? "on" : ""}><button type="button" onClick={() => i < paso && ir(i)} disabled={i > paso}><span className="num">{i + 1}</span> {p}</button></li>)}</ol>
      </div>

      <div className="cw-panel" ref={panel} key={paso} data-dir={dir}>
        {paso === 0 && (
          <fieldset className="cw-fs"><legend className="cw-q" tabIndex={-1}><h2 className="t-2">{t.tipo.label}</h2></legend>
            <div className="cw-opts">
              {t.tipo.opciones.map((o) => (
                <button type="button" key={o.id} className={`cw-opt ${tipo === o.id ? "on" : ""}`} aria-pressed={tipo === o.id} onClick={() => setTipo(o.id)}>
                  <span className="cw-opt-t">{o.label}</span><span className="cw-opt-d">{o.detalle}</span>
                </button>
              ))}
            </div>
          </fieldset>
        )}
        {paso === 1 && (
          <fieldset className="cw-fs"><legend className="cw-q"><h2 className="t-2" tabIndex={-1}>{t.industria.label}</h2></legend>
            <div className="cw-pills">
              {opcionesInd.map((i) => <button type="button" key={i} className={`cw-pill ${industria === i ? "on" : ""}`} aria-pressed={industria === i} onClick={() => setIndustria(i)}>{i}</button>)}
            </div>
          </fieldset>
        )}
        {paso === 2 && (
          <fieldset className="cw-fs"><legend className="cw-q"><h2 className="t-2" tabIndex={-1}>{t.plazo.label}</h2></legend>
            <div className="cw-opts cw-opts-2">
              {t.plazo.opciones.map((o) => <button type="button" key={o.id} className={`cw-opt ${plazo === o.id ? "on" : ""}`} aria-pressed={plazo === o.id} onClick={() => setPlazo(o.id)}><span className="cw-opt-t">{o.label}</span></button>)}
            </div>
          </fieldset>
        )}
        {paso === 3 && (
          <fieldset className="cw-fs"><legend className="cw-q"><h2 className="t-2" tabIndex={-1}>{t.pasos[3]}</h2></legend>
            <div className="cw-fields">
              <label className="cw-field"><span>{t.datos.nombre}</span><input name="name" autoComplete="name" required value={d.nombre} onChange={(e) => setD({ ...d, nombre: e.target.value })} onBlur={() => d.nombre.trim() && setErr({ ...err, nombre: undefined })} aria-invalid={!!err.nombre} aria-describedby={err.nombre ? "e-nombre" : undefined} />{err.nombre && <em id="e-nombre" className="cw-err">{err.nombre}</em>}</label>
              <label className="cw-field"><span>{t.datos.empresa}</span><input name="organization" autoComplete="organization" value={d.empresa} onChange={(e) => setD({ ...d, empresa: e.target.value })} /></label>
              <label className="cw-field"><span>{t.datos.correo}</span><input name="email" type="email" inputMode="email" autoComplete="email" required value={d.correo} onChange={(e) => setD({ ...d, correo: e.target.value })} onBlur={() => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.correo.trim()) && setErr({ ...err, correo: undefined })} aria-invalid={!!err.correo} aria-describedby={err.correo ? "e-correo" : undefined} />{err.correo && <em id="e-correo" className="cw-err">{err.correo}</em>}</label>
              <label className="cw-field"><span>{t.datos.telefono}</span><input name="tel" type="tel" inputMode="tel" autoComplete="tel" value={d.telefono} onChange={(e) => setD({ ...d, telefono: e.target.value })} /><small className="meta">{t.datos.telefonoAyuda}</small></label>
              <label className="cw-field cw-field-full"><span>{t.datos.mensaje}</span><textarea name="message" rows={4} value={d.mensaje} onChange={(e) => setD({ ...d, mensaje: e.target.value })} /><small className="meta">{t.datos.mensajeAyuda}</small></label>
            </div>
            {estado === "error" && <div className="cw-error" role="alert"><b>{t.error.titulo}</b><span>{t.error.texto}</span></div>}
          </fieldset>
        )}
      </div>

      <div className="cw-nav">
        {paso > 0 ? <button type="button" className="btn secondary" onClick={() => ir(paso - 1)}>{t.botones.atras}</button> : <span />}
        {paso < 3
          ? <button type="button" className="btn primary" onClick={() => ir(paso + 1)}>{t.botones.seguir} <span aria-hidden="true">→</span></button>
          : <button type="submit" className="btn accent" disabled={estado === "enviando"}>{estado === "enviando" ? t.botones.enviando : estado === "error" ? t.error.reintentar : t.botones.enviar}</button>}
      </div>
    </form>
  );
}
