import Link from "next/link";
import { CaseShot } from "@/components/cases";
import { Eyebrow, Pill } from "@/components/ui/primitives";
import { CASOS } from "../../../../../content/portfolio";
import { LANGS, type Lang } from "../../../../../content/site";
import { notFound } from "next/navigation";
import "./lista.css";

export default async function Portfolio({ params }: { params: Promise<{ lang: Lang }> }) {
  const { lang } = await params;
  if (!LANGS.includes(lang)) notFound();
  const casos = CASOS.filter((c) => c.publicable);
  return (
    <main className="pl" data-motion="reveal">
      <div className="wrap pl-wrap">
        <Eyebrow>{lang === "es" ? "Portfolio" : "Portfolio"}</Eyebrow>
        <h1 className="t-1">{lang === "es" ? "Sistemas que operan empresas reales" : "Systems that run real companies"}</h1>
        <ul className="pl-grid">
          {casos.map((c) => (
            <li key={c.slug} data-reveal="rise">
              <Link href={`/${lang}/portfolio/${c.slug}`} className="pl-card">
                <CaseShot slug={c.slug} label={`${c.nombre}`} />
                <span className="pl-t">{c.nombre}</span>
                <span className="meta">{c.cliente} · {c.industria[lang]}</span>
                <Pill variant="ghost">{c.tipo[lang]}</Pill>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
