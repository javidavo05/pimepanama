import crypto from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

function getKey(): Buffer {
  const hex = process.env.MAIL_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) throw new Error("MAIL_ENCRYPTION_KEY must be 32 bytes hex");
  return Buffer.from(hex, "hex");
}

export function encryptPassword(plain: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

export function decryptPassword(stored: string): string {
  const key = getKey();
  const [ivHex, tagHex, encHex] = stored.split(":");
  if (!ivHex || !tagHex || !encHex) throw new Error("Invalid encrypted format");
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const enc = Buffer.from(encHex, "hex");
  if (tag.length !== TAG_LEN) throw new Error("Invalid auth tag");
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(enc) + decipher.final("utf8");
}
