import { wrapDesignSystemDocument } from "./document";

/**
 * Renders design-system HTML to a PDF buffer via headless Chromium.
 * Uses @sparticuz/chromium on Vercel; falls back to local Chrome channel in dev.
 */
export async function renderHtmlToPdfBuffer(pagesHtml: string): Promise<Buffer> {
  const fullHtml = wrapDesignSystemDocument(pagesHtml, { mode: "print" });

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
    await page.emulateMediaType("print");
    const pdf = await page.pdf({
      width: "210mm",
      height: "297mm",
      printBackground: true,
      margin: { top: "0mm", bottom: "0mm", left: "0mm", right: "0mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
