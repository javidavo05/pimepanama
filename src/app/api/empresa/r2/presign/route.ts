import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { generatePresignedUploadUrl, r2PublicUrl } from "@/lib/r2";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    const {
      filename,
      contentType = "application/pdf",
      folder,
    } = await request.json();
    if (!filename) {
      return NextResponse.json({ error: "filename required" }, { status: 400 });
    }

    const ext = filename.split(".").pop() ?? "pdf";
    const key =
      folder === "branding"
        ? `branding/${user.id}/logo.${ext}`
        : `${folder ?? "cotizaciones"}/${randomUUID()}.${ext}`;

    const url = await generatePresignedUploadUrl(key, contentType);
    return NextResponse.json({ url, key, publicUrl: r2PublicUrl(key) });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error generating presigned URL" }, { status: 500 });
  }
}
