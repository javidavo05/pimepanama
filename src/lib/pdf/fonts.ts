import { Font } from "@react-pdf/renderer";
import fs from "fs";
import path from "path";

// .ttf, not .woff2: react-pdf's PDF font-subsetter (fontkit's TTFSubset) crashes on these particular
// woff2-decompressed tables ("Offset is outside the bounds of the DataView"). Converted once from the
// design-system woff2 originals with fontTools (`flavor = None; save()`) — see git history for the repro.
const FONT_FILES = {
  "inter-300": "inter-latin-300-normal.ttf",
  "inter-400": "inter-latin-400-normal.ttf",
  "inter-500": "inter-latin-500-normal.ttf",
  "inter-600": "inter-latin-600-normal.ttf",
  "inter-700": "inter-latin-700-normal.ttf",
  "inter-800": "inter-latin-800-normal.ttf",
  "inter-900": "inter-latin-900-normal.ttf",
  "manrope-500": "manrope-latin-500-normal.ttf",
  "manrope-600": "manrope-latin-600-normal.ttf",
  "manrope-700": "manrope-latin-700-normal.ttf",
  "manrope-800": "manrope-latin-800-normal.ttf",
} as const;

/**
 * Resolves each font file to a URL @react-pdf/renderer's fetch-based loader can read.
 * Server (Node): Node's built-in fetch doesn't support `file://` (throws "not implemented"), so we
 * read the file ourselves and hand it a `data:` URL — no network hop, no origin guessing.
 * Client (browser preview): relative path served from /public — resolves against window.location.
 */
function resolveSrc(filename: string): string {
  if (typeof window === "undefined") {
    const bytes = fs.readFileSync(path.join(process.cwd(), "public", "fonts", "pdf", filename));
    return `data:font/ttf;base64,${bytes.toString("base64")}`;
  }
  return `/fonts/pdf/${filename}`;
}

let registered = false;

/** Registers Inter + Manrope (design-system brand fonts) with react-pdf. Idempotent, safe on client and server. */
export function registerPdfFonts() {
  if (registered) return;
  registered = true;

  Font.register({
    family: "Inter",
    fonts: [
      { src: resolveSrc(FONT_FILES["inter-300"]), fontWeight: 300 },
      { src: resolveSrc(FONT_FILES["inter-400"]), fontWeight: 400 },
      { src: resolveSrc(FONT_FILES["inter-500"]), fontWeight: 500 },
      { src: resolveSrc(FONT_FILES["inter-600"]), fontWeight: 600 },
      { src: resolveSrc(FONT_FILES["inter-700"]), fontWeight: 700 },
      { src: resolveSrc(FONT_FILES["inter-800"]), fontWeight: 800 },
      { src: resolveSrc(FONT_FILES["inter-900"]), fontWeight: 900 },
    ],
  });

  Font.register({
    family: "Manrope",
    fonts: [
      { src: resolveSrc(FONT_FILES["manrope-500"]), fontWeight: 500 },
      { src: resolveSrc(FONT_FILES["manrope-600"]), fontWeight: 600 },
      { src: resolveSrc(FONT_FILES["manrope-700"]), fontWeight: 700 },
      { src: resolveSrc(FONT_FILES["manrope-800"]), fontWeight: 800 },
    ],
  });

  // Long technical/product words (URLs, emails) should break rather than force a hyphen mid-word.
  Font.registerHyphenationCallback((word) => [word]);
}
