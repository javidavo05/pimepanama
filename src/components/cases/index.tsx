// motion: none — imagen estática del tablero; la tarjeta que la contiene declara su movimiento.
// Los tableros son réplicas (HTML/CSS, en este directorio) del dashboard real de cada sistema con DATOS DE
// MUESTRA, capturadas a imagen con scripts/capture-cases.mjs desde /avance/casos. Las tarjetas no son funcionales.
import Image from "next/image";

const CON_TABLERO = ["svitzer", "uapa-suite", "academyx", "bnb-real-estate", "smart-church", "john-henry", "misaza", "holo-realty", "pime-backup", "geogenius", "godmode"];
export const TIENE_TABLERO = (slug: string) => CON_TABLERO.includes(slug);

export function CaseShot({ slug, label }: { slug: string; label: string }) {
  if (!TIENE_TABLERO(slug)) return <div className="shot shot-vacio" role="img" aria-label={label}><span className="meta">{label}</span></div>;
  return (
    <div className="shot">
      <Image src={`/cases/${slug}.webp`} alt={label} width={2560} height={1600} sizes="(min-width: 1024px) 440px, (min-width: 640px) 50vw, 100vw" loading="lazy" style={{ width: "100%", height: "auto" }} />
    </div>
  );
}
