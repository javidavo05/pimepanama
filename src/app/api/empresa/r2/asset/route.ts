import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { extractR2Key, getR2Object } from "@/lib/r2";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    const keyParam = new URL(request.url).searchParams.get("key");
    if (!keyParam) {
      return NextResponse.json({ error: "key required" }, { status: 400 });
    }

    const key = extractR2Key(keyParam);
    if (!key) {
      return NextResponse.json({ error: "invalid key" }, { status: 400 });
    }

    const allowed =
      key.startsWith(`branding/${user.id}/`) ||
      key.startsWith("cotizaciones/") ||
      key.startsWith("mail/");

    if (!allowed) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const object = await getR2Object(key);
    const body = await object.Body?.transformToByteArray();
    if (!body) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    return new NextResponse(Buffer.from(body), {
      headers: {
        "Content-Type": object.ContentType ?? "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error loading asset" }, { status: 500 });
  }
}
