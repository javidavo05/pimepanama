// 404 para toda dirección que no existe en pimepanama.com. El sitio tiene su raíz en /[lang], así que
// sin este archivo Next mostraba su página por defecto, sin marca ni tipografía.
import "./globals.css";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Página no encontrada · Pime Panamá", robots: { index: false } };
export const viewport: Viewport = { themeColor: "#FCFDFE", width: "device-width", initialScale: 1 };

export default function GlobalNotFound() {
  return (
    <html lang="es">
      <body>
        <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: "48px 16px" }}>
          <div style={{ width: "100%", maxWidth: 480, display: "grid", gap: 32 }}>
            <Link href="/es" aria-label="Pime Panamá, inicio" style={{ justifySelf: "start" }}><Logo height={28} /></Link>
            <div style={{ display: "grid", gap: 12 }}>
              <p style={{ fontSize: "var(--text-sm)", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent)" }}>Error 404</p>
              <h1 style={{ fontSize: "clamp(28px, 6vw, 40px)", fontWeight: 700, lineHeight: 1.1 }}>Esta página no existe</h1>
              <p style={{ color: "var(--slate)", lineHeight: 1.6 }}>Puede que el enlace esté viejo o tenga un error. Desde el inicio llegas a todo: servicios, proyectos y contacto.</p>
              <p style={{ color: "var(--slate-light)", fontSize: "var(--text-sm)", lineHeight: 1.6 }} lang="en">This page doesn’t exist. Start from the home page.</p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <Button href="/es" variant="primary" arrow>Ir al inicio</Button>
              <Button href="/es/contacto" variant="secondary">Pedir una propuesta</Button>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
