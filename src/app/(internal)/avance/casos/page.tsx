import type { Metadata } from "next";
import CaseSvitzer from "@/components/cases/svitzer";
import CaseUapaSuite from "@/components/cases/uapa-suite";
import CaseAcademyx from "@/components/cases/academyx";
import CaseBnbRealEstate from "@/components/cases/bnb-real-estate";
import CaseSmartChurch from "@/components/cases/smart-church";
import CaseJohnHenry from "@/components/cases/john-henry";
import CaseMisaza from "@/components/cases/misaza";
import CasePimeBackup from "@/components/cases/pime-backup";
import CaseHoloRealty from "@/components/cases/holo-realty";
import CaseGeoGenius from "@/components/cases/geogenius";
import CaseGodmode from "@/components/cases/godmode";

export const metadata: Metadata = { title: "Tableros a tamaño real · Pime v2", robots: { index: false } };

/* Revisión interna: cada tablero a 1280×800, sin escalar, para compararlo con el sistema real. */
const LISTA = [["svitzer", CaseSvitzer], ["uapa-suite", CaseUapaSuite], ["academyx", CaseAcademyx], ["bnb-real-estate", CaseBnbRealEstate], ["smart-church", CaseSmartChurch], ["john-henry", CaseJohnHenry], ["misaza", CaseMisaza], ["pime-backup", CasePimeBackup], ["holo-realty", CaseHoloRealty], ["geogenius", CaseGeoGenius], ["godmode", CaseGodmode]] as const;

export default function Casos() {
  return (
    <main style={{ padding: 24, display: "grid", gap: 48, background: "#888", width: 1330 }}>
      {LISTA.map(([slug, C]) => (
        <section key={slug} id={slug} style={{ display: "grid", gap: 8 }}>
          <h2 style={{ color: "#fff", font: "600 16px var(--font-body)" }}>{slug}</h2>
          <div style={{ width: 1280, height: 800 }}><C /></div>
        </section>
      ))}
    </main>
  );
}
