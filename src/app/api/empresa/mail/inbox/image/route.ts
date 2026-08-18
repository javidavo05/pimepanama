import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import {
  EMAIL_IMAGE_MAX_BYTES,
  getImageFetchHeaders,
  isSafeExternalImageUrl,
} from "@/lib/mail/email-image-proxy";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireEmpresaUser(request);

    const { searchParams } = new URL(request.url);
    const rawUrl = searchParams.get("url");
    if (!rawUrl) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    let target: URL;
    try {
      target = new URL(rawUrl);
    } catch {
      return NextResponse.json({ error: "Invalid url" }, { status: 400 });
    }

    if (!isSafeExternalImageUrl(target.toString())) {
      return NextResponse.json({ error: "URL not allowed" }, { status: 400 });
    }

    const upstream = await fetch(target.toString(), {
      headers: getImageFetchHeaders(target),
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });

    if (!upstream.ok) {
      return new NextResponse(null, { status: upstream.status === 404 ? 404 : 502 });
    }

    const contentType = upstream.headers.get("content-type") ?? "image/*";
    if (!contentType.startsWith("image/") && contentType !== "application/octet-stream") {
      return NextResponse.json({ error: "Not an image" }, { status: 415 });
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    if (buffer.byteLength > EMAIL_IMAGE_MAX_BYTES) {
      return NextResponse.json({ error: "Image too large" }, { status: 413 });
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType.split(";")[0].trim(),
        "Cache-Control": "private, max-age=86400, stale-while-revalidate=604800",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Mail image proxy error:", err);
    return NextResponse.json({ error: "Proxy error" }, { status: 500 });
  }
}
