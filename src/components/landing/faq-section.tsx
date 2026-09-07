import type { ServiceFaq } from "@/lib/services-content";

/**
 * El marcado FAQPage solo es válido si las preguntas están visibles en la
 * página: Google penaliza los datos estructurados que describen contenido que
 * el usuario no puede ver. Por eso el schema y esta sección van siempre juntos.
 *
 * Se usa <details> nativo: accesible por teclado, sin JavaScript, y el texto
 * de la respuesta está en el HTML aunque el bloque esté cerrado.
 */
export function FaqSection({ faqs, heading }: { faqs: ServiceFaq[]; heading: string }) {
  return (
    <section
      id="faq"
      className="px-6 py-24"
      style={{ background: "linear-gradient(180deg, #060a16 0%, #04050c 100%)" }}
    >
      <div className="mx-auto max-w-3xl">
        <h2
          className="text-2xl font-bold tracking-tight text-white md:text-3xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {heading}
        </h2>

        <div className="mt-8 space-y-3">
          {faqs.map((faq) => (
            <details
              key={faq.q}
              className="group rounded-xl border border-white/[0.07] bg-white/[0.02] px-6 py-4 [&[open]]:border-white/[0.12]"
            >
              <summary className="cursor-pointer list-none text-sm font-medium text-white/85 marker:content-none">
                <span className="flex items-start justify-between gap-4">
                  {faq.q}
                  <span
                    aria-hidden
                    className="mt-0.5 shrink-0 text-white/55 transition-transform group-open:rotate-45"
                  >
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
  );
}
