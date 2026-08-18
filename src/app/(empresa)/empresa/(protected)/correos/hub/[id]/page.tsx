import Link from "next/link";
import { notFound } from "next/navigation";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { EmailDetailClient } from "./email-detail-client";

import { ensureMailSignaturesSeeded } from "@/lib/mail/signature-bootstrap";

export const dynamic = "force-dynamic";

export default async function EmailDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getEmpresaUser();
  await ensureMailSignaturesSeeded(user.id);
  const { id } = await params;

  const [email, accounts, company] = await Promise.all([
    prisma.inboxEmail.findFirst({
      where: { id, userId: user.id },
      include: {
        attachments: true,
        account: {
          select: {
            id: true, label: true, smtpHost: true, username: true,
            fromName: true, signatureName: true, signatureTitle: true,
            signatureEnabled: true, signatureHtml: true,
          },
        },
      },
    }),
    prisma.mailAccount.findMany({
      where: { userId: user.id, active: true },
      select: {
        id: true, label: true, username: true, smtpHost: true,
        fromName: true, signatureName: true, signatureTitle: true,
        signatureEnabled: true, signatureHtml: true,
      },
    }),
    user.configId
      ? prisma.companyConfig.findFirst({
          where: { id: user.configId },
          select: { name: true, email: true, phone: true, website: true, logoUrl: true },
        })
      : Promise.resolve(null),
  ]);
  if (!email) notFound();

  // Mark as read
  if (!email.isRead) {
    await prisma.inboxEmail.update({ where: { id }, data: { isRead: true } });
  }

  return (
    <div className="w-full space-y-0">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/empresa/correos/hub" className="text-white/55 text-sm hover:text-white/60 transition-colors">
          ← Bandeja
        </Link>
        <span className="text-white/50">/</span>
        <span className="text-white/60 text-sm truncate">{email.subject ?? "(Sin asunto)"}</span>
      </div>

      <EmailDetailClient
        email={{
        id: email.id,
        subject: email.subject ?? "(Sin asunto)",
        folder: email.folder,
        fromName: email.fromName,
        fromEmail: email.fromEmail,
        toAddresses: email.toAddresses,
        ccAddresses: email.ccAddresses,
        bodyText: email.bodyText,
        receivedAt: email.receivedAt.toISOString(),
        isStarred: email.isStarred,
        aiSummary: email.aiSummary,
        aiTags: email.aiTags,
        deliveryStatus: email.deliveryStatus,
        resendId: email.resendId,
        bounceReason: email.bounceReason,
        account: email.account,
        attachments: email.attachments.map((a) => ({
          id: a.id, filename: a.filename, contentType: a.contentType, size: a.size,
        })),
      }}
        accounts={accounts}
        company={company}
      />
    </div>
  );
}
