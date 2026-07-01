#!/usr/bin/env node
/**
 * Sube el logo de la empresa a R2 y actualiza CompanyConfig.logoUrl.
 *
 * Uso:
 *   npm run upload:logo
 *   node scripts/upload-company-logo.cjs "/ruta/al/logo.png"
 */
const fs = require("node:fs");
const path = require("node:path");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { PrismaClient } = require("@prisma/client");
const { loadProjectEnv } = require("./load-env.cjs");

loadProjectEnv();

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? "424b9d75b07a19b5f754d6445667b7b4";
const R2_BUCKET = process.env.R2_BUCKET_NAME ?? "pime-suite";
const R2_PUBLIC_URL =
  process.env.R2_PUBLIC_URL ?? `https://pub-${ACCOUNT_ID}.r2.dev`;

const { S3Client } = require("@aws-sdk/client-s3");
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  },
});

async function main() {
  const dbUrl = process.env.DATABASE_URL ?? "";
  if (!dbUrl.startsWith("postgres")) {
    console.error(
      "\nDATABASE_URL no válida.\n" +
        "En .env.local define DATABASE_URL (postgresql://...) o SUPABASE_DB_PASSWORD.\n"
    );
    process.exit(1);
  }

  const filePath =
    process.argv[2] ??
    path.join(process.env.HOME ?? "", "Documents/PIME/logo pime.png");

  if (!fs.existsSync(filePath)) {
    console.error(`Archivo no encontrado: ${filePath}`);
    process.exit(1);
  }

  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).slice(1).toLowerCase() || "png";
  const contentType =
    ext === "svg"
      ? "image/svg+xml"
      : ext === "jpg" || ext === "jpeg"
        ? "image/jpeg"
        : "image/png";

  const prisma = new PrismaClient();
  try {
    const user = await prisma.empresaUser.findFirst({
      orderBy: { createdAt: "asc" },
      include: { config: true },
    });
    if (!user) {
      throw new Error("No hay usuario empresa en la base de datos.");
    }

    const key = `branding/${user.id}/logo.${ext}`;
    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );

    const publicUrl = `${R2_PUBLIC_URL}/${key}`;

    if (user.configId) {
      await prisma.companyConfig.update({
        where: { id: user.configId },
        data: { logoUrl: publicUrl },
      });
    } else {
      const config = await prisma.companyConfig.create({
        data: { name: "Pime Panamá", logoUrl: publicUrl },
      });
      await prisma.empresaUser.update({
        where: { id: user.id },
        data: { configId: config.id },
      });
    }

    console.log("✓ Logo subido a R2:", publicUrl);
    console.log("✓ CompanyConfig.logoUrl actualizado");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
