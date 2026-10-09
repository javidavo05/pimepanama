import { Hero } from "@/components/sections/hero";
import { Proof } from "@/components/sections/proof";
import { Capabilities } from "@/components/sections/capabilities";
import { NAV, type Lang } from "../../../../content/site";
import "./home.css";

/* La home se construye sección por sección. Las que faltan están como esqueleto para que la
   navegación tenga dónde vivir. */
export default async function Home({ params }: { params: Promise<{ lang: Lang }> }) {
  const { lang } = await params;
  const n = NAV[lang];
  const placeholders = [
    ...n.secciones.filter((s) => s.id !== "capacidades").map((s, i) => ({ id: s.id, t: `${s.label}: ${lang === "es" ? "paso" : "step"} ${7 + i}` })),
    { id: "contacto", t: lang === "es" ? "Cierre y contacto: paso 9" : "Closing and contact: step 9" },
  ];
  return (
    <main className="home-skel">
      <Hero lang={lang} />
      <Proof lang={lang} />
      <Capabilities lang={lang} />
      {placeholders.map((p) => (
        <section key={p.id} id={p.id} className="skel wrap" aria-label={p.t}>
          <span className="caps">{p.id}</span>
          <p className="t-2" style={{ color: "var(--fg-3)" }}>{p.t}</p>
        </section>
      ))}
    </main>
  );
}
