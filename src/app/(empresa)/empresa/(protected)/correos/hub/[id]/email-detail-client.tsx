"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EmailReplyModal } from "@/components/empresa/mail/email-reply-modal";
import { EmailThreadPanel } from "@/components/empresa/mail/email-thread-panel";
import { EmailBodyRenderer } from "@/components/empresa/mail/email-body-renderer";
import { MailDeliveryStatusBadge } from "@/components/empresa/mail/mail-delivery-status";
import type { ComposeAccount, CompanyPreview } from "@/components/empresa/mail/email-compose-modal";
import { formatEmailReceivedAt } from "@/lib/format-datetime";
import { resolveReplyRecipient } from "@/lib/mail/reply-recipient";

const TAG_COLORS: Record<string, string> = {
  urgent: "bg-danger/15 text-danger border-danger/20",
  invoice: "bg-warn/15 text-warn border-warn/20",
  payment: "bg-ok/15 text-ok border-ok/20",
  "follow-up": "bg-info/15 text-info border-info/20",
  support: "bg-grape/15 text-grape border-grape/20",
  spam: "bg-fill-3 text-fg-dim border-line-mid",
  general: "bg-fill text-fg-dim border-line",
};

interface EmailData {
  id: string;
  subject: string;
  folder: string;
  fromName: string | null;
  fromEmail: string;
  toAddresses: string[];
  ccAddresses: string[];
  bodyText: string | null;
  receivedAt: string;
  isStarred: boolean;
  aiSummary: string | null;
  aiTags: string[];
  deliveryStatus?: string | null;
  resendId?: string | null;
  bounceReason?: string | null;
  account: { id: string; label: string; smtpHost: string | null; username: string };
  attachments: { id: string; filename: string; contentType: string; size: number }[];
}

