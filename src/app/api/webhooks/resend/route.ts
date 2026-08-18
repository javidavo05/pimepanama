import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type ResendWebhookEvent = {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from?: string;
    to?: string[];
    subject?: string;
    bounce?: { message?: string };
  };
};

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  const payload = await request.text();

  if (secret) {
    try {
      const wh = new Webhook(secret);
      wh.verify(payload, {
        "svix-id": request.headers.get("svix-id") ?? "",
        "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
        "svix-signature": request.headers.get("svix-signature") ?? "",
      });
    } catch {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }
  }

  let event: ResendWebhookEvent;
  try {
    event = JSON.parse(payload) as ResendWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const resendId = event.data?.email_id;
  if (!resendId) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const email = await prisma.inboxEmail.findFirst({
    where: { resendId },
  });

  if (!email) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const now = new Date(event.created_at || Date.now());

  switch (event.type) {
    case "email.sent":
      await prisma.inboxEmail.update({
        where: { id: email.id },
        data: { deliveryStatus: "SENT" },
      });
      break;
    case "email.delivered":
      await prisma.inboxEmail.update({
        where: { id: email.id },
        data: { deliveryStatus: "DELIVERED", deliveredAt: now },
      });
      break;
    case "email.opened":
      await prisma.inboxEmail.update({
        where: { id: email.id },
        data: { deliveryStatus: "OPENED", openedAt: now },
      });
      break;
    case "email.bounced":
      await prisma.inboxEmail.update({
        where: { id: email.id },
        data: {
          deliveryStatus: "BOUNCED",
          bouncedAt: now,
          bounceReason: event.data.bounce?.message ?? "Rebote",
        },
      });
      break;
    case "email.complained":
      await prisma.inboxEmail.update({
        where: { id: email.id },
        data: { deliveryStatus: "COMPLAINED" },
      });
      break;
    default:
      break;
  }

  return NextResponse.json({ ok: true });
}
