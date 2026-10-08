"use client";
// Botón: imán al cursor (solo pointer: fine), presión al toque, texto que sube al hover.
import Link from "next/link";
import { useRef, type PointerEvent } from "react";

type Props = {
  children: string;
  href?: string;
  variant?: "primary" | "secondary" | "accent";
  size?: "sm" | "md";
  arrow?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
  className?: string;
};

export function Button({ children, href, variant = "primary", size = "md", arrow, type = "button", onClick, className = "" }: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const move = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = ref.current; if (!el) return;
    const s = getComputedStyle(el).getPropertyValue("--magnet").trim();
    const k = s ? parseFloat(s) : 0.35;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) * k;
    const y = (e.clientY - (r.top + r.height / 2)) * k;
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  };
  const leave = () => { if (ref.current) ref.current.style.transform = ""; };
  const cls = `btn ${variant} ${size} ${className}`.trim();
  const inner = (
    <>
      <span className="swap"><span>{children}</span><span aria-hidden="true">{children}</span></span>
      {arrow && <span className="arrow" aria-hidden="true">→</span>}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={cls} data-motion="magnetic" ref={(n) => { ref.current = n; }} onPointerMove={move} onPointerLeave={leave}>
        {inner}
      </Link>
    );
  }
  return (
    <button type={type} className={cls} data-motion="magnetic" ref={(n) => { ref.current = n; }} onPointerMove={move} onPointerLeave={leave} onClick={onClick}>
      {inner}
    </button>
  );
}
