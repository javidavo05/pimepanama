// Imagen Open Graph por idioma: tinta, marca y titular en Manrope; sin fotos. Se genera en el build.
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { LANGS, type Lang } from "../../../../content/site";

export const alt = "Pime Panamá";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export function generateStaticParams() { return LANGS.map((lang) => ({ lang })); }

const COPY = {
  es: { t: ["Su ERP o CRM,", "construido desde cero", "para su empresa"], s: "Precio cerrado por fase · Tres meses de garantía · Panamá" },
  en: { t: ["Your ERP or CRM,", "built from scratch", "for your company"], s: "Fixed price per phase · Three-month warranty · Panama" },
};

export default async function Image({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params; const l = (LANGS.includes(lang as Lang) ? lang : "es") as Lang; const c = COPY[l];
  const manrope = await readFile(join(process.cwd(), "public/fonts/manrope-var.woff2")).catch(() => null);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#0B0D14", color: "#FFFFFF", fontFamily: manrope ? "Manrope" : "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 28, fontWeight: 800, letterSpacing: -1 }}>
          <div style={{ width: 22, height: 30, background: "#2306D4", clipPath: "polygon(50% 0, 100% 0, 50% 100%, 0 100%)", borderRadius: 3 }} />PIME
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 76, fontWeight: 800, lineHeight: 1.04, letterSpacing: -3 }}>
          {c.t.map((x) => <div key={x}>{x}</div>)}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#A7B0C0" }}><span>{c.s}</span><span>pimepanama.com</span></div>
      </div>
    ),
    { ...size, fonts: manrope ? [{ name: "Manrope", data: manrope, weight: 800, style: "normal" }] : [] },
  );
}
