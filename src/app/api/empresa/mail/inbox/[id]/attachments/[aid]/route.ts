import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const runtime = "nodejs";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

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

    const url = await getSignedUrl(
      r2,
      new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: att.r2Key,
        ResponseContentDisposition: `attachment; filename="${att.filename}"`,
      }),
      { expiresIn: 300 }
    );

    return NextResponse.redirect(url);
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
