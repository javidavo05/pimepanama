// Tres direcciones distintas de footer para que Javier elija (tras rechazar tres versiones). Se revisan en
// /avance/footer. La elegida pasa a footer.tsx. Ninguna usa el wordmark gigante (descartado el 2026-10-09).
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { NumChip } from "@/components/ui/primitives";
import { Year } from "@/components/ui/year";
import { NAV, SITE, type Lang } from "../../../content/site";
import "./footer-variants.css";

const T = {
  es: { a: { t: "Índice", sub: "Todo el sitio, en orden" }, b: { t: "Hablemos hoy", num: "Llame o escriba por WhatsApp", prop: "Pedir una propuesta" }, c: { t: "Guardar contacto", sub: "Pime Panamá · ERP y CRM a medida", prop: "Pedir una propuesta", v: "Guardar en el teléfono" }, derechos: "Todos los derechos reservados", lugar: "Panamá", idioma: { href: "/en", label: "English" }, contacto: "Contacto" },
  en: { a: { t: "Index", sub: "The whole site, in order" }, b: { t: "Let's talk today", num: "Call or write on WhatsApp", prop: "Request a proposal" }, c: { t: "Save contact", sub: "Pime Panama · Custom ERP and CRM", prop: "Request a proposal", v: "Save to your phone" }, derechos: "All rights reserved", lugar: "Panama", idioma: { href: "/es", label: "Español" }, contacto: "Contact" },
};

function Legal({ lang }: { lang: Lang }) {
  const t = T[lang];
  return (
    <div className="fv-legal">
      <span>© <Year /> {SITE.nombre} · {t.derechos}</span>
      <span>{SITE.dominio} · {t.lugar}</span>
      <Link href={t.idioma.href} className="fv-lang">{t.idioma.label}</Link>
    </div>
  );
}

function Brand() {
  return (
    <span className="fv-brand"><Image src="/brand/logo_icon.png" alt="" width={16} height={20} /><span>PIME</span></span>
  );
}

/** A · Índice de documento: filas numeradas a toda la anchura, como el índice de la propuesta. */
export function FooterIndice({ lang }: { lang: Lang }) {
  const t = T[lang]; const n = NAV[lang]; const home = `/${lang}`;
  const filas = [
    ...n.secciones.map((s) => ({ href: `${home}#${s.id}`, label: s.label })),
    ...n.paginas.map((p) => ({ href: p.href, label: p.label })),
    { href: n.cta.href, label: t.contacto },
  ];
  return (
    <footer className="fv fv-a" data-motion="stagger-rows">
      <div className="wrap fv-in">
        <div className="fv-a-head"><Brand /><span className="meta">{t.a.sub}</span></div>
        <ol className="fv-a-rows">
          {filas.map((f, i) => (
            <li key={f.href}>
              <Link href={f.href} className="fv-a-row">
                <NumChip n={String(i + 1).padStart(2, "0")} />
                <span className="fv-a-label">{f.label}</span>
                <span className="fv-a-arrow" aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ol>
        <div className="fv-a-side">
          <a href={`tel:${SITE.telefonoE164}`} className="fv-tel"><span className="meta">{t.contacto}</span><b className="num">{SITE.telefono}</b></a>
          <Button href={n.cta.href} arrow>{n.cta.label}</Button>
        </div>
        <Legal lang={lang} />
      </div>
    </footer>
  );
}

/** B · Teléfono protagonista: el número en tipografía de titular y WhatsApp. Oscuro, compacto. El botón de
 *  propuesta vive solo en el cierre, justo arriba, para no repetirlo. */
export function FooterTelefono({ lang }: { lang: Lang }) {
  const t = T[lang]; const n = NAV[lang]; const home = `/${lang}`;
  const wa = `https://wa.me/${SITE.telefonoE164.replace("+", "")}`;
  return (
    <footer className="fv fv-b" data-theme="ink" data-motion="rise-magnetic">
      <div className="wrap fv-in">
        <div className="fv-b-main">
          <div className="fv-b-text">
            <span className="caps">{t.b.t}</span>
            <a href={`tel:${SITE.telefonoE164}`} className="fv-b-num num">{SITE.telefono}</a>
            <span className="meta">{t.b.num}</span>
          </div>
          <div className="fv-b-actions">
            <Button href={wa} variant="accent">WhatsApp</Button>
          </div>
        </div>
        <nav className="fv-b-nav" aria-label="Footer">
          <Brand />
          <ul>{[...n.secciones.map((s) => ({ href: `${home}#${s.id}`, label: s.label })), ...n.paginas.map((p) => ({ href: p.href, label: p.label }))].map((l) => <li key={l.href}><Link href={l.href} className="fv-link">{l.label}</Link></li>)}</ul>
        </nav>
        <Legal lang={lang} />
      </div>
    </footer>
  );
}

/** C · Tarjeta de contacto: una tarjeta de presentación real (vCard descargable) + navegación en dos columnas. */
export function FooterTarjeta({ lang }: { lang: Lang }) {
  const t = T[lang]; const n = NAV[lang]; const home = `/${lang}`;
  const vcf = `data:text/vcard;charset=utf-8,${encodeURIComponent(`BEGIN:VCARD\nVERSION:3.0\nFN:${SITE.nombre}\nORG:${SITE.nombre}\nTEL;TYPE=CELL:${SITE.telefonoE164}\nURL:https://${SITE.dominio}\nEND:VCARD`)}`;
  return (
    <footer className="fv fv-c" data-motion="tilt">
      <div className="wrap fv-in">
        <div className="fv-c-grid">
          <div className="fv-card" data-theme="ink">
            <div className="fv-card-top"><Brand /><span className="meta">{t.c.sub}</span></div>
            <a href={`tel:${SITE.telefonoE164}`} className="fv-card-num num">{SITE.telefono}</a>
            <span className="fv-card-dom">{SITE.dominio}</span>
            <div className="fv-card-actions">
              <a href={vcf} download="pime-panama.vcf" className="btn accent sm">{t.c.v}</a>
            </div>
          </div>
          <div className="fv-c-side">
            <p className="fv-c-lead">{lang === "es" ? "Guarde el contacto o pida la propuesta: la primera conversación no tiene costo." : "Save the contact or request the proposal: the first conversation is free."}</p>
            <Button href={n.cta.href} arrow>{t.c.prop}</Button>
            <nav className="fv-c-nav" aria-label="Footer">
              <ul>{[...n.secciones.map((s) => ({ href: `${home}#${s.id}`, label: s.label })), ...n.paginas.map((p) => ({ href: p.href, label: p.label }))].map((l) => <li key={l.href}><Link href={l.href} className="fv-link">{l.label}</Link></li>)}</ul>
            </nav>
          </div>
        </div>
        <Legal lang={lang} />
      </div>
    </footer>
  );
}
