import type { ReactNode } from "react";
import { LogoPime, SimboloContorno } from "./marca";
import { IconEscudo, IconFacturas, IconProyectos, IconTickets, IconCheck } from "./iconos";
import { Titular } from "./ui";
import { PortalVivo } from "./vivo";

/**
 * Marco de las pantallas de acceso de la cuenta del cliente (entrar, recuperar, activar, verificar).
 * Composición de la portada de una propuesta de Pime: bloque azul tinta con la banda de tres capas, el logo
 * invertido y el símbolo en contorno que se dibuja sangrado al borde; a la derecha, el formulario sobre papel.
 * En el teléfono el bloque oscuro se vuelve una franja arriba y el formulario queda a la vista sin scroll.
 * El acceso es siempre de la línea Normal (marca madre): todavía no se sabe qué cliente entra.
 */
const LO_QUE_VES = [
  { Icon: IconProyectos, t: "Avance en vivo", d: "Cada fase de tus proyectos y cuánto falta, al día." },
  { Icon: IconCheck, t: "Aprobaciones", d: "Órdenes de cambio y estimados que esperan tu decisión." },
  { Icon: IconTickets, t: "Tickets de soporte", d: "Lo que pediste, quién lo tiene y cada respuesta." },
  { Icon: IconFacturas, t: "Facturas y pagos", d: "Tu saldo, cada factura en PDF y tus recibos." },
];

export function AccesoShell({ eyebrow, title, subtitle, children, footer }: { eyebrow?: string; title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
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
            <p className="p-eyebrow">Cuenta de cliente</p>
            <p className="p-acceso-titular p-lines">
              <span className="sr-only">Tu proyecto, en vivo.</span>
              <span className="l" aria-hidden><span style={{ "--i": 0 } as React.CSSProperties}>Tu proyecto,</span></span>
              <span className="l" aria-hidden><span style={{ "--i": 1 } as React.CSSProperties}>en vivo.</span></span>
            </p>
          </div>
          <ul className="p-acceso-lista">
            {LO_QUE_VES.map(({ Icon, t, d }, i) => (
              <li key={t} style={{ "--i": i } as React.CSSProperties}>
                <Icon width={20} height={20} />
                <div><b>{t}</b><span>{d}</span></div>
              </li>
            ))}
          </ul>
        </div>
        <p className="p-acceso-pie"><IconEscudo width={16} height={16} />Conexión cifrada · doble verificación disponible en tu cuenta</p>
      </aside>

      <section className="p-acceso-form p-fondo">
        <SimboloContorno className="p-marca-agua" />
        <div className="p-acceso-caja">
          <header className="grid gap-3">
            {eyebrow && <p className="p-eyebrow">{eyebrow}</p>}
            <Titular className="text-fg text-3xl sm:text-4xl font-extrabold tracking-[-0.03em] leading-[1.05] text-balance" demora={120}>{title}</Titular>
            {subtitle && <p className="p-in text-fg-dim text-base leading-relaxed" style={{ "--i": 2 } as React.CSSProperties}>{subtitle}</p>}
          </header>
          <div className="p-in" style={{ "--i": 3 } as React.CSSProperties}>{children}</div>
          {footer && <div className="p-in text-fg-faint text-sm leading-relaxed" style={{ "--i": 5 } as React.CSSProperties}>{footer}</div>}
        </div>
      </section>
      <PortalVivo />
    </main>
  );
}
