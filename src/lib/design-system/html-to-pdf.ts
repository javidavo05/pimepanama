import fs from "fs";
import path from "path";
import { wrapDesignSystemDocument } from "./document";

const MIME: Record<string, string> = { ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".ttf": "font/ttf" };

/** Archivo de /public como data URL. Si no está (no se trazó en el deploy), deja la ruta como venía. */
function dataUrl(rutaPublica: string): string {
  try {
    const bytes = fs.readFileSync(path.join(process.cwd(), "public", rutaPublica.replace(/^\//, "")));
    return `data:${MIME[path.extname(rutaPublica)] ?? "application/octet-stream"};base64,${bytes.toString("base64")}`;
  } catch {
    return rutaPublica;
  }
}

/**
 * Chromium recibe el HTML con setContent (sin servidor detrás): las rutas /design-system/… y /brand/… no
 * resuelven y el PDF salía en Times, sin estilos ni logo. Se incrustan la hoja de estilos, sus fuentes y
 * los logos como data URL.
 */
function incrustar(pagesHtml: string) {
  let css = "";
  try {
    css = fs.readFileSync(path.join(process.cwd(), "public", "design-system", "style.css"), "utf8");
  } catch {
    // Sin la hoja, el documento sale con el <link> de siempre.
  }
  css = css.replace(/url\('(\/design-system\/[^']+)'\)/g, (_, ruta: string) => `url('${dataUrl(ruta)}')`);
  const html = pagesHtml.replace(/src="(\/(?:design-system|brand)\/[^"]+)"/g, (_, ruta: string) => `src="${dataUrl(ruta)}"`);
  return { css: css || undefined, html };
}

/**
 * Renders design-system HTML to a PDF buffer via headless Chromium, en tamaño carta (nunca A4) y en la
 * línea de marca del cliente.
 * Uses @sparticuz/chromium on Vercel; falls back to local Chrome channel in dev.
 */
export async function renderHtmlToPdfBuffer(pagesHtml: string, linea: "normal" | "premium" = "normal"): Promise<Buffer> {
  const { css, html } = incrustar(pagesHtml);
  const fullHtml = wrapDesignSystemDocument(html, { mode: "print", linea, inlineCss: css });

  const isVercel = !!process.env.VERCEL;
  const puppeteer = await import("puppeteer-core");

  let browser;
  if (isVercel) {
    const chromium = await import("@sparticuz/chromium");
    browser = await puppeteer.default.launch({
      args: chromium.default.args,
      executablePath: await chromium.default.executablePath(),
      headless: true,
    });
  } else {
    const executablePath =
      process.env.PUPPETEER_EXECUTABLE_PATH ||
      (process.platform === "darwin"
        ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        : process.platform === "win32"
          ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
          : "/usr/bin/google-chrome");

    browser = await puppeteer.default.launch({
      executablePath,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }

  try {
    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: "load", timeout: 30_000 });
    await page.evaluateHandle("document.fonts.ready");
    await page.emulateMediaType("print");
    // LEY: tamaño carta (8.5" × 11"). Nunca A4.
    const pdf = await page.pdf({
      format: "letter",
      printBackground: true,
      margin: { top: "0mm", bottom: "0mm", left: "0mm", right: "0mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