interface EmailDetailClientProps {
  email: EmailData;
  accounts: ComposeAccount[];
  company: CompanyPreview | null;
}

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export function EmailDetailClient({ email, accounts, company }: EmailDetailClientProps) {
  const router = useRouter();
  const [replyOpen, setReplyOpen] = useState(false);
  const [threadRefreshKey, setThreadRefreshKey] = useState(0);
  const [bodyText, setBodyText] = useState(email.bodyText);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{ aiSummary: string | null; aiTags: string[]; urgency?: string; suggestedAction?: string; costUSD?: number } | null>(
    email.aiSummary ? { aiSummary: email.aiSummary, aiTags: email.aiTags } : null
  );
  const [isStarred, setIsStarred] = useState(email.isStarred);

  async function handleAnalyze() {
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/empresa/mail/inbox/${email.id}/analyze`, { method: "POST" });
      if (!res.ok) return;
      const data = await res.json();
      setAnalysis({ aiSummary: data.aiSummary, aiTags: data.aiTags, urgency: data.urgency, suggestedAction: data.suggestedAction, costUSD: data.costUSD });
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleStar() {
    const next = !isStarred;
    setIsStarred(next);
    await fetch(`/api/empresa/mail/inbox/${email.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isStarred: next }),
    });
  }

  const tags = analysis?.aiTags ?? email.aiTags;
  const summary = analysis?.aiSummary ?? email.aiSummary;
  const replyToEmail = resolveReplyRecipient(
    { folder: email.folder, fromEmail: email.fromEmail, toAddresses: email.toAddresses },
    email.account.username
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-panel border border-line rounded-xl p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h1 className="text-fg text-lg font-semibold leading-snug">{email.subject}</h1>
            {email.folder === "SENT" && (
              <div className="mt-2">
                <MailDeliveryStatusBadge
                  email={{
                    folder: email.folder,
                    deliveryStatus: email.deliveryStatus,
                    resendId: email.resendId,
                    bounceReason: email.bounceReason,
                  }}
                  size="md"
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-none">
            <button onClick={handleStar} className={`p-1.5 rounded-lg transition-colors ${isStarred ? "text-warn" : "text-fg-faint hover:text-warn"}`}>
              <svg className="w-4 h-4" fill={isStarred ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            </button>
            {email.account.id && (
              <button onClick={() => setReplyOpen(true)}
                className="px-3 py-1.5 bg-brand/10 border border-brand/20 text-brand-fg text-xs font-medium rounded-lg hover:bg-brand/15 transition-all inline-flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                Responder
              </button>
            )}
          </div>
        </div>

        <div className="space-y-1.5 text-sm">
          <div className="flex gap-2">
            <span className="text-fg-dim w-8 shrink-0">De</span>
            <span className="text-fg-soft">{email.fromName ? `${email.fromName} <${email.fromEmail}>` : email.fromEmail}</span>
          </div>
          {email.toAddresses.length > 0 && (
            <div className="flex gap-2">
              <span className="text-fg-dim w-8 shrink-0">Para</span>
              <span className="text-fg-dim">{email.toAddresses.join(", ")}</span>
            </div>
          )}
          {email.ccAddresses.length > 0 && (
            <div className="flex gap-2">
              <span className="text-fg-dim w-8 shrink-0">CC</span>
              <span className="text-fg-dim">{email.ccAddresses.join(", ")}</span>
            </div>
          )}
          <div className="flex gap-2">
            <span className="text-fg-dim w-8 shrink-0">Fecha</span>
            <span className="text-fg-faint text-xs">{formatEmailReceivedAt(email.receivedAt)}</span>
          </div>
        </div>

        {tags.length > 0 && (
          <div className="flex gap-1.5 mt-4 flex-wrap">
            {tags.map((t) => (
              <span key={t} className={`px-2 py-0.5 text-xs rounded border ${TAG_COLORS[t] ?? TAG_COLORS.general}`}>{t}</span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-5 items-start">
        <div className="space-y-5 min-w-0">
          <EmailThreadPanel emailId={email.id} refreshKey={threadRefreshKey} />

          {/* Body — full width of main column */}
          <div className="bg-panel border border-line rounded-xl p-5 min-w-0">
            <EmailBodyRenderer
              body={bodyText}
              emailId={email.id}
              onBodyUpdated={setBodyText}
            />
          </div>

          {/* Attachments */}
          {email.attachments.length > 0 && (
            <div className="bg-panel border border-line rounded-xl p-5">
              <h3 className="text-fg-dim text-xs uppercase tracking-widest font-medium mb-3">Adjuntos ({email.attachments.length})</h3>
              <div className="space-y-2">
                {email.attachments.map((att) => (
                  <a key={att.id} href={`/api/empresa/mail/inbox/${email.id}/attachments/${att.id}`}
                    className="flex items-center gap-3 px-3 py-2.5 bg-fill border border-line rounded-lg hover:bg-fill-2 transition-all group">
                    <div className="w-8 h-8 bg-brand/10 border border-brand/20 rounded-lg flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-brand-fg" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-fg-soft text-sm truncate group-hover:text-fg transition-colors">{att.filename}</p>
                      <p className="text-fg-dim text-xs">{fmtBytes(att.size)} · {att.contentType}</p>
                    </div>
                    <svg className="w-4 h-4 text-fg-faint group-hover:text-fg-faint transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* AI Panel — narrow sidebar */}
        <div className="space-y-4 xl:sticky xl:top-4">
        <div className="bg-panel border border-line rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-fg-dim text-xs uppercase tracking-widest font-medium">Análisis IA</h3>
            <button onClick={handleAnalyze} disabled={analyzing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-iris/10 border border-iris/25 text-iris-fg text-xs font-medium hover:bg-iris/15 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
              {analyzing ? (
                <><span className="w-1.5 h-1.5 rounded-full bg-iris animate-pulse" /> Analizando...</>
              ) : (
                <>✦ {summary ? "Re-analizar" : "Analizar"}</>
              )}
            </button>
          </div>

          {summary ? (
            <div className="space-y-3">
              <div>
                <p className="text-fg-dim text-[10px] uppercase tracking-widest mb-1">Resumen</p>
                <p className="text-fg-mute text-sm leading-relaxed">{summary}</p>
              </div>
              {analysis?.urgency && (
                <div>
                  <p className="text-fg-dim text-[10px] uppercase tracking-widest mb-1">Urgencia</p>
                  <span className={`text-xs px-2 py-0.5 rounded border ${analysis.urgency === "high" ? "bg-danger/15 text-danger border-danger/20" : analysis.urgency === "medium" ? "bg-warn/15 text-warn border-warn/20" : "bg-fill text-fg-dim border-line"}`}>
                    {analysis.urgency === "high" ? "Alta" : analysis.urgency === "medium" ? "Media" : "Baja"}
                  </span>
                </div>
              )}
              {analysis?.suggestedAction && (
                <div>
                  <p className="text-fg-dim text-[10px] uppercase tracking-widest mb-1">Acción sugerida</p>
                  <p className="text-fg-dim text-xs">{analysis.suggestedAction}</p>
                </div>
              )}
              {analysis?.costUSD != null && (
                <p className="text-fg-faint text-[10px] font-mono">${analysis.costUSD.toFixed(4)}</p>
              )}
            </div>
          ) : (
            <p className="text-fg-faint text-sm">Haz clic en &quot;Analizar&quot; para que la IA clasifique y resuma este correo.</p>
          )}
        </div>

        <div className="bg-panel border border-line rounded-xl p-4 space-y-2">
          <p className="text-fg-dim text-[10px] uppercase tracking-widest">Cuenta</p>
          <p className="text-fg-dim text-sm">{email.account.label}</p>
          <p className="text-fg-faint text-xs">Envío saliente vía Resend · recepción por IMAP</p>
        </div>
        </div>
      </div>

      {replyOpen && (
        <EmailReplyModal
          emailId={email.id}
          toEmail={replyToEmail}
          subject={email.subject}
          originalBody={email.bodyText ?? ""}
          hasSmtp={true}
          accountId={email.account.id}
          accounts={accounts}
          company={company}
          onClose={() => {
            setReplyOpen(false);
            setThreadRefreshKey((k) => k + 1);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
