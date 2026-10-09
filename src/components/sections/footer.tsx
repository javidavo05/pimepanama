// Footer. Origen: la cabecera y el pie de documento de la propuesta (ícono + PIME, dominio, línea) y el
// wordmark "PIME" en Manrope 800. Continúa el bloque oscuro del cierre; el wordmark gigante se revela con el
// scroll (scroll-timeline: sube desde abajo de su máscara) y sin soporte entra con el revelado común.
import Image from "next/image";
import Link from "next/link";
import { TextLink } from "@/components/ui/text-link";
import { Year } from "@/components/ui/year";
import { FOOTER } from "../../../content/home";
import { NAV, SITE, type Lang } from "../../../content/site";
import "./footer.css";

export function Footer({ lang }: { lang: Lang }) {
  const t = FOOTER[lang];
  const n = NAV[lang];
  const home = `/${lang}`;
  return (
    <footer className="ft" data-theme="ink" data-motion="wordmark-reveal">
      <div className="wrap ft-in">
        <div className="ft-top">
          <Link href={home} className="ft-brand tap" aria-label={SITE.nombre}>
            <Image src="/brand/logo_icon.png" alt="" width={16} height={20} />
            <span>PIME</span>
          </Link>
          <nav className="ft-cols" aria-label="Footer">
            <div className="ft-col">
              <span className="caps">{t.secciones}</span>
              <ul>{n.secciones.map((s) => <li key={s.id}><TextLink href={`${home}#${s.id}`} className="tap">{s.label}</TextLink></li>)}</ul>
            </div>
            <div className="ft-col">
              <span className="caps">{t.paginas}</span>
              <ul>{n.paginas.map((p) => <li key={p.href}><TextLink href={p.href} className="tap">{p.label}</TextLink></li>)}<li><TextLink href={n.cta.href} className="tap">{n.cta.label}</TextLink></li></ul>
            </div>
            <div className="ft-col">
              <span className="caps">{t.contacto}</span>
              <ul>
                <li><TextLink href={`tel:${SITE.telefonoE164}`} className="tap">{t.llamar} {SITE.telefono}</TextLink></li>
                <li><TextLink href={`https://${SITE.dominio}`} className="tap">{SITE.dominio}</TextLink></li>
                <li><TextLink href={t.idioma.href} className="tap">{t.idioma.label}</TextLink></li>
              </ul>
            </div>
          </nav>
        </div>
        <div className="ft-mark" aria-hidden="true"><span className="ft-word" data-reveal="rise">PIME</span></div>
        <div className="ft-bottom">
          <span className="meta">© <Year /> {SITE.nombre}. {t.derechos}</span>
          <span className="meta">{t.hecho}</span>
        </div>
      </div>
    </footer>
  );
}
