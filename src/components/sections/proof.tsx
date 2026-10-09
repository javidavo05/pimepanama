// Prueba. Origen: el bloque oscuro de cifras clave de la propuesta (único bloque oscuro fuera del cierre)
// y la fila de pills del recorrido del cliente, convertida en cinta. Los dígitos ruedan al entrar en pantalla.
import Image from "next/image";
import { Counter, Eyebrow, Lines } from "@/components/ui/primitives";
import { Marquee } from "@/components/motion/marquee";
import { CLIENTES, TIPOS_SISTEMA } from "../../../content/clientes";
import { SITE, type Lang } from "../../../content/site";
import "./proof.css";

const COPY = {
  es: {
    eyebrow: "02 · En cifras",
    titulo: ["Siete años construyendo", "sistemas que siguen en uso"],
    bajada: "Cada cifra es real. Los sistemas están en producción y se pueden ver en el portfolio.",
    cifras: [
      { v: SITE.cifras.anios, sufijo: "+", l: "años construyendo software para empresas en Panamá" },
      { v: SITE.cifras.proyectos, sufijo: "+", l: "sistemas entregados y en producción" },
      { v: SITE.cifras.mesesGarantia, l: "meses de garantía después de cada entrega" },
    ],
    clientes: "Confían en Pime",
    tipos: "Lo que hemos construido",
  },
  en: {
    eyebrow: "02 · In numbers",
    titulo: ["Seven years building", "systems still in use"],
    bajada: "Every number is real. The systems are in production and can be seen in the portfolio.",
    cifras: [
      { v: SITE.cifras.anios, sufijo: "+", l: "years building software for companies in Panama" },
      { v: SITE.cifras.proyectos, sufijo: "+", l: "systems delivered and in production" },
      { v: SITE.cifras.mesesGarantia, l: "months of warranty after every delivery" },
    ],
    clientes: "They trust Pime",
    tipos: "What we have built",
  },
};

export function Proof({ lang }: { lang: Lang }) {
  const c = COPY[lang];
  const autorizados = CLIENTES.filter((x) => x.autorizado);
  const monto = SITE.cifras.montoDesarrollado;
  return (
    <section className="proof" id="prueba" data-theme="ink" data-motion="proof" aria-labelledby="proof-title">
      <div className="wrap proof-in">
        <header className="proof-head">
          <Eyebrow>{c.eyebrow}</Eyebrow>
          <Lines as="h2" className="t-1" lines={c.titulo} />
          <span id="proof-title" className="sr-only">{c.titulo.join(" ")}</span>
          <p className="lead" data-reveal="rise" style={{ "--delay": "200ms" } as React.CSSProperties}>{c.bajada}</p>
        </header>
        <dl className="proof-stats" data-reveal="rise-row">
          {c.cifras.map((k, i) => (
            <div className="proof-stat" key={k.l} style={{ "--i": i } as React.CSSProperties}>
              <dt className="proof-v"><Counter value={k.v} suffix={k.sufijo ?? ""} /></dt>
              <dd>{k.l}</dd>
            </div>
          ))}
          {monto !== null && (
            <div className="proof-stat" style={{ "--i": 3 } as React.CSSProperties}>
              <dt className="proof-v"><Counter value={monto} prefix="US$ " suffix="+" /></dt>
              <dd>{lang === "es" ? "desarrollados para nuestros clientes" : "developed for our clients"}</dd>
            </div>
          )}
        </dl>
      </div>
      <div className="proof-tapes" data-reveal="rise" style={{ "--delay": "300ms" } as React.CSSProperties}>
        <div className="wrap proof-tape-head"><span className="caps">{c.clientes}</span></div>
        <Marquee speed={36}>
          {autorizados.map((x) => (
            <span className="proof-logo" key={x.nombre} title={x.sistema}>
              {x.logo ? (
                <Image src={x.logo} alt={x.nombre} height={40} width={Math.round(40 * (x.ancho ?? 2))} unoptimized={x.logo.endsWith(".svg")} />
              ) : (
                <span className="proof-wordmark">{x.nombre}</span>
              )}
            </span>
          ))}
        </Marquee>
        <div className="wrap proof-tape-head"><span className="caps">{c.tipos}</span></div>
        <Marquee speed={28} className="proof-tape-2">
          {TIPOS_SISTEMA[lang].map((n, i) => <span className="proof-pill" key={`${n}-${i}`}>{n}</span>)}
        </Marquee>
      </div>
    </section>
  );
}
