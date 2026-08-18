/**
 * Sube el logo permanente de firma de correo a R2 y actualiza CompanyConfig.logoUrl.
 * Uso: npx tsx scripts/upload-mail-logo.ts [ruta-al-png]
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { prisma } from "../src/lib/prisma";
import { putR2Object } from "../src/lib/r2";
import { MAIL_LOGO_R2_KEY } from "../src/lib/company-logo";

const defaultPath = "/Users/javiervallejo/Documents/PIME/logo pime.png";
const filePath = resolve(process.argv[2] ?? defaultPath);

async function main() {
  const buffer = readFileSync(filePath);
  console.log(`Subiendo ${filePath} → ${MAIL_LOGO_R2_KEY} (${buffer.length} bytes)`);

  await putR2Object(MAIL_LOGO_R2_KEY, buffer, "image/png");
  const publicUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://pimepanama.com"}/api/branding/logo`;
  console.log(`R2 key: ${MAIL_LOGO_R2_KEY}`);
  console.log(`URL en correos: ${publicUrl}`);

  const updated = await prisma.companyConfig.updateMany({
    data: { logoUrl: publicUrl },
  });
  console.log(`CompanyConfig actualizado: ${updated.count} fila(s)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
