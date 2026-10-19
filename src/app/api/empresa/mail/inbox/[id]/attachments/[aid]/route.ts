import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { assertR2Configured, R2_BUCKET, r2 } from "@/lib/r2";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; aid: string }> }
) {
  try {
    const user = await requireEmpresaUser(request);
    const { id, aid } = await params;

    const email = await prisma.inboxEmail.findFirst({ where: { id, userId: user.id } });
    if (!email) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const att = await prisma.emailAttachment.findFirst({ where: { id: aid, emailId: id } });
    if (!att) return NextResponse.json({ error: "Attachment not found" }, { status: 404 });

    if (!att.r2Key) {
      // Adjuntos de correos enviados antes de que se guardara copia (hasta 2026-10-19): solo existe el nombre.
      const nombre = att.filename.replace(/[<>&"]/g, "");
      return new NextResponse(
        `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Adjunto no disponible</title><body style="font-family:system-ui,sans-serif;max-width:560px;margin:48px auto;padding:0 16px;color:#0B1D3A"><h1 style="font-size:20px">Este adjunto no tiene copia guardada</h1><p style="color:#4A5A78;line-height:1.6">«${nombre}» se envió antes de que Pime guardara copia de los adjuntos enviados. La persona que lo recibió sí lo tiene; desde aquí ya no se puede abrir.</p><p><a href="javascript:history.back()" style="color:#1F5BFF">Volver al correo</a></p></body>`,
        { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } },
      );
    }

    assertR2Configured();

    const url = await getSignedUrl(
      r2,
      new GetObjectCommand({
        Bucket: R2_BUCKET,
        Key: att.r2Key,
        ResponseContentDisposition: `attachment; filename="${att.filename}"`,
      }),
      { expiresIn: 300 }
    );

    return NextResponse.redirect(url);
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error" },
      { status: 500 }
    );
  }
}
