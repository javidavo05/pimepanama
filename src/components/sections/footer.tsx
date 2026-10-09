// motion: none — envoltorio: el movimiento lo declara FooterTelefono (data-motion="rise-magnetic").
// Footer definitivo: la dirección B «Teléfono protagonista», elegida por Javier el 2026-10-09 entre tres
// (ver footer-variants.tsx y /avance/footer). Oscuro y compacto: el número como titular, WhatsApp y
// propuesta, navegación en una línea y línea legal. El wordmark gigante del mandato quedó descartado.
import { FooterTelefono } from "./footer-variants";
import type { Lang } from "../../../content/site";

export function Footer({ lang }: { lang: Lang }) {
  return <FooterTelefono lang={lang} />;
}
