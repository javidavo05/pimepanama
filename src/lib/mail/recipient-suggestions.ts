export type MailRecipientSource = "client" | "lead" | "sent" | "inbox" | "document";

export type MailRecipientSuggestion = {
  email: string;
  label: string;
  subtitle?: string;
  source: MailRecipientSource;
  lastUsedAt?: string;
};

type RecipientAccumulator = {
  email: string;
  label: string;
  subtitle?: string;
  source: MailRecipientSource;
  lastUsedAt?: Date;
};

const SOURCE_PRIORITY: Record<MailRecipientSource, number> = {
  client: 4,
  lead: 3,
  sent: 2,
  inbox: 1,
  document: 0,
};

function normalizeEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !trimmed.includes("@")) return null;
  return trimmed;
}

function upsertRecipient(
  map: Map<string, RecipientAccumulator>,
  entry: {
    email: string;
    label?: string | null;
    subtitle?: string | null;
    source: MailRecipientSource;
    lastUsedAt?: Date;
  }
) {
  const email = normalizeEmail(entry.email);
  if (!email) return;

  const label = entry.label?.trim() || email;
  const subtitle = entry.subtitle?.trim() || undefined;
  const existing = map.get(email);

  if (!existing) {
    map.set(email, {
      email,
      label,
      subtitle,
      source: entry.source,
      lastUsedAt: entry.lastUsedAt,
    });
    return;
  }

  const preferNew =
    SOURCE_PRIORITY[entry.source] > SOURCE_PRIORITY[existing.source] ||
    (entry.source === existing.source &&
      entry.lastUsedAt &&
      (!existing.lastUsedAt || entry.lastUsedAt > existing.lastUsedAt));

  if (preferNew) {
    existing.label = label.length > existing.label.length ? label : existing.label;
    existing.subtitle = subtitle ?? existing.subtitle;
    existing.source = SOURCE_PRIORITY[entry.source] >= SOURCE_PRIORITY[existing.source]
      ? entry.source
      : existing.source;
  }

  if (entry.lastUsedAt && (!existing.lastUsedAt || entry.lastUsedAt > existing.lastUsedAt)) {
    existing.lastUsedAt = entry.lastUsedAt;
  }
}

export function buildRecipientSuggestions(input: {
  clients: { name: string; email: string | null; company: string | null }[];
  leads: { name: string; email: string | null; company: string | null }[];
  documents: { clientEmail: string | null; clientName: string | null; clientCompany: string | null }[];
  emails: {
    fromEmail: string;
    fromName: string | null;
    toAddresses: string[];
    ccAddresses: string[];
    folder: string;
    receivedAt: Date;
  }[];
}): MailRecipientSuggestion[] {
  const map = new Map<string, RecipientAccumulator>();

  for (const client of input.clients) {
    upsertRecipient(map, {
      email: client.email ?? "",
      label: client.name,
      subtitle: client.company,
      source: "client",
    });
  }

  for (const lead of input.leads) {
    upsertRecipient(map, {
      email: lead.email ?? "",
      label: lead.name,
      subtitle: lead.company,
      source: "lead",
    });
  }

  for (const doc of input.documents) {
    upsertRecipient(map, {
      email: doc.clientEmail ?? "",
      label: doc.clientName,
      subtitle: doc.clientCompany,
      source: "document",
    });
  }

  for (const email of input.emails) {
    const at = email.receivedAt;
    if (email.folder === "INBOX") {
      upsertRecipient(map, {
        email: email.fromEmail,
        label: email.fromName,
        subtitle: "Bandeja de entrada",
        source: "inbox",
        lastUsedAt: at,
      });
    }
    if (email.folder === "SENT") {
      for (const addr of email.toAddresses) {
        upsertRecipient(map, {
          email: addr,
          label: addr,
          subtitle: "Enviado antes",
          source: "sent",
          lastUsedAt: at,
        });
      }
      for (const addr of email.ccAddresses) {
        upsertRecipient(map, {
          email: addr,
          label: addr,
          subtitle: "CC anterior",
          source: "sent",
          lastUsedAt: at,
        });
      }
    }
  }

  return [...map.values()]
    .sort((a, b) => {
      const prio = SOURCE_PRIORITY[b.source] - SOURCE_PRIORITY[a.source];
      if (prio !== 0) return prio;
      const aTime = a.lastUsedAt?.getTime() ?? 0;
      const bTime = b.lastUsedAt?.getTime() ?? 0;
      return bTime - aTime;
    })
    .map((item) => ({
      email: item.email,
      label: item.label,
      subtitle: item.subtitle,
      source: item.source,
      lastUsedAt: item.lastUsedAt?.toISOString(),
    }));
}

export function filterRecipientSuggestions(
  suggestions: MailRecipientSuggestion[],
  query: string,
  limit = 10
): MailRecipientSuggestion[] {
  const q = query.trim().toLowerCase();
  if (!q) return suggestions.slice(0, limit);

  return suggestions
    .filter((item) => {
      const haystack = [item.email, item.label, item.subtitle ?? ""].join(" ").toLowerCase();
      return haystack.includes(q);
    })
    .slice(0, limit);
}

export const RECIPIENT_SOURCE_LABEL: Record<MailRecipientSource, string> = {
  client: "Cliente",
  lead: "Lead",
  sent: "Enviado",
  inbox: "Recibido",
  document: "Documento",
};
