import fs from "fs";
import path from "path";
import { extractR2Key, getR2Object } from "@/lib/r2";
import type { CompanyConfig } from "@prisma/client";

function isR2Logo(url: string): boolean {
  return (
    url.includes(".r2.dev") ||
    url.includes("r2.cloudflarestorage.com") ||
    url.startsWith("branding/")
  );
}

/** Returns a base64 data URL for the company logo, safe for react-pdf <Image>. */
export async function getLogoForPdf(
  config?: Partial<CompanyConfig> | null
): Promise<string> {
  const logoUrl = config?.logoUrl?.trim();

  if (logoUrl && isR2Logo(logoUrl)) {
    const key = extractR2Key(logoUrl);
    if (key) {
      try {
        const obj = await getR2Object(key);
        const bytes = await obj.Body?.transformToByteArray();
        if (bytes) {
          const ext = key.split(".").pop()?.toLowerCase() ?? "png";
          const mime =
            ext === "jpg" || ext === "jpeg"
              ? "image/jpeg"
              : ext === "svg"
              ? "image/svg+xml"
              : "image/png";
          return `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
        }
      } catch {
        // fall through to default
      }
    }
  }

  const logoPath = path.join(process.cwd(), "public", "logo-pime.png");
  const buf = fs.readFileSync(logoPath);
  return `data:image/png;base64,${buf.toString("base64")}`;
}
