import { NextResponse } from "next/server";
import { MAIL_LOGO_R2_KEY } from "@/lib/company-logo";
import { getR2Object } from "@/lib/r2";

export const runtime = "nodejs";

/** Logo de firma de correo — público, sin auth (para clientes de email externos). */
export async function GET() {
  try {
    const object = await getR2Object(MAIL_LOGO_R2_KEY);
    const body = await object.Body?.transformToByteArray();
    if (!body) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    return new NextResponse(Buffer.from(body), {
      headers: {
        "Content-Type": object.ContentType ?? "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.redirect(new URL("/logo-pime.png", process.env.NEXT_PUBLIC_SITE_URL ?? "https://pimepanama.com"));
  }
}
