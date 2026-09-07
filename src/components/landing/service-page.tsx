import Link from "next/link";
import { NavigationBar } from "@/components/landing/navigation-bar";
import { LandingFooter } from "@/components/landing/footer";
import { getService, type ServiceContent } from "@/lib/services-content";

const NAV_ITEMS = [
  { label: "Servicios", href: "/#services" },
  { label: "Proyectos", href: "/#projects" },
  { label: "Por qué Pime", href: "/#differentiators" },
  { label: "Sectores", href: "/#sectors" },
  { label: "Nosotros", href: "/#about" },
  { label: "Contacto", href: "/#contact" },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[0.62rem] font-semibold uppercase tracking-[0.3em] text-[#60A5FA]">
      {children}
    </p>
  );
}

export function ServicePage({ service }: { service: ServiceContent }) {
  return (
    <>
      <NavigationBar locale="es" items={NAV_ITEMS} />

      {/* Un solo <main> por página: el layout raíz ya no lo declara. */}
      <main>
        {/* Hero */}
        <section
          className="relative overflow-hidden px-6 pb-16 pt-32"
          style={{ background: "linear-gradient(180deg, #050914 0%, #04050c 100%)" }}
        >
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse at 30% 0%, rgba(37,99,235,0.10), transparent 65%)" }}
          />
          <div className="relative z-10 mx-auto max-w-4xl">
            <nav aria-label="Ruta de navegación" className="mb-6 flex flex-wrap items-center gap-2 text-xs text-white/45">
              <Link href="/" className="transition-colors hover:text-white/70">Inicio</Link>
              <span aria-hidden>/</span>
              <span className="text-white/60">{service.shortName}</span>
            </nav>

            <Eyebrow>{service.eyebrow}</Eyebrow>
            <h1
              className="mt-4 text-3xl font-bold leading-[1.15] tracking-tight text-white md:text-5xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {service.h1}
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-relaxed text-white/70 md:text-lg">
              {service.intro}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/#contact"
                className="rounded-lg px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
                style={{
                  background: "linear-gradient(135deg, #4F46E5 0%, #2563EB 50%, #0EA5E9 100%)",
                  boxShadow: "0 18px 35px -20px rgba(37,99,235,0.6)",
                }}
              >
                Contar mi proyecto
              </Link>
              <Link
                href="/portfolio"
                className="text-sm text-white/60 underline underline-offset-4 transition-colors hover:text-white"
              >
                Ver sistemas que ya entregamos
              </Link>
            </div>
          </div>
        </section>

        {/* Qué incluye */}
        <section className="px-6 py-24" style={{ background: "#04050c" }}>
          <div className="mx-auto max-w-4xl">
            <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl" style={{ fontFamily: "var(--font-display)" }}>
              Qué incluye
            </h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {service.includes.map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-6"
                >
                  <h3 className="text-base font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cómo trabajamos */}
        <section className="px-6 py-24" style={{ background: "linear-gradient(180deg, #04050c 0%, #060a16 100%)" }}>
          <div className="mx-auto max-w-4xl">
            <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl" style={{ fontFamily: "var(--font-display)" }}>
              Cómo trabajamos
            </h2>
            <ol className="mt-8 space-y-4">
              {service.process.map((step) => (
                <li key={step.step} className="flex gap-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
                  <span className="shrink-0 font-mono text-sm text-[#60A5FA]">{step.step}</span>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-white">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/60">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Casos reales — enlaces internos hacia el portafolio */}
        <section className="px-6 py-24" style={{ background: "#060a16" }}>
          <div className="mx-auto max-w-4xl">
            <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl" style={{ fontFamily: "var(--font-display)" }}>
              Sistemas que ya construimos
            </h2>
            <p className="mt-3 text-sm text-white/55">Cada uno tiene una demo navegable, no una captura de pantalla.</p>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {service.cases.map((c) => (
                <Link
                  key={c.slug}
                  href={`/portfolio/demos/${c.slug}`}
                  className="group rounded-xl border border-white/[0.07] bg-white/[0.02] p-6 transition-colors hover:border-[#3B82F6]/40"
                >
                  <h3 className="text-sm font-semibold text-white group-hover:text-[#60A5FA]">{c.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/55">{c.blurb}</p>
                  <span className="mt-4 inline-block text-xs text-[#60A5FA]">Ver la demo →</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Preguntas frecuentes — <details> nativo: accesible y sin JavaScript */}
        <section className="px-6 py-24" style={{ background: "linear-gradient(180deg, #060a16 0%, #04050c 100%)" }}>
          <div className="mx-auto max-w-4xl">
            <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl" style={{ fontFamily: "var(--font-display)" }}>
              Preguntas frecuentes
            </h2>
            <div className="mt-8 space-y-3">
              {service.faqs.map((faq) => (
                <details
                  key={faq.q}
                  className="group rounded-xl border border-white/[0.07] bg-white/[0.02] px-6 py-4 [&[open]]:border-white/[0.12]"
                >
                  <summary className="cursor-pointer list-none text-sm font-medium text-white/85 marker:content-none">
                    <span className="flex items-start justify-between gap-4">
                      {faq.q}
                      <span aria-hidden className="mt-0.5 shrink-0 text-white/55 transition-transform group-open:rotate-45">
                        +
                      </span>
                    </span>
                  </summary>
                  <p className="mt-4 text-sm leading-relaxed text-white/60">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Servicios relacionados — reparte autoridad entre las páginas */}
        <section className="px-6 py-16" style={{ background: "#04050c" }}>
          <div className="mx-auto max-w-4xl">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/45">
              Otros servicios
            </h2>
            <div className="mt-6 flex flex-wrap gap-3">
              {service.related.map((slug) => {
                const other = getService(slug);
                if (!other) return null;
                return (
                  <Link
                    key={slug}
                    href={`/${slug}`}
                    className="rounded-lg border border-white/[0.08] px-4 py-2 text-sm text-white/65 transition-colors hover:border-[#3B82F6]/40 hover:text-white"
                  >
                    {other.shortName}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Cierre */}
        <section
          className="relative overflow-hidden px-6 py-24"
          style={{ background: "linear-gradient(180deg, #04050c 0%, #020308 100%)" }}
        >
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse at center, rgba(37,99,235,0.06), transparent 70%)" }}
          />
          <div className="relative z-10 mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl" style={{ fontFamily: "var(--font-display)" }}>
              ¿Tenés un proceso que resolver?
            </h2>
            <p className="mt-4 text-base leading-relaxed text-white/65">
              Contanos qué necesitás y en 24 horas hábiles te respondemos con una lectura concreta
              del proyecto y el siguiente paso que recomendamos.
            </p>
            <Link
              href="/#contact"
              className="mt-8 inline-block rounded-lg px-8 py-4 text-sm font-semibold text-white transition hover:brightness-110"
              style={{
                background: "linear-gradient(135deg, #4F46E5 0%, #2563EB 50%, #0EA5E9 100%)",
                boxShadow: "0 18px 35px -20px rgba(37,99,235,0.6)",
              }}
            >
              Escribir a Pime Panamá
            </Link>
          </div>
        </section>
      </main>

      <LandingFooter locale="es" />
    </>
  );
}
