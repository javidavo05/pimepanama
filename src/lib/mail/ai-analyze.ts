import { clienteIA, elegirCerebro } from "@/lib/ai/cerebro";
import { calcGptCost } from "@/lib/ai-pricing";

const TAGS = ["urgent", "invoice", "follow-up", "support", "payment", "spam", "general"] as const;
export type EmailTag = typeof TAGS[number];

/**
 * Solicitud de cotización reconocida en un correo entrante: alguien que quiere contratar a Pime. Con esto el
 * sync crea el lead (o lo deja prellenado para crearlo a mano). Se guarda en InboxEmail.solicitud.
 */
export interface SolicitudCotizacion {
  nombre: string | null;
  empresa: string | null;
  telefono: string | null;
  /** Qué pide, en una oración. */
  necesidad: string;
  valorEstimado: number | null;
  prioridad: "ALTA" | "MEDIA" | "BAJA";
}

export interface EmailAnalysis {
  summary: string;
  tags: EmailTag[];
  urgency: "high" | "medium" | "low";
  suggestedAction: string;
  /** null si el correo no es una solicitud de cotización de un posible cliente. */
  solicitud: SolicitudCotizacion | null;
  costUSD: number;
}

const PRIORIDADES = ["ALTA", "MEDIA", "BAJA"] as const;
const texto = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

/** Lo que devuelve el modelo, ya validado. Exportado para probarlo sin llamar a la IA. */
export function leerSolicitud(raw: unknown): SolicitudCotizacion | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.es !== true) return null;
  const necesidad = texto(r.necesidad, 300);
  if (!necesidad) return null;
  const valor = typeof r.valorEstimado === "number" && Number.isFinite(r.valorEstimado) && r.valorEstimado > 0 ? Math.round(r.valorEstimado) : null;
  const prioridad = PRIORIDADES.includes(r.prioridad as (typeof PRIORIDADES)[number]) ? (r.prioridad as SolicitudCotizacion["prioridad"]) : "MEDIA";
  return { nombre: texto(r.nombre, 120), empresa: texto(r.empresa, 160), telefono: texto(r.telefono, 40), necesidad, valorEstimado: valor, prioridad };
}

export async function analyzeEmail(subject: string, bodyText: string): Promise<EmailAnalysis> {
  if (!elegirCerebro()) {
    return { summary: "", tags: ["general"], urgency: "low", suggestedAction: "", solicitud: null, costUSD: 0 };
  }

  // Con análisis en tandas el límite de tokens por minuto de OpenAI salta
  // enseguida: el SDK espera y reintenta el 429 en vez de perder el correo.
  const openai = await clienteIA({ maxRetries: 5 });
  const truncated = bodyText.slice(0, 2000);

  const res = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: 600,
    messages: [
      {
        role: "system",
        // Sin la voz de marca: es para redactar, y aquí solo cuadruplicaba los
        // tokens de cada llamada.
        content: `Clasificas correos entrantes en la bandeja de la empresa para que el equipo priorice sin abrir cada uno.
Analiza el correo y devuelve un JSON con:
- summary: resumen de una oración en español (máx 120 caracteres) — el hecho concreto, no "correo sobre facturación".
- tags: arreglo de etiquetas aplicables de [${TAGS.join(", ")}] (1-3 etiquetas).
- urgency: "high" | "medium" | "low" — alta si hay una fecha límite próxima, un pago vencido, o riesgo de perder al cliente.
- suggestedAction: siguiente paso concreto en español (máx 80 caracteres) — un verbo de acción, no "revisar correo".
- solicitud: la empresa es Pime Panamá (desarrollo de software a medida: plataformas web, e-commerce, sistemas internos, apps, integraciones, consultoría). Si quien escribe es un posible cliente que pide cotización, precio, propuesta o quiere contratar un proyecto, devuelve
    { "es": true, "nombre": nombre de la persona o null, "empresa": su empresa o null, "telefono": su teléfono o null,
      "necesidad": qué pide en una oración en español (máx 200 caracteres), "valorEstimado": USD si lo dice o se puede estimar con lo que cuenta, si no null,
      "prioridad": "ALTA" (empresa identificable con alcance, presupuesto o urgencia) | "MEDIA" (necesidad real sin tamaño claro) | "BAJA" (consulta genérica) }.
  En cualquier otro caso { "es": false }: publicidad, boletines, proveedores que nos venden a nosotros, bancos, avisos automáticos, facturas, soporte de un sistema ya entregado, o alguien que busca empleo.

Responde SOLO con JSON válido.`,
      },
      {
        role: "user",
        content: `Subject: ${subject}\n\n${truncated}`,
      },
    ],
  });

  const usage = res.usage;
  const costUSD = calcGptCost(usage?.prompt_tokens ?? 0, usage?.completion_tokens ?? 0, res.model);

  try {
    const parsed = JSON.parse(res.choices[0]?.message?.content ?? "{}");
    return {
      summary: parsed.summary ?? "",
      tags: (parsed.tags ?? ["general"]).filter((t: string) => TAGS.includes(t as EmailTag)),
      urgency: parsed.urgency ?? "low",
      suggestedAction: parsed.suggestedAction ?? "",
      solicitud: leerSolicitud(parsed.solicitud),
      costUSD,
    };
  } catch {
    return { summary: "", tags: ["general"], urgency: "low", suggestedAction: "", solicitud: null, costUSD };
  }
}
