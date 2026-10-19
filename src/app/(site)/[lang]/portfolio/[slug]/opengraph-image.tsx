// Imagen Open Graph de cada caso: azul tinta, cliente, tipo y resumen, sin el tablero. Sin esto, LinkedIn y otros
// tomaban como vista previa la imagen del tablero recreado (datos de muestra) y la mostraban sin su etiqueta.
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { CASOS } from "../../../../../../content/portfolio";
import { LANGS, type Lang } from "../../../../../../content/site";

export const alt = "Caso del portfolio de Pime Panamá";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return LANGS.flatMap((lang) => CASOS.filter((c) => c.publicable).map((c) => ({ lang, slug: c.slug })));
}

export default async function Image({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang, slug } = await params;
  const l = (LANGS.includes(lang as Lang) ? lang : "es") as Lang;
  const c = CASOS.find((x) => x.slug === slug);
  const manrope = await readFile(join(process.cwd(), "src/assets/manrope-800.ttf")).catch(() => null);
  const logo = await readFile(join(process.cwd(), "public/brand/pime-normal-horizontal-invertido.svg"), "utf8").catch(() => null);
  const eyebrow = c ? `${c.cliente} · ${c.industria[l]}` : "Pime Panamá";
  const titulo = c ? c.tipo[l] : "Portfolio";
  const resumen = c ? c.resumen[l] : "";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#0B1D3A", color: "#FFFFFF", fontFamily: manrope ? "Manrope" : "sans-serif" }}>
        <div style={{ display: "flex", position: "absolute", top: 0, left: 0, right: 0, flexDirection: "column" }}>
          <div style={{ height: 8, background: "#1F5BFF" }} /><div style={{ height: 8, background: "#6FA8FF" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          {logo ? <img src={`data:image/svg+xml;base64,${Buffer.from(logo).toString("base64")}`} height={48} width={168} alt="" /> : <span style={{ fontSize: 36, fontWeight: 800 }}>pime</span>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 28, color: "#6FA8FF", letterSpacing: 2, textTransform: "uppercase" }}>{eyebrow}</div>
          <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>{titulo}</div>
          <div style={{ fontSize: 30, color: "#AEB8CC", lineHeight: 1.35 }}>{resumen.length > 150 ? `${resumen.slice(0, 147)}…` : resumen}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", fontSize: 24, color: "#AEB8CC" }}>pimepanama.com</div>
      </div>
    ),
    { ...size, fonts: manrope ? [{ name: "Manrope", data: manrope, weight: 800, style: "normal" }] : [] },
  );
}
