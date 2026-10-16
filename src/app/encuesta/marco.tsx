import type { ReactNode } from "react";
import { LogoPime, SimboloContorno } from "@/components/portal/marca";
import { IconCheck, IconEscudo, IconTickets, IconProyectos } from "@/components/portal/iconos";
import { Titular } from "@/components/portal/ui";

/**
 * Marco de la encuesta: la composición de las pantallas de acceso del cliente (bloque azul tinta con la banda
 * de tres capas y el logo; a la derecha, el contenido sobre papel). En el teléfono el bloque oscuro es una
 * franja arriba y la pregunta queda a la vista.
 */
const COMO = [
  { Icon: IconProyectos, t: "Una sola pregunta", d: "Del 0 al 10, qué tan probable es que nos recomiendes." },
  { Icon: IconTickets, t: "Un comentario, si quieres", d: "Lo que salió bien o lo que podemos hacer mejor." },
  { Icon: IconCheck, t: "Lo lee el equipo", d: "Cada respuesta llega directo a quien llevó tu proyecto." },
];

export function MarcoEncuesta({ eyebrow, title, subtitle, children }: { eyebrow?: string; title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <main className="p-acceso">
      <aside className="p-acceso-ink" aria-label="Pime">
        <div className="p-banda absolute inset-x-0 top-0" aria-hidden><i /><i /><i /></div>
        <SimboloContorno />
        <a href="https://pimepanama.com" className="inline-flex self-start min-h-11 items-center" aria-label="Pime, ir al sitio">
          <LogoPime height={28} />
        </a>
        <div className="p-acceso-mensaje grid gap-6 lg:gap-12">
          <div className="grid gap-4">
            <p className="p-eyebrow">Encuesta de satisfacción</p>
            <p className="p-acceso-titular p-lines">
              <span className="sr-only">Tu opinión, en un minuto.</span>
              <span className="l" aria-hidden><span style={{ "--i": 0 } as React.CSSProperties}>Tu opinión,</span></span>
              <span className="l" aria-hidden><span style={{ "--i": 1 } as React.CSSProperties}>en un minuto.</span></span>
            </p>
          </div>
          <ul className="p-acceso-lista">
            {COMO.map(({ Icon, t, d }, i) => (
              <li key={t} style={{ "--i": i } as React.CSSProperties}>
                <Icon width={20} height={20} />
                <div><b>{t}</b><span>{d}</span></div>
              </li>
            ))}
          </ul>
        </div>
        <p className="p-acceso-pie"><IconEscudo width={16} height={16} />Tu respuesta solo la ve el equipo de Pime</p>
      </aside>

      <section className="p-acceso-form p-fondo">
        <SimboloContorno className="p-marca-agua" />
        <div className="p-acceso-caja">
          <header className="grid gap-3">
            {eyebrow && <p className="p-eyebrow [overflow-wrap:anywhere]">{eyebrow}</p>}
            <Titular className="text-fg text-3xl sm:text-4xl font-extrabold tracking-[-0.03em] leading-[1.05] text-balance" demora={120}>{title}</Titular>
            {subtitle && <p className="p-in text-fg-dim text-base leading-relaxed [overflow-wrap:anywhere]" style={{ "--i": 2 } as React.CSSProperties}>{subtitle}</p>}
          </header>
          <div className="p-in" style={{ "--i": 3 } as React.CSSProperties}>{children}</div>
        </div>
      </section>
    </main>
  );
}
