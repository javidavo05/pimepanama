import type { Metadata } from "next";
import { LiveMannequinPanel } from "@/components/cases/live-mannequin";

export const metadata: Metadata = { title: "Maniquí en vivo · Pime v2", robots: { index: false } };

/* Revisión interna: el editor de medidas con maniquí 3D, a 1280 px máx. */
export default function Maniqui() {
  return (
    <main style={{ padding: 24, background: "#888", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <LiveMannequinPanel />
      </div>
    </main>
  );
}
