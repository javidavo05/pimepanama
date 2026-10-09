// Footer. Origen: el pie de documento de la propuesta (nombre, dominio, línea fina) y el wordmark "PIME" en
// Manrope 800. Es la franja final del mismo bloque oscuro del cierre: una línea fina, marca y lema a la
// izquierda, tres listas cortas a la derecha, el wordmark como marca de agua que se revela con el scroll y
// una sola línea legal. Sin soporte de scroll-timeline el wordmark entra con el revelado común.
import Image from "next/image";
import Link from "next/link";
import { Year } from "@/components/ui/year";
import { FOOTER } from "../../../content/home";
import { NAV, SITE, type Lang } from "../../../content/site";
import "./footer.css";

export function Footer({ lang }: { lang: Lang }) {
  const t = FOOTER[lang];
  const n = NAV[lang];
  const home = `/${lang}`;
  const cols = [
    { t: t.secciones, items: n.secciones.map((s) => ({ href: `${home}#${s.id}`, label: s.label })) },
    { t: t.paginas, items: [...n.paginas.map((p) => ({ href: p.href, label: p.label })), { href: n.cta.href, label: n.cta.label }] },
    { t: t.contacto, items: [{ href: `tel:${SITE.telefonoE164}`, label: SITE.telefono }, { href: `https://${SITE.dominio}`, label: SITE.dominio }, { href: t.idioma.href, label: t.idioma.label }] },
  ];
  return (
    <footer className="ft" data-theme="ink" data-motion="wordmark-reveal">
      <div className="wrap ft-in">
        <div className="ft-rule" aria-hidden="true" />
        <div className="ft-grid">
          <div className="ft-brand">
            <Link href={home} className="ft-logo tap" aria-label={SITE.nombre}>
              <Image src="/brand/logo_icon.png" alt="" width={16} height={20} />
              <span>PIME</span>
            </Link>
            <p className="ft-lema">{t.lema}</p>
          </div>
          <nav className="ft-cols" aria-label="Footer">
            {cols.map((c) => (
              <div className="ft-col" key={c.t}>
                <span className="ft-h">{c.t}</span>
                <ul>{c.items.map((i) => <li key={i.href}><Link href={i.href} className="ft-link">{i.label}</Link></li>)}</ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="ft-mark" aria-hidden="true"><span className="ft-word" data-reveal="rise">PIME</span></div>
        <div className="ft-legal">
          <span>© <Year /> {SITE.nombre} · {t.derechos}</span>
          <span>{t.gracias}</span>
          <span>{t.hecho}</span>
        </div>
      </div>
    </footer>
  );
}
