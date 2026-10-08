import { NAV, type Lang } from "../../../../content/site";
import "./home.css";

/* Paso 3: la home solo tiene el esqueleto de secciones para que la navegación tenga dónde vivir.
   Cada sección se construye en su propio paso. */
export default async function Home({ params }: { params: Promise<{ lang: Lang }> }) {
  const { lang } = await params;
  const n = NAV[lang];
  const placeholders = [
    { id: "inicio", t: lang === "es" ? "Hero: paso 4" : "Hero: step 4" },
    ...n.secciones.map((s, i) => ({ id: s.id, t: `${s.label}: ${lang === "es" ? "paso" : "step"} ${5 + i}` })),
    { id: "contacto", t: lang === "es" ? "Cierre y contacto: paso 9" : "Closing and contact: step 9" },
  ];
  return (
    <main className="home-skel">
      {placeholders.map((p) => (
        <section key={p.id} id={p.id} className="skel wrap" aria-label={p.t}>
          <span className="caps">{p.id}</span>
          <p className="t-2" style={{ color: "var(--fg-3)" }}>{p.t}</p>
        </section>
      ))}
    </main>
  );
}
