/** Resolve who should receive a reply based on folder and account ownership. */
export function resolveReplyRecipient(
  email: { folder: string; fromEmail: string; toAddresses: string[] },
  accountUsername: string,
  explicitTo?: string
): string {
  if (explicitTo?.trim()) return explicitTo.trim();

  const own = accountUsername.trim().toLowerCase();
  const from = email.fromEmail.trim().toLowerCase();

  if ((email.folder === "SENT" || from === own) && email.toAddresses[0]) {
    return email.toAddresses[0];
  }

  return email.fromEmail;
}
