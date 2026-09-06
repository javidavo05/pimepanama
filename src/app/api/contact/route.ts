import { NextResponse } from "next/server";
import type { Lead } from "@prisma/client";
import { getAdminNotificationEmail, getCustomerThankYouEmail } from "@/lib/email-templates";
import { sendEmail } from "@/lib/email-service";
import { prisma } from "@/lib/prisma";
import { resolveOwnerUserId } from "@/lib/owner-user";
import { notifyUser } from "@/lib/notifications/notify";
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

/**
 * Guarda el contacto como Lead en el CRM. Esto es lo único que NO puede
 * perderse: los correos y los avisos son secundarios y van después.
 * Si ya existe un lead con ese correo, se le anexa el mensaje nuevo en vez de
 * duplicar la ficha.
 */
async function persistLead(data: ContactPayload): Promise<{ lead: Lead; repeat: boolean }> {
  const userId = await resolveOwnerUserId();
  const stamp = new Date().toLocaleString("es-PA", { timeZone: "America/Panama" });
  const entry = `[${stamp}] Formulario web (${data.locale}):\n${data.message}`;

  const existing = await prisma.lead.findFirst({
    where: { userId, email: { equals: data.email, mode: "insensitive" } },
    orderBy: { updatedAt: "desc" },
  });

  if (existing) {
    const lead = await prisma.lead.update({
      where: { id: existing.id },
      data: {
        notes: [existing.notes, entry].filter(Boolean).join("\n\n"),
        company: existing.company ?? (data.company || null),
        phone: existing.phone ?? (data.phone || null),
        // Un lead dado por perdido que vuelve a escribir es una oportunidad viva.
        status: existing.status === "PERDIDO" ? "NUEVO" : existing.status,
      },
    });
    return { lead, repeat: true };
  }

  const lead = await prisma.lead.create({
    data: {
      userId,
      name: data.name,
      email: data.email,
      company: data.company || null,
      phone: data.phone || null,
      source: "WEB",
      status: "NUEVO",
      notes: entry,
    },
  });
  return { lead, repeat: false };
}

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
    const saved = await persistLead(payload);
    lead = saved.lead;
    repeat = saved.repeat;
  } catch (err) {
    // Sin CRM seguimos: el correo todavía puede salvar el contacto.
    console.error("[contact] NO SE PUDO GUARDAR EL LEAD", { email: payload.email, err });
  }

  const leadUrl = lead ? `${getSiteUrl()}/empresa/leads/${lead.id}` : undefined;

  // ── 2. Avisos y correos, cada uno aislado ─────────────────────────────────
  const results = await Promise.allSettled([
    // Campana del panel + push al PWA
    lead
      ? notifyUser({
          userId: lead.userId,
          title: repeat ? `${payload.name} volvió a escribir` : `Nuevo lead: ${payload.name}`,
          body: `${payload.company ? `${payload.company} · ` : ""}${payload.message}`,
          link: `/empresa/leads/${lead.id}`,
          tag: `lead-${lead.id}`,
        })
      : Promise.reject(new Error("sin lead que notificar")),

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

  const [notified, adminMail, customerMail] = results;
  const channels = {
    lead: Boolean(lead),
    inApp: notified.status === "fulfilled",
    adminEmail: adminMail.status === "fulfilled",
    customerEmail: customerMail.status === "fulfilled",
  };

  results.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(`[contact] canal ${["aviso", "correo-admin", "correo-cliente"][i]} falló`, r.reason);
    }
  });

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
