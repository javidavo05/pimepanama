export type MailAttachmentInput = {
  filename: string;
  contentType?: string;
  /** Base64-encoded file bytes */
  content: string;
};

export type MailOutgoingAttachment = {
  filename: string;
  contentType: string;
  content: Buffer;
};

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_BYTES = 25 * 1024 * 1024;

export function parseOutgoingAttachments(
  raw?: MailAttachmentInput[]
): MailOutgoingAttachment[] {
  if (!raw?.length) return [];

  const result: MailOutgoingAttachment[] = [];
  let total = 0;

  for (const att of raw) {
    const filename = att.filename?.trim();
    if (!filename || !att.content) continue;

    let buf: Buffer;
    try {
      buf = Buffer.from(att.content, "base64");
    } catch {
      throw new Error(`Adjunto inválido: ${filename}`);
    }

    if (buf.length === 0) continue;
    if (buf.length > MAX_FILE_BYTES) {
      throw new Error(`"${filename}" supera el límite de 10 MB por archivo`);
    }

    total += buf.length;
    if (total > MAX_TOTAL_BYTES) {
      throw new Error("El tamaño total de adjuntos supera 25 MB");
    }

    result.push({
      filename,
      contentType: att.contentType?.trim() || "application/octet-stream",
      content: buf,
    });
  }

  return result;
}

export function formatAttachmentSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
