/**
 * Piezas visuales del portal, con el lenguaje de pimepanama.com (ver portal.css). Usan los tokens del tema
 * (.portal-app), así sirven en la línea Normal y en la Premium sin cambios. Escala de espacio 4/8/12/16/24/32/48;
 * una sola familia (Manrope). Todo entra animado con CSS desde el primer pintado; la isla PortalVivo solo
 * retiene lo que está debajo del pliegue hasta que aparece.
 */
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { IconFlecha } from "./iconos";

const orden = (i?: number) => (i === undefined ? undefined : ({ "--i": i } as CSSProperties));

export function Tarjeta({ children, className = "", as: As = "section", i, tocable }: { children: ReactNode; className?: string; as?: "section" | "div" | "article"; i?: number; tocable?: boolean }) {
  return <As className={`p-card p-in p-4 sm:p-6 min-w-0 ${tocable ? "p-tocable" : ""} ${className}`} style={orden(i)}>{children}</As>;
}

/** Bloque oscuro de la línea del cliente: para la cifra que más importa de la pantalla. */
export function BloqueOscuro({ children, className = "", i }: { children: ReactNode; className?: string; i?: number }) {
  return <section className={`p-ink p-in p-6 sm:p-8 min-w-0 ${className}`} style={orden(i)}>{children}</section>;
}

/** Titular revelado por línea con máscara. */
export function Titular({ children, as: Tag = "h1", className = "", demora = 0 }: { children: ReactNode; as?: "h1" | "h2" | "p"; className?: string; demora?: number }) {
  return (
    <Tag className={`p-lines ${className}`}>
      <span className="l"><span style={{ "--d": `${demora}ms` } as CSSProperties}>{children}</span></span>
    </Tag>
  );
}

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`p-eyebrow ${className}`}>{children}</p>;
}

export function Encabezado({ eyebrow, titulo, detalle, accion }: { eyebrow?: string; titulo: string; detalle?: ReactNode; accion?: ReactNode }) {
  return (
    <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-3">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <Titular className="text-fg text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em] leading-[1.05] text-balance break-words">{titulo}</Titular>
        {detalle && <p className="p-in text-fg-dim text-base leading-relaxed max-w-2xl" style={orden(2)}>{detalle}</p>}
      </div>
      {accion && <div className="p-in shrink-0" style={orden(3)}>{accion}</div>}
    </header>
  );
}

export function TituloSeccion({ children, accion }: { children: ReactNode; accion?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 mb-4">
      <h2 className="text-fg text-base sm:text-lg font-bold tracking-tight">{children}</h2>
      {accion && <div className="shrink-0">{accion}</div>}
    </div>
  );
}

const TONOS = {
  neutro: "bg-fill-2 text-fg-dim",
  marca: "bg-brand/10 text-brand-fg",
  ok: "bg-ok/10 text-ok",
  aviso: "bg-warn/10 text-warn",
  peligro: "bg-danger/10 text-danger",
} as const;
export type Tono = keyof typeof TONOS;

/** Pastilla de estado. Lo que está en curso o espera algo lleva un punto que late: está vivo. */
export function Etiqueta({ children, tono = "neutro", vivo }: { children: ReactNode; tono?: Tono; vivo?: boolean }) {
  const late = vivo ?? (tono === "marca" || tono === "aviso");
  return <span className={`p-pill ${TONOS[tono]}`} data-tono={tono}>{late && <i className="pt" aria-hidden />}{children}</span>;
}

/** Barra de avance que se llena al entrar. `viva` = la fase sigue en curso: un brillo la recorre. */
export function Barra({ valor, etiqueta, viva, i }: { valor: number; etiqueta: string; viva?: boolean; i?: number }) {
  const v = Math.max(0, Math.min(100, valor));
  return (
    <div className={`p-barra ${viva && v > 0 && v < 100 ? "p-viva" : ""}`} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={etiqueta}
      style={{ "--v": v / 100, "--i": i ?? 0 } as CSSProperties}>
      <i />
    </div>
  );
}

/** Anillo de avance con la cifra al centro. */
export function Anillo({ valor, tam = 96, grosor = 6, etiqueta, children }: { valor: number; tam?: number; grosor?: number; etiqueta: string; children?: ReactNode }) {
  const v = Math.max(0, Math.min(100, valor));
  const r = 50 - grosor / 2;
  return (
    <div className="p-anillo" style={{ width: tam, height: tam }} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={etiqueta}>
      <svg viewBox="0 0 100 100" aria-hidden>
        <circle className="fondo" cx="50" cy="50" r={r} strokeWidth={grosor} />
        {v > 0 && <circle className="valor" cx="50" cy="50" r={r} strokeWidth={grosor} pathLength={1} style={{ "--v": v / 100 } as CSSProperties} />}
      </svg>
      <div className="relative text-center">{children}</div>
    </div>
  );
}

