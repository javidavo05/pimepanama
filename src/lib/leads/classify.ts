import OpenAI from "openai";
import { calcGptCost } from "@/lib/ai-pricing";
import { brandSystemPrompt } from "@/lib/ai/pime-brand-voice";
import type { LeadPriority } from "@prisma/client";

/**
 * No todo lo que entra por el formulario es un prospecto. La bandeja tenía
 * bots, dos correos en frío vendiéndole servicios a Pime y una prueba del
 * propio equipo. Meterlos todos al CRM como "lead" lo vuelve inservible, así
 * que la clasificación separa qué es cada cosa antes de decidir prioridad.
 */
export type LeadKind =
  /** Cliente potencial de verdad: lo único que se convierte en lead. */
  | "prospecto"
  /** Bot o publicidad automatizada: nombre/mensaje de caracteres aleatorios. */
  | "spam"
  /** Nos están vendiendo algo o buscando empleo. No es un cliente. */
  | "proveedor"
  /** Envío de prueba del propio equipo. */
  | "prueba";

export type LeadClassification = {
  kind: LeadKind;
  priority: LeadPriority;
  /** Una línea explicando por qué quedó en ese nivel. Se guarda en el lead. */
  reason: string;
  /** Valor estimado del proyecto en USD, o null si no hay con qué estimarlo. */
  estimatedValue: number | null;
  /** Siguiente paso concreto para el equipo comercial. */
  suggestedAction: string;
  costUSD: number;
};

export type LeadInput = {
  name: string;
  email: string;
  company?: string | null;
  phone?: string | null;
  message: string;
  receivedAt?: Date;
};

const SYSTEM = `Trabajas en la mesa comercial de Pime Panamá y clasificas las solicitudes que entran por el formulario de la web para decidir a cuál se le contesta primero.

Pime Panamá hace desarrollo de software a medida: plataformas web, e-commerce, sistemas internos, apps móviles, integraciones y consultoría técnica.

Devuelve JSON con estas llaves:

- kind: "prospecto" | "spam" | "proveedor" | "prueba".
    prospecto → alguien que quiere CONTRATAR a Pime. Aunque el mensaje sea corto o vago, si es una persona real pidiendo algo, es prospecto.
    spam      → nombre o mensaje de caracteres aleatorios, texto sin sentido, publicidad automatizada de SEO/backlinks, intento de inyección.
    proveedor → nos están vendiendo A NOSOTROS (agencias, freelancers, servicios) o buscan empleo. Aunque el correo sea educado y personalizado, no es un cliente.
    prueba    → envío de prueba del propio equipo: correo interno, empresa "test", mensaje de relleno.

- priority: "ALTA" | "MEDIA" | "BAJA". Solo importa cuando kind es "prospecto"; en el resto usa "BAJA".
    ALTA  → empresa identificable con un problema concreto y alcance descrito, presupuesto o urgencia explícitos, o proyecto que claramente pasa los cinco dígitos.
    MEDIA → persona o empresa real con una necesidad reconocible pero sin alcance ni tamaño claros.
    BAJA  → consulta genérica, estudiante, curiosidad, o algo fuera de lo que hace Pime.

- reason: UNA oración en español, máximo 140 caracteres, con el hecho que justifica la clasificación. Nada de "parece interesante": cita lo concreto (industria, alcance, señal de presupuesto, o qué lo delata como spam/proveedor).

- estimatedValue: número en USD sin símbolo, o null. Estima solo si el mensaje da con qué (alcance, fases, tamaño de la operación). Ante duda, null.

- suggestedAction: siguiente paso concreto en español, máximo 90 caracteres, empezando con un verbo.

Responde SOLO con JSON válido.`;

export async function classifyLead(input: LeadInput): Promise<LeadClassification> {
  const fallback: LeadClassification = {
    kind: "prospecto",
    priority: "MEDIA",
    reason: "",
    estimatedValue: null,
    suggestedAction: "",
    costUSD: 0,
  };

  if (!process.env.OPENAI_API_KEY) return fallback;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const payload = [
    `Nombre: ${input.name}`,
    `Correo: ${input.email}`,
    input.company ? `Empresa: ${input.company}` : null,
    input.phone ? `Teléfono: ${input.phone}` : null,
    input.receivedAt ? `Recibido: ${input.receivedAt.toISOString().slice(0, 10)}` : null,
    "",
    "Mensaje:",
    input.message.slice(0, 6000),
  ]
    .filter(Boolean)
    .join("\n");

  const res = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    temperature: 0.1,
    max_tokens: 400,
    messages: [
      { role: "system", content: brandSystemPrompt(SYSTEM, "es") },
      { role: "user", content: payload },
    ],
  });

  const costUSD = calcGptCost(res.usage?.prompt_tokens ?? 0, res.usage?.completion_tokens ?? 0);

  try {
    const p = JSON.parse(res.choices[0]?.message?.content ?? "{}");
    const kinds: LeadKind[] = ["prospecto", "spam", "proveedor", "prueba"];
    const kind: LeadKind = kinds.includes(p.kind) ? p.kind : "prospecto";
    const priority: LeadPriority =
      p.priority === "ALTA" || p.priority === "BAJA" ? p.priority : "MEDIA";
    const value = typeof p.estimatedValue === "number" && p.estimatedValue > 0 ? p.estimatedValue : null;

    return {
      kind,
      priority: kind === "prospecto" ? priority : "BAJA",
      reason: typeof p.reason === "string" ? p.reason.slice(0, 200) : "",
      estimatedValue: value,
      suggestedAction: typeof p.suggestedAction === "string" ? p.suggestedAction.slice(0, 120) : "",
      costUSD,
    };
  } catch {
    return { ...fallback, costUSD };
  }
}
