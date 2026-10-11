// Imagen Open Graph por idioma: azul tinta, logo «Capas abiertas» y titular en Manrope; sin fotos. Se genera en el build.
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
  // satori no lee woff2: se usa el TTF estático de Manrope 800 (src/assets), el mismo peso del titular del sitio
  const manrope = await readFile(join(process.cwd(), "src/assets/manrope-800.ttf")).catch(() => null);
  // Logo invertido (para fondo oscuro) desde public/brand, como data URI
  const logo = await readFile(join(process.cwd(), "public/brand/pime-normal-horizontal-invertido.svg"), "utf8").catch(() => null);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#0B1D3A", color: "#FFFFFF", fontFamily: manrope ? "Manrope" : "sans-serif" }}>
        <div style={{ display: "flex", position: "absolute", top: 0, left: 0, right: 0, flexDirection: "column" }}>
          <div style={{ height: 8, background: "#1F5BFF" }} /><div style={{ height: 8, background: "#6FA8FF" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          {logo ? <img src={`data:image/svg+xml;base64,${Buffer.from(logo).toString("base64")}`} height={56} width={196} alt="" /> : <span style={{ fontSize: 40, fontWeight: 800 }}>pime</span>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 76, fontWeight: 800, lineHeight: 1.04, letterSpacing: -3 }}>
          {c.t.map((x) => <div key={x}>{x}</div>)}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#AEB8CC" }}><span>{c.s}</span><span>pimepanama.com</span></div>
      </div>
    ),
    { ...size, fonts: manrope ? [{ name: "Manrope", data: manrope, weight: 800, style: "normal" }] : [] },
  );
}
