import { createHash, randomBytes } from "crypto";

export type SigningRole = "CLIENT" | "COMPANY";

export function generateSigningToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSigningToken(token: string, secret: string): string {
  return createHash("sha256").update(`${secret}:${token}`).digest("hex");
}
