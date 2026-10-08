"use client";
// Enlace con subrayado que se dibuja desde el lado por el que entra el cursor y se retira por el otro.
import Link from "next/link";
import type { PointerEvent } from "react";

export function TextLink({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  const side = (e: PointerEvent<HTMLAnchorElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--from", e.clientX < r.left + r.width / 2 ? "left" : "right");
  };
  return (
    <Link href={href} className={`link ${className}`.trim()} data-motion="underline" onPointerEnter={side} onPointerLeave={side}>
      {children}
    </Link>
  );
}
