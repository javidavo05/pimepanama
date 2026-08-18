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

    if (!att.r2Key) return NextResponse.json({ error: "File not stored" }, { status: 404 });

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
