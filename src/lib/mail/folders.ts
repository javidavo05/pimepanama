export type CanonicalFolder = "INBOX" | "SENT" | "DRAFTS" | "SPAM" | "TRASH";

export const CANONICAL_FOLDERS: CanonicalFolder[] = [
  "INBOX", "SENT", "DRAFTS", "SPAM", "TRASH",
];

export const FOLDER_LABELS: Record<CanonicalFolder, string> = {
  INBOX: "Entrada",
  SENT: "Enviados",
  DRAFTS: "Borradores",
  SPAM: "Spam",
  TRASH: "Papelera",
};

export const FOLDER_ICONS: Record<CanonicalFolder, string> = {
  INBOX: "📥",
  SENT: "📤",
  DRAFTS: "📝",
  SPAM: "⚠️",
  TRASH: "🗑️",
};

/** URL slug → canonical folder */
const URL_TO_CANONICAL: Record<string, CanonicalFolder> = {
  inbox: "INBOX",
  sent: "SENT",
  drafts: "DRAFTS",
  spam: "SPAM",
  trash: "TRASH",
};

export function parseFolderParam(value?: string | null): CanonicalFolder {
  if (!value) return "INBOX";
  const key = value.toLowerCase();
  return URL_TO_CANONICAL[key] ?? (CANONICAL_FOLDERS.includes(value as CanonicalFolder) ? value as CanonicalFolder : "INBOX");
}

export function folderToUrlParam(folder: CanonicalFolder): string {
  return folder.toLowerCase();
}

/** IMAP path candidates per canonical folder (Gmail, Outlook, generic). */
export const FOLDER_IMAP_CANDIDATES: Record<CanonicalFolder, string[]> = {
  INBOX: ["INBOX"],
  SENT: ["Sent", "Sent Items", "Sent Messages", "[Gmail]/Sent Mail", "INBOX.Sent"],
  DRAFTS: ["Drafts", "[Gmail]/Drafts", "INBOX.Drafts"],
  SPAM: ["Spam", "Junk", "Junk E-mail", "[Gmail]/Spam", "INBOX.Junk"],
  TRASH: ["Trash", "Deleted", "Deleted Items", "[Gmail]/Trash", "INBOX.Trash"],
};

export function resolveImapPath(
  canonical: CanonicalFolder,
  listedPaths: string[]
): string | null {
  const lowerMap = new Map(listedPaths.map((p) => [p.toLowerCase(), p]));
  for (const candidate of FOLDER_IMAP_CANDIDATES[canonical]) {
    const hit = lowerMap.get(candidate.toLowerCase());
    if (hit) return hit;
  }
  // Partial match for localized names
  for (const path of listedPaths) {
    const l = path.toLowerCase();
    if (canonical === "SENT" && (l.includes("sent") || l.includes("enviad"))) return path;
    if (canonical === "DRAFTS" && l.includes("draft")) return path;
    if (canonical === "SPAM" && (l.includes("spam") || l.includes("junk"))) return path;
    if (canonical === "TRASH" && (l.includes("trash") || l.includes("deleted") || l.includes("papel"))) return path;
  }
  return canonical === "INBOX" ? "INBOX" : null;
}