function digitos(texto: string, k0: number, demora: number) {
  let k = k0;
  return texto.split("").map((c, i) =>
    /\d/.test(c) ? (
      <span className="dg" key={i} aria-hidden style={{ "--n": Number(c), "--k": k++, "--d": `${demora}ms` } as CSSProperties}>
        <span>{"0123456789".split("").map((d) => <span key={d}>{d}</span>)}</span>
      </span>
    ) : (
      <span key={i} aria-hidden className={/\s/.test(c) ? "whitespace-pre" : undefined}>{c}</span>
    ),
  );
}

/**
 * Cifra cuyos dígitos ruedan hasta su valor. El texto completo queda para lectores de pantalla.
 * `moneda`: la moneda va chica arriba y los centavos más chicos y suaves, como en una app de banca.
 */
export function Cifra({ texto, className = "", demora = 0, moneda }: { texto: string; className?: string; demora?: number; moneda?: boolean }) {
  const m = moneda ? texto.match(/^([^\d-]*?)\s*(-?[\d.,]+?)([.,]\d{2})?$/) : null;
  return (
    <span className={`p-cifra ${className}`}>
      <span className="sr-only">{texto}</span>
      {m ? (
        <>
          {m[1] && <span className="mon" aria-hidden>{m[1].trim()}</span>}
          {digitos(m[2], 0, demora)}
          {m[3] && <span className="cts">{digitos(m[3], m[2].length, demora)}</span>}
        </>
      ) : digitos(texto, 0, demora)}
    </span>
  );
}

/** Barra de composición (p. ej. pagado / por pagar) con código de color y leyenda con porcentajes. */
export function Mezcla({ partes, etiqueta }: { partes: { label: string; valor: number; tono: Tono; texto: string }[]; etiqueta: string }) {
  const total = partes.reduce((a, x) => a + Math.max(0, x.valor), 0);
  if (total <= 0) return null;
  const visibles = partes.filter((x) => x.valor > 0);
  return (
    <div className="space-y-3">
      <div className="p-mezcla" role="img" aria-label={`${etiqueta}: ${visibles.map((x) => `${x.label} ${Math.round((x.valor / total) * 100)} %`).join(", ")}`}>
        {visibles.map((x, i) => <i key={x.label} data-tono={x.tono} title={`${x.label}: ${x.texto}`} style={{ "--w": `${(x.valor / total) * 100}%`, "--i": i } as CSSProperties} />)}
      </div>
      <div className="p-leyenda">
        {visibles.map((x) => <span key={x.label} data-tono={x.tono}><i className="p-punto" aria-hidden />{x.label} <b className="tabular-nums">{Math.round((x.valor / total) * 100)} %</b></span>)}
      </div>
    </div>
  );
}

/** Estado vacío: el símbolo de capas se dibuja, explica qué va a aparecer y ofrece la primera acción. */
export function Vacio({ titulo, texto, accion }: { titulo: string; texto: string; accion?: ReactNode }) {
  return (
    <div className="p-vacio">
      <svg viewBox="16 12 68 76" width={40} height={44} aria-hidden className="mb-2">
        <path d="M20 72 50 84 80 72" pathLength={1} />
        <path d="M20 54 50 66 80 54" pathLength={1} />
        <path d="M20 36 50 16 80 36 50 48Z" pathLength={1} />
      </svg>
      <p className="text-fg font-bold">{titulo}</p>
      <p className="text-fg-dim text-sm leading-relaxed max-w-md">{texto}</p>
      {accion && <div className="mt-4 flex justify-center">{accion}</div>}
    </div>
  );
}

/** Fila tocable que lleva a un detalle. `tono` pinta su filete de estado (código de color). */
export function Fila({ href, titulo, detalle, derecha, i, tono }: { href: string; titulo: ReactNode; detalle?: ReactNode; derecha?: ReactNode; i?: number; tono?: Tono }) {
  return (
    <li style={orden(i)}>
      <Link href={href} data-tono={tono} className={`p-fila group flex items-center gap-4 py-4 -mx-4 pr-4 min-h-14 transition-transform focus-visible:outline-none ${tono ? "pl-6" : "pl-4"}`}>
        <div className="min-w-0 flex-1">
          <p className="text-fg font-semibold truncate">{titulo}</p>
          {detalle && <p className="text-fg-dim text-sm truncate">{detalle}</p>}
        </div>
        {derecha}
        <IconFlecha className="p-flecha shrink-0 text-fg-ghost" />
      </Link>
    </li>
  );
}

/** Texto que sube al pasar el cursor (dos capas). Para el texto de los botones principales. */
export function Swap({ children }: { children: string }) {
  return <span className="p-swap"><span>{children}</span><span aria-hidden>{children}</span></span>;
}

export const btnPrincipal = "p-btn p-btn-1";
export const btnSecundario = "p-btn p-btn-2";
export const btnPeligro = "p-btn p-btn-peligro";
export const enlace = "p-link";

export function fechaCorta(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-PA", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Panama" });
}
export function haceCuanto(d: Date | string): string {
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "hace un momento";
  const m = Math.round(s / 60); if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60); if (h < 24) return `hace ${h} h`;
  const dd = Math.round(h / 24); if (dd < 30) return `hace ${dd} ${dd === 1 ? "día" : "días"}`;
  return fechaCorta(d);
}
