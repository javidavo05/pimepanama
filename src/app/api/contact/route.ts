import { NextResponse, after } from "next/server";
import type { Lead } from "@prisma/client";
import { getAdminNotificationEmail, getCustomerThankYouEmail } from "@/lib/email-templates";
import { sendEmail } from "@/lib/email-service";
import { resolveOwnerUserId } from "@/lib/owner-user";
import { persistLead } from "@/lib/leads/persist";
import { triageLead } from "@/lib/leads/triage";
import { getSiteUrl } from "@/lib/site-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX = { name: 120, email: 160, company: 160, phone: 40, message: 5000 };

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** Destinatarios del aviso interno. Configurable, pero nunca vacío. */
function notifyEmails(): string[] {
  const raw = process.env.CONTACT_NOTIFY_EMAILS?.split(",").map((e) => e.trim()).filter(Boolean);
  if (raw?.length) return raw;
  return ["javier@pimepanama.com", "info@pimepanama.com"];
}

type ContactPayload = {
  name: string;
  email: string;
  company: string;
  phone: string;
  message: string;
  locale: "en" | "es";
};

export async function POST(request: Request) {
  let payload: ContactPayload;

  try {
    const body = await request.json();
    payload = {
      name: clean(body.name, MAX.name),
      email: clean(body.email, MAX.email).toLowerCase(),
      company: clean(body.company, MAX.company),
      phone: clean(body.phone, MAX.phone),
      message: clean(body.message, MAX.message),
      locale: body.locale === "en" ? "en" : "es",
    };
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  if (!payload.name || !payload.email || !payload.message) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(payload.email)) {
    return NextResponse.json({ error: "Correo inválido" }, { status: 400 });
  }

  // ── 1. CRM (lo crítico) ───────────────────────────────────────────────────
  let lead: Lead | null = null;
  let repeat = false;
  try {
    const saved = await persistLead({ ...payload, userId: await resolveOwnerUserId() });
    lead = saved.lead;
    repeat = saved.repeat;
  } catch (err) {
    // Sin CRM seguimos: el correo todavía puede salvar el contacto.
    console.error("[contact] NO SE PUDO GUARDAR EL LEAD", { email: payload.email, err });
  }

  const leadUrl = lead ? `${getSiteUrl()}/empresa/leads/${lead.id}` : undefined;

  // ── 2. Correos, cada uno aislado ──────────────────────────────────────────
  // Van en la ruta crítica a propósito: el correo es el canal que Javier tiene
  // garantizado, y tarda cientos de milisegundos, no segundos.
  const results = await Promise.allSettled([
    // Aviso por correo a Javier (+ info@)
    (async () => {
      const admin = getAdminNotificationEmail({ ...payload, leadUrl });
      return sendEmail({ to: notifyEmails(), subject: admin.subject, html: admin.html });
    })(),

    // Acuse de recibo al cliente
    (async () => {
      const thanks = getCustomerThankYouEmail(payload);
      return sendEmail({ to: payload.email, subject: thanks.subject, html: thanks.html });
    })(),
  ]);

  const [adminMail, customerMail] = results;
  const channels = {
    lead: Boolean(lead),
    adminEmail: adminMail.status === "fulfilled",
    customerEmail: customerMail.status === "fulfilled",
  };

  results.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(`[contact] canal ${["correo-admin", "correo-cliente"][i]} falló`, r.reason);
    }
  });

  // ── 3. Triaje con IA, ya con la respuesta enviada ─────────────────────────
  // Clasificar cuesta un par de segundos. El visitante no tiene por qué
  // esperarlos: el lead ya está guardado y los correos ya salieron, así que
  // esto corre después de cerrar la respuesta y solo ajusta la prioridad y
  // dispara la campana y el push.
  if (lead) {
    const saved = lead;
    after(async () => {
      try {
        await triageLead(saved, { repeat });
      } catch (err) {
        console.error("[contact] el triaje posterior falló", saved.id, err);
      }
    });
  }

  // El contacto se considera recibido si quedó registrado en algún lado que
  // Javier revise: el CRM o el correo. Si fallaron los dos, el cliente tiene
  // que enterarse para poder escribir por otro canal.
  if (!channels.lead && !channels.adminEmail) {
    console.error("[contact] CONTACTO PERDIDO — ni CRM ni correo", payload);
    return NextResponse.json(
      { error: "No pudimos registrar su solicitud. Escríbanos a javier@pimepanama.com." },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true, leadId: lead?.id ?? null, channels }, { status: 200 });
}
