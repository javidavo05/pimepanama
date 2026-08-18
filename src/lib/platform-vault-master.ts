import { createHash, timingSafeEqual } from "crypto";

/**
 * Contraseña madre de bóvedas Platform — solo modificable en código.
 * No usar .env: el digest verifica acceso; la clave AES vive en fragmentos locales.
 *
 * Para rotar la contraseña madre, recalcula el digest:
 * node -e "const c=require('crypto'); console.log(c.createHash('sha256').update('pime-suite-vault-pepper-v1'+process.argv[1]).digest('hex'))" 'TU_NUEVA_CLAVE'"
 * y reemplaza MASTER_PASSWORD_DIGEST abajo.
 */
const VAULT_PEPPER = "pime-suite-vault-pepper-v1";

const MASTER_PASSWORD_DIGEST =
  "c21ca4e9b75b9d2f00195892929467df3f8713d3e5c3d7096bdfdc81398685e1";

export function verifyMasterPassword(input: string): boolean {
  if (!input) return false;
  const digest = createHash("sha256").update(VAULT_PEPPER + input).digest();
  const expected = Buffer.from(MASTER_PASSWORD_DIGEST, "hex");
  if (digest.length !== expected.length) return false;
  return timingSafeEqual(digest, expected);
}

/** Clave AES-256 derivada en código (independiente de la contraseña de acceso). */
export function getVaultAesKey(): Buffer {
  const material = ["pime", "-platform", "-vault", "-aes", "-v1"].join("");
  return createHash("sha256").update(material).digest();
}
