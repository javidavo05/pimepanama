import { Resend } from "resend";

let client: Resend | null = null;

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function getResendClient(): Resend {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    throw new Error("RESEND_API_KEY no configurada — añádela en Vercel o .env.local");
  }
  if (!client) {
    client = new Resend(key);
  }
  return client;
}

export function assertResendConfigured(): void {
  if (!isResendConfigured()) {
    throw new Error("Resend no está configurado (RESEND_API_KEY)");
  }
  if (!process.env.RESEND_FROM?.trim()) {
    throw new Error("RESEND_FROM no configurado — usa un email de dominio verificado en Resend");
  }
}
