// motion: none — primitivos estáticos; su movimiento lo aporta el contenedor con data-reveal.
import type { ReactNode } from "react";

/** eager: por encima del pliegue, anima con CSS desde el primer paint, sin esperar JS. */
export function Eyebrow({ children, className = "", eager }: { children: ReactNode; className?: string; eager?: boolean }) {
  return (
    <span className={`eyebrow ${eager ? "eager" : ""} ${className}`.trim()} {...(eager ? {} : { "data-reveal": "draw" })}>
      <span className="draw" aria-hidden="true" />
      {children}
    </span>
  );
}

export function AccentRule({ delay = 0, eager }: { delay?: number; eager?: boolean }) {
  return <span className={`accent-rule draw ${eager ? "eager" : ""}`.trim()} {...(eager ? {} : { "data-reveal": "draw" })} style={{ "--delay": `${delay}ms` } as React.CSSProperties} aria-hidden="true" />;
}

export function LetterChip({ children, size }: { children: string; size?: "lg" }) {
  return <span className={`letter-chip ${size ?? ""}`.trim()} aria-hidden="true">{children}</span>;
}

export function NumChip({ n, ink }: { n: number | string; ink?: boolean }) {
  return (
    <span className={`num-chip ${ink ? "ink" : ""}`.trim()} data-reveal="ring">
      <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="15.3" pathLength={1} /></svg>
      <span className="num">{n}</span>
    </span>
  );
}

export function Pill({ children, variant = "", className = "" }: { children: ReactNode; variant?: "" | "ghost" | "accent" | "soft" | "ok" | "run" | "bad"; className?: string }) {
  return <span className={`pill ${variant} ${className}`.trim()}>{children}</span>;
}

/** Titular revelado por línea. Cada string es una línea. */
export function Lines({ lines, as: Tag = "h2", className = "", eager }: { lines: string[]; as?: "h1" | "h2" | "h3" | "p"; className?: string; eager?: boolean }) {
  return (
    <Tag className={`lines ${eager ? "eager" : ""} ${className}`.trim()} {...(eager ? {} : { "data-reveal": "lines" })}>
      {lines.map((l, i) => (
        <span className="line" key={i} style={{ "--i": i } as React.CSSProperties}><span>{l}</span></span>
      ))}
    </Tag>
  );
}

/** Cifra con dígitos que ruedan. El HTML ya trae el valor final. */
export function Counter({ value, prefix = "", suffix = "", className = "" }: { value: number; prefix?: string; suffix?: string; className?: string }) {
  const chars = String(value).split("");
  return (
    <span className={`digits ${className}`.trim()} data-reveal="count">
      <span className="sr-only">{`${prefix}${value}${suffix}`}</span>
      {prefix && <span aria-hidden="true">{prefix}</span>}
      {chars.map((c, i) =>
        /\d/.test(c) ? (
          <span className="digit" key={i} aria-hidden="true" style={{ "--d": Number(c), "--i": i } as React.CSSProperties}>
            <span>{[0,1,2,3,4,5,6,7,8,9].map((d) => <span key={d} style={{ display: "block", height: "1em" }}>{d}</span>)}</span>
          </span>
        ) : (
          <span key={i} aria-hidden="true">{c}</span>
        ),
      )}
      {suffix && <span aria-hidden="true">{suffix}</span>}
    </span>
  );
}
