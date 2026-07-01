import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? "424b9d75b07a19b5f754d6445667b7b4";
export const R2_BUCKET = process.env.R2_BUCKET_NAME ?? "pime-suite";
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL ?? `https://pub-${ACCOUNT_ID}.r2.dev`;

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  },
});

export async function generatePresignedUploadUrl(key: string, contentType: string): Promise<string> {
  const cmd = new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, ContentType: contentType });
  return getSignedUrl(r2, cmd, { expiresIn: 300 });
}

export async function deleteR2Object(key: string): Promise<void> {
  await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
}

export function r2PublicUrl(key: string): string {
  return `${R2_PUBLIC_URL}/${key}`;
}

export function extractR2Key(urlOrKey: string): string | null {
  const trimmed = urlOrKey.trim();
  if (!trimmed) return null;
  if (!trimmed.includes("://")) return trimmed;
  try {
    return new URL(trimmed).pathname.replace(/^\//, "");
  } catch {
    return null;
  }
}

export async function getR2Object(key: string) {
  return r2.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }));
}
