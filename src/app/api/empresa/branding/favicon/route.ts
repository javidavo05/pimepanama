import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { extractR2Key, getR2Object } from "@/lib/r2";

export const runtime = "nodejs";

const FALLBACK_ICON = path.join(process.cwd(), "public/icons/empresa-icon-192.png");

async function serveFallback() {
  const body = await readFile(FALLBACK_ICON);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=60",
    },
  });
}

export async function GET(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    const logoUrl = user.config?.logoUrl?.trim();
    if (!logoUrl) return serveFallback();

    const key = extractR2Key(logoUrl);
    if (!key || !key.startsWith(`branding/${user.id}/`)) {
      return serveFallback();
    }

    const object = await getR2Object(key);
    const body = await object.Body?.transformToByteArray();
    if (!body) return serveFallback();

    return new NextResponse(Buffer.from(body), {
      headers: {
        "Content-Type": object.ContentType ?? "image/png",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return serveFallback();
  }
}
