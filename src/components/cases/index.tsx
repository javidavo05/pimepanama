// motion: none — imagen estática del tablero; la tarjeta que la contiene declara su movimiento.
// Los tableros son réplicas (HTML/CSS, en este directorio) del dashboard real de cada sistema con DATOS DE
// MUESTRA, capturadas a imagen con scripts/capture-cases.mjs desde /avance/casos. Las tarjetas no son funcionales.
import Image from "next/image";
import { CASES_V } from "../../../content/cases-version";
import type { Lang } from "../../../content/site";

const AVISO: Record<Lang, string> = { es: "Datos de muestra", en: "Sample data" };

const CON_TABLERO = ["svitzer", "uapa-suite", "academyx", "bnb-real-estate", "smart-church", "john-henry", "misaza", "holo-realty", "pime-backup", "geogenius", "godmode"];
export const TIENE_TABLERO = (slug: string) => CON_TABLERO.includes(slug);

/** `grande`: en la ficha y el pop-up se sirve el WebP original (2560 px, ~100 KB) sin pasar por el optimizador,
 *  que lo reescalaba a 640–750 px y lo dejaba borroso. En las tarjetas (440 px) sí se optimiza. */
export function CaseShot({ slug, label, grande, lang }: { slug: string; label: string; grande?: boolean; lang: Lang }) {
  if (!TIENE_TABLERO(slug)) return <div className="shot shot-vacio" role="img" aria-label={label}><span className="meta">{label}</span></div>;
  return (
    <div className="shot">
      <Image src={`/cases/${slug}.webp?v=${CASES_V}`} alt={label} width={2560} height={1600} unoptimized={grande} sizes={grande ? "(min-width: 1200px) 1120px, 100vw" : "(min-width: 1024px) 440px, (min-width: 640px) 50vw, 100vw"} loading={grande ? "eager" : "lazy"} style={{ width: "100%", height: "auto" }} />
      <span className="shot-aviso">{AVISO[lang]}</span>
    </div>
  );
}
