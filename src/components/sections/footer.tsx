// Footer (v3). Javier descartó el wordmark gigante del mandato (2026-10-09): «el logo de pime es enorme, no
// llama a la acción». Ahora el footer es una llamada a la acción clara sobre papel claro, después del bloque
// oscuro del cierre: titular corto, botón de propuesta (magnético) y teléfono directo; debajo, la navegación
// en una línea, el idioma y la línea legal.
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Year } from "@/components/ui/year";
import { FOOTER } from "../../../content/home";
import { NAV, SITE, type Lang } from "../../../content/site";
import "./footer.css";

export function Footer({ lang }: { lang: Lang }) {
  const t = FOOTER[lang];
  const n = NAV[lang];
  const home = `/${lang}`;
  const links = [
    ...n.secciones.map((s) => ({ href: `${home}#${s.id}`, label: s.label })),
    ...n.paginas.map((p) => ({ href: p.href, label: p.label })),
    { href: n.cta.href, label: lang === "es" ? "Contacto" : "Contact" },
  ];
  return (
    <footer className="ft" data-motion="rise-magnetic">
      <div className="wrap ft-in">
        <div className="ft-cta" data-reveal="rise">
          <div className="ft-cta-text">
            <h2 className="ft-t">{t.titulo}</h2>
            <p className="ft-x">{t.texto}</p>
          </div>
          <div className="ft-actions">
            <Button href={t.cta.href} arrow>{t.cta.label}</Button>
            <Button href={`tel:${SITE.telefonoE164}`} variant="secondary">{t.llamar}</Button>
          </div>
        </div>
        <div className="ft-bar">
          <Link href={home} className="ft-logo tap" aria-label={SITE.nombre}>
            <Image src="/brand/logo_icon.png" alt="" width={16} height={20} />
            <span>PIME</span>
            <span className="ft-lema">{t.lema}</span>
          </Link>
          <nav aria-label={t.nav} className="ft-nav">
            <ul>{links.map((l) => <li key={l.href}><Link href={l.href} className="ft-link">{l.label}</Link></li>)}</ul>
          </nav>
          <Link href={t.idioma.href} className="ft-link ft-lang" lang={lang === "es" ? "en" : "es"}>{t.idioma.label}</Link>
        </div>
        <div className="ft-legal">
          <span>© <Year /> {SITE.nombre} · {t.derechos}</span>
          <span>{SITE.dominio} · {t.lugar}</span>
        </div>
      </div>
    </footer>
  );
}
