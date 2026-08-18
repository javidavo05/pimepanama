"use client";

import { EmailComposeModal, type ComposeAccount, type CompanyPreview } from "./email-compose-modal";

interface EmailReplyModalProps {
  emailId: string;
  toEmail: string;
  subject: string;
  originalBody?: string;
  hasSmtp: boolean;
  accountId: string;
  accounts: ComposeAccount[];
  company: CompanyPreview | null;
  onClose: () => void;
}

export function EmailReplyModal({
  emailId,
  toEmail,
  subject,
  originalBody,
  hasSmtp,
  accountId,
  accounts,
  company,
  onClose,
}: EmailReplyModalProps) {
  if (!hasSmtp) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-[#0d0d18] border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full text-center">
          <p className="text-white/60 text-sm mb-4">
            Para responder correos, configura el servidor SMTP en la cuenta de correo.
          </p>
          <button type="button" onClick={onClose} className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.09] text-white/70 text-sm rounded-lg transition-all">
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  const replySubject = subject.startsWith("Re:") ? subject : `Re: ${subject}`;

  return (
    <EmailComposeModal
      open
      onClose={onClose}
      accounts={accounts}
      company={company}
      mode="reply"
      originalBody={originalBody}
      initial={{
        to: toEmail,
        subject: replySubject,
        replyToEmailId: emailId,
        accountId,
      }}
    />
  );
}
