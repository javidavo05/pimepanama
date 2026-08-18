export function normalizeComposeAiResult(content: Record<string, unknown>): {
  subject: string;
  body: string;
} {
  const nested =
    content.email && typeof content.email === "object" && !Array.isArray(content.email)
      ? (content.email as Record<string, unknown>)
      : content.correo && typeof content.correo === "object" && !Array.isArray(content.correo)
        ? (content.correo as Record<string, unknown>)
        : null;

  const source = nested ?? content;
  const subject =
    source.subject ??
    source.asunto ??
    source.Asunto ??
    source.titulo ??
    source.title;
  const body =
    source.body ??
    source.cuerpo ??
    source.mensaje ??
    source.contenido ??
    source.texto ??
    source.message;
  return {
    subject: typeof subject === "string" ? subject.trim() : "",
    body: typeof body === "string" ? body.trim() : "",
  };
}
