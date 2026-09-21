import { prisma } from "@/lib/prisma";
import { analyzeEmail } from "./ai-analyze";
import { htmlToPlainText, isHtmlEmail } from "./email-html";

/** Por llamada: cabe en los 60 s de la ruta sin reventar el límite por minuto de OpenAI. */
const BATCH = 20;
const CONCURRENCY = 3;
/** Un urgente viejo que recién se analiza no merece campana: ya pasó. */
const NOTIFY_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

const pendingWhere = (accountId: string) => ({
  accountId,
  folder: "INBOX",
  OR: [{ aiSummary: null }, { aiSummary: "" }],
});

/**
 * Analiza los correos de la bandeja que quedaron sin resumen: los que el sync
 * no pudo analizar (la IA falló o no estaba configurada) y los que se
 * limpiaron para re-analizar. Devuelve cuántos quedan para seguir en otra
 * llamada.
 */
export async function analyzePendingEmails(
  accountId: string
): Promise<{ analyzed: number; failed: number; remaining: number }> {
  if (!process.env.OPENAI_API_KEY) return { analyzed: 0, failed: 0, remaining: 0 };

  const emails = await prisma.inboxEmail.findMany({
    where: pendingWhere(accountId),
    orderBy: { receivedAt: "desc" },
    take: BATCH,
    select: { id: true, userId: true, subject: true, fromEmail: true, bodyText: true, receivedAt: true },
  });

  let analyzed = 0;
  let failed = 0;

  for (let i = 0; i < emails.length; i += CONCURRENCY) {
    await Promise.all(
      emails.slice(i, i + CONCURRENCY).map(async (email) => {
        try {
          const body = email.bodyText ?? "";
          const text = isHtmlEmail(body) ? htmlToPlainText(body) : body;
          const analysis = await analyzeEmail(email.subject ?? "", text.slice(0, 2000));
          // Sin resumen, el correo volvería a la cola en cada sync.
          const summary = analysis.summary || "Sin resumen";

          await prisma.inboxEmail.update({
            where: { id: email.id },
            data: { aiSummary: summary, aiTags: analysis.tags },
          });
          analyzed++;

          const notify =
            analysis.urgency === "high" ||
            analysis.tags.includes("urgent") ||
            analysis.tags.includes("payment");
          if (notify && Date.now() - email.receivedAt.getTime() < NOTIFY_WINDOW_MS) {
            await prisma.mailNotification.create({
              data: {
                userId: email.userId,
                emailId: email.id,
                title: `${analysis.urgency === "high" ? "Urgente" : "Atención"}: ${email.subject ?? "Sin asunto"}`,
                body: analysis.summary || `Correo de ${email.fromEmail}`,
              },
            });
          }
        } catch (err) {
          failed++;
          console.error(`[mail/analyze-pending] falló el análisis de ${email.id}`, err);
        }
      })
    );
  }

  const remaining = await prisma.inboxEmail.count({ where: pendingWhere(accountId) });
  return { analyzed, failed, remaining };
}
