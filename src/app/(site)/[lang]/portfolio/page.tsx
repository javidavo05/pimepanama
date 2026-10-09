import { notFound } from "next/navigation";
import { Eyebrow } from "@/components/ui/primitives";
import { PortfolioGrid } from "@/components/sections/portfolio-grid";
import { CASOS } from "../../../../../content/portfolio";
import { LANGS, type Lang } from "../../../../../content/site";
import "./lista.css";

const T = {
  es: { eyebrow: "Portfolio", titulo: "Sistemas que operan empresas reales", bajada: "Todos los sistemas entregados que se pueden mostrar, con su tablero recreado con datos de muestra. Filtre por industria o por tipo." },
  en: { eyebrow: "Portfolio", titulo: "Systems that run real companies", bajada: "Every delivered system we can show, with its dashboard recreated with sample data. Filter by industry or type." },
};

export default async function Portfolio({ params }: { params: Promise<{ lang: Lang }> }) {
  const { lang } = await params;
  if (!LANGS.includes(lang)) notFound();
  const t = T[lang];
  const casos = CASOS.filter((c) => c.publicable);
  return (
    <main className="pl" data-motion="reveal">
      <div className="wrap pl-wrap">
        <Eyebrow>{t.eyebrow}</Eyebrow>
        <h1 className="t-1">{t.titulo}</h1>
        <p className="lead">{t.bajada}</p>
        <PortfolioGrid casos={casos} lang={lang} />
      </div>
    </main>
  );
}
