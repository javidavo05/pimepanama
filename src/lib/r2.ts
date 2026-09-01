import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID?.trim() || "424b9d75b07a19b5f754d6445667b7b4";
export const R2_BUCKET = process.env.R2_BUCKET_NAME?.trim() || "pime-suite";
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL?.trim() || `https://pub-${R2_ACCOUNT_ID}.r2.dev`;

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  },
});

export function assertR2Configured(): void {
  if (
    !R2_BUCKET ||
    !R2_ACCOUNT_ID ||
    !process.env.R2_ACCESS_KEY_ID?.trim() ||
    !process.env.R2_SECRET_ACCESS_KEY?.trim()
  ) {
    throw new Error(
      "R2 no configurado en el servidor. Agrega R2_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID y R2_SECRET_ACCESS_KEY en Vercel."
    );
  }
}

export async function putR2Object(key: string, body: Buffer, contentType: string): Promise<void> {
  assertR2Configured();
  await r2.send(
    new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, Body: body, ContentType: contentType })
  );
}

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

/**
 * URL temporal de descarga. Los objetos privados (el audio de una reunión) no se
 * sirven por la URL pública del bucket: se firma un enlace corto para quien ya
 * demostró tener acceso a la fila que lo referencia.
 */
export async function generatePresignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  assertR2Configured();
  const cmd = new GetObjectCommand({ Bucket: R2_BUCKET, Key: key });
  return getSignedUrl(r2, cmd, { expiresIn });
}

export async function getR2Object(key: string) {
  return r2.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }));
}
