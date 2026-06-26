import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { decryptPassword } from "@/lib/mail/crypto";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

function buildSignature(config: { name?: string | null; email?: string | null; phone?: string | null; website?: string | null } | null, senderName: string) {
  const name = config?.name ?? senderName;
  const lines = [
    config?.phone ? `<span>${config.phone}</span>` : "",
    config?.email ? `<a href="mailto:${config.email}" style="color:#1AA7F0;text-decoration:none;">${config.email}</a>` : "",
    config?.website ? `<a href="${config.website}" style="color:#1AA7F0;text-decoration:none;">${config.website.replace(/^https?:\/\//, "")}</a>` : "",
  ].filter(Boolean).join(" &nbsp;·&nbsp; ");

  return `
<br><br>
<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;font-size:13px;color:#555;border-top:1px solid #eee;padding-top:12px;margin-top:12px;">
  <tr>
    <td style="padding-right:14px;border-right:3px solid #1AA7F0;vertical-align:middle;">
      <img src="https://pimepanama.com/logo-pime.png" alt="Pime" width="56" style="display:block;" />
    </td>
    <td style="padding-left:14px;vertical-align:middle;line-height:1.6;">
      <strong style="color:#111;font-size:14px;">${name}</strong><br>
      ${lines ? `<span style="color:#888;font-size:12px;">${lines}</span>` : ""}
    </td>
  </tr>
</table>`;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireEmpresaUser(request);
    const { id } = await params;

    const [email, config] = await Promise.all([
      prisma.inboxEmail.findFirst({
        where: { id, userId: user.id },
        include: { account: true },
      }),
      prisma.companyConfig.findFirst({ where: { id: user.configId ?? "" } }),
    ]);

    if (!email) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const account = email.account;
    if (!account.smtpHost) {
      return NextResponse.json({ error: "SMTP no configurado para esta cuenta" }, { status: 400 });
    }

    const { body, subject } = await request.json() as { body: string; subject?: string };
    if (!body?.trim()) return NextResponse.json({ error: "body requerido" }, { status: 400 });

    const password = decryptPassword(account.passwordEnc);
    const transporter = nodemailer.createTransport({
      host: account.smtpHost,
      port: account.smtpPort ?? 587,
      secure: account.smtpTls && (account.smtpPort ?? 587) === 465,
      auth: { user: account.username, pass: password },
      requireTLS: account.smtpTls,
    });

    const replySubject = subject ?? (email.subject?.startsWith("Re:") ? email.subject : `Re: ${email.subject ?? ""}`);
    const signature = buildSignature(config, account.username);

    const htmlBody = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#222;">${body.replace(/\n/g, "<br>")}</div>${signature}`;
    const textBody = `${body}\n\n-- \n${config?.name ?? account.username}${config?.phone ? "\n" + config.phone : ""}${config?.email ? "\n" + config.email : ""}${config?.website ? "\n" + config.website : ""}`;

    await transporter.sendMail({
      from: `"${config?.name ?? account.username}" <${account.username}>`,
      to: email.fromEmail,
      subject: replySubject,
      text: textBody,
      html: htmlBody,
      inReplyTo: email.messageId ?? undefined,
      references: email.messageId ?? undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: err instanceof Error ? err.message : "Send error" }, { status: 500 });
  }
}
