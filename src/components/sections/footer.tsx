// Footer. Dirección «protagonista» elegida por Javier el 2026-10-09 (oscuro, compacto, una sola idea grande);
// después pidió quitar todo teléfono: el sitio no publica número ni correo y cada llamada a la acción entra
// al sistema de leads del CMS por el wizard de /contacto. Dos CTA (propuesta y conversación), navegación en
// una línea y línea legal.
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Year } from "@/components/ui/year";
import { FOOTER } from "../../../content/home";
import { NAV, SITE, type Lang } from "../../../content/site";
import "./footer.css";
import { Logo } from "@/components/ui/logo";

export function Footer({ lang }: { lang: Lang }) {
  const t = FOOTER[lang];
  const n = NAV[lang];
  const home = `/${lang}`;
  const links = [...n.secciones.map((s) => ({ href: `${home}#${s.id}`, label: s.label })), ...n.paginas.map((p) => ({ href: p.href, label: p.label }))];
  return (
    <footer className="ft" data-theme="ink" data-motion="rise-magnetic">
      <div className="wrap ft-in">
        <div className="ft-main">
          <div className="ft-text">
            <span className="caps">{t.eyebrow}</span>
            <h2 className="ft-t">{t.titulo}</h2>
            <p className="ft-x">{t.texto}</p>
          </div>
          <div className="ft-actions">
            <Button href={t.cta.href} variant="accent" arrow>{t.cta.label}</Button>
            <Button href={t.cta2.href} variant="secondary">{t.cta2.label}</Button>
          </div>
        </div>
        <nav className="ft-nav" aria-label={t.nav}>
          <Link href={home} className="ft-brand tap" aria-label={SITE.nombre}><Logo height={24} /></Link>
          <ul>{links.map((l) => <li key={l.href}><Link href={l.href} className="ft-link">{l.label}</Link></li>)}</ul>
        </nav>
        <div className="ft-legal">
          <span>© <Year /> {SITE.nombre} · {t.derechos}</span>
          <span>{SITE.dominio} · {t.lugar}</span>
          <Link href={t.idioma.href} className="ft-lang" lang={lang === "es" ? "en" : "es"}>{t.idioma.label}</Link>
        </div>
      </div>
    </footer>
  );
}
