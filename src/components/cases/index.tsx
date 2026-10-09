// Tableros de los sistemas del portfolio. Cada uno es una réplica estática (1280×800) del dashboard real del
// sistema con DATOS DE MUESTRA; se escala dentro de la tarjeta. Las tarjetas no son funcionales.
import CaseSvitzer from "./svitzer";
import CaseUapaSuite from "./uapa-suite";
import CaseAcademyx from "./academyx";
import CaseBnbRealEstate from "./bnb-real-estate";
import CaseSmartChurch from "./smart-church";
import CaseJohnHenry from "./john-henry";
import { Shot } from "./shot";

const CASES: Record<string, React.ReactNode> = {
  svitzer: <CaseSvitzer />,
  "uapa-suite": <CaseUapaSuite />,
  academyx: <CaseAcademyx />,
  "bnb-real-estate": <CaseBnbRealEstate />,
  "smart-church": <CaseSmartChurch />,
  "john-henry": <CaseJohnHenry />,
};

export const TIENE_TABLERO = (slug: string) => slug in CASES;

export function CaseShot({ slug, label }: { slug: string; label: string }) {
  return <Shot label={label}>{CASES[slug]}</Shot>;
}
