import { clienteIA, elegirCerebro } from "@/lib/ai/cerebro";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { calcGptCost } from "@/lib/ai-pricing";
import { brandSystemPrompt } from "@/lib/ai/pime-brand-voice";
import { projects } from "@/lib/portfolio/catalog";
import { huellaCorreo } from "./respuestas-comun";

/**
 * Propuesta corta que acompaña el primer correo a un prospecto: cinco páginas (portada, lo que vimos, qué
 * construiríamos, lo que viene después y próximos pasos). Es la misma forma de las propuestas que se mandaron a
 * mano a PFS y a APE el 2026-10-19, ahora con react-pdf.
 *
 * Va en dos pasos y en este orden: primero el correo (redactarCorreo), después la propuesta A PARTIR DEL CORREO
 * (redactarPropuesta). El PDF desarrolla lo que el correo le dice al cliente: los mismos hechos, el mismo caso y las
 * mismas piezas, con más detalle. Cuando las dos salían de una sola llamada, el PDF quedaba genérico y no coincidía.
 *
 * Sin precios: el prospecto todavía no habló con nadie. Cada fase dice «precio cerrado» y se cotiza después de la
 * reunión. La página de costos de terceros, garantía y soporte es fija (templates/propuesta-prospecto-pdf.tsx).
 */

// Los máximos son un tope de seguridad, no un límite de redacción.
const texto = (max: number) => z.string().trim().min(1).max(max);

export const propuestaProspectoSchema = z.object({
  /** Arriba del título de la portada: «Propuesta · Plataforma de operación naviera». */
  eyebrow: texto(160),
  titulo: texto(220),
  subtitulo: texto(520),
  vimos: z.object({
    titulo: texto(180),
    tarjetas: z.array(z.object({ titulo: texto(100), texto: texto(700) })).min(2).max(3),
    duele: texto(900),
    bien: texto(900),
    /** Lo que se quiere confirmar con ellos en la reunión. Vacío en las propuestas anteriores al 2026-10-22. */
    preguntas: z.array(texto(260)).max(4).default([]),
  }),
  construiriamos: z.object({
    titulo: texto(180),
    fases: z.array(z.object({
      nombre: texto(100),
      plazo: texto(80),
      texto: texto(700),
      /** Lo que se entrega en la fase, concreto para esta empresa. */
      incluye: z.array(texto(160)).max(4).default([]),
    })).min(1).max(3),
    /** Un caso real del catálogo o de las notas del agente. Null si ninguno se parece. */
    caso: z.object({ nombre: texto(120), texto: texto(700) }).nullable(),
    comoTrabajamos: z.array(texto(180)).min(3).max(5),
    /** Ejemplo de falla crítica en el sistema propuesto, para la tabla de soporte. */
    ejemploCritico: texto(180),
  }),
  /** Si la IA deja menos de dos, el PDF usa los pasos de siempre (templates/propuesta-prospecto-pdf.tsx). */
  pasos: z.array(z.object({ titulo: texto(120), texto: texto(400) })).max(4).default([]),
  /** Huella del asunto y el texto del correo del que salió (huellaCorreo). Si el correo cambia, la propuesta está desactualizada. */
  fuente: z.string().optional(),
  /** Solo en las primeras propuestas, que traían el correo en la misma llamada. Ya no se usa. */
  correo: z.object({ asunto: texto(200), cuerpo: texto(3000) }).optional(),
});

export type PropuestaProspecto = z.infer<typeof propuestaProspectoSchema>;

export function leerPropuesta(valor: unknown): PropuestaProspecto | null {
  const r = propuestaProspectoSchema.safeParse(valor);
  return r.success ? r.data : null;
}

/** Los casos que el agente de prospección puede citar (su prompt, 2026-10-19; permisos confirmados por Javier). */
const CASOS_AGENTE = `- Svitzer (marítimo): IA que lee los reportes de laboratorio del aceite de su flota de remolcadores y alerta por motor.
- UAPA Suite (Unión Adventista Panameña): gestión institucional, actas, propiedades, auditoría y app móvil.
- AcademyX (academias deportivas): matrícula, cobros recurrentes con Yappy y control de morosidad.
- Misaza (moda): tienda en línea con Yappy y PayPal; migración con 13.000 redirecciones sin perder Google.
- B&B Real Estate (inmobiliaria): sitio en varios idiomas sincronizado con su inventario en Wasi.
- John Henry (sastrería de lujo, Bogotá y Panamá): CRM de medidas, órdenes de taller y comisiones.`;

/** Casos que se pueden nombrar. Grupo GRF nunca se nombra (decisión de Javier, 2026-10-19). */
export function casosNombrables(): string {
  return projects
    .filter((p) => p.client && !/grf/i.test(`${p.client} ${p.name}`) && ["produccion", "interno", "beta"].includes(p.status))
    .map((p) => `- ${p.client} (${p.industry}): ${p.tagline}`)
    .join("\n");
}

const IDIOMA = {
  es: "español neutro panameño, tratando al lector de «ustedes»",
  en: "inglés de EE. UU., tratando al lector de «you». Todo valor en inglés; solo las llaves del JSON quedan como están",
};

export class PropuestaError extends Error {}

// ─── 1. El correo ────────────────────────────────────────────────────────────

const REGLAS_CORREO = {
  es: `Forma (la de los correos que ya se enviaron):
1) «Hola, equipo de <empresa>:»
2) Un párrafo con 2 o 3 hechos concretos de ellos sacados de las notas (canales, servicios, cifras, sedes, novedades) y por qué pesan.
3) Un párrafo: «Soy Javier Vallejo, fundador de Pime, empresa panameña de software a medida.»; el caso relacionado en una frase con lo que se construyó; «Les adjunto una propuesta corta: <las 2 o 3 piezas, nombradas>.»; cada pieza se aprueba por separado y el código es de ustedes.
4) «¿Les parece una conversación de 20 minutos esta semana o la próxima? Si no es de su interés, lo entiendo.»`,
  en: `Shape (the one of the emails already sent):
1) «Hi <company> team,»
2) One paragraph with 2 or 3 concrete facts about them from the notes (channels, services, figures, locations, news) and why they matter.
3) One paragraph: «I'm Javier Vallejo, founder of Pime, a custom software studio in Panama (same time zone as the U.S. East Coast, billing in USD).»; the related case in one sentence with what was built; «I've attached a short proposal: <the 2 or 3 pieces, named>.»; each piece is approved separately and the code belongs to them.
4) «Would a 20-minute call this week or next work for you? If it's not a fit, no worries.»`,
};

export async function redactarCorreo(p: {
  empresa: string;
  idioma: "es" | "en";
  notas: string;
  asunto: string;
  cuerpo: string;
  supabaseUid: string;
}): Promise<{ asunto: string; cuerpo: string }> {
  const system = brandSystemPrompt(
    `Escribes el primer correo de Pime a un prospecto que no conoce a Pime. Va con una propuesta corta en PDF adjunta. El agente de prospección investigó la empresa desde afuera: sus notas son tu única fuente sobre ella.

Reglas:
- Solo hechos de las notas. Nada inventado. Lo que no se sabe de su operación interna no se afirma.
- ${REGLAS_CORREO[p.idioma]}
- Las piezas que nombres en «Les adjunto…» son las fases que tendrá la propuesta: 2 o 3, con nombre corto y claro (p. ej. «un cotizador con reservas de espacio, un portal para sus clientes y lectura de documentos con IA»).
- El caso solo puede ser uno de esta lista o uno que mencionen las notas. Nunca inventes clientes.
${casosNombrables()}
- Máximo 150 palabras. Sin despedida ni firma (la firma del buzón va sola), sin dirección postal ni enlace de baja (se agregan solos), sin precios. Párrafos separados por una línea en blanco.
- Escribe en ${IDIOMA[p.idioma]}.

Responde ÚNICAMENTE con JSON: { "asunto": "una idea concreta para ESTA empresa, máx. 10 palabras", "cuerpo": "el correo" }`,
    p.idioma,
  );
  const user = `Empresa: ${p.empresa}

Notas del agente de prospección:
${p.notas.slice(0, 6000)}

Borrador del agente (úsalo de base; ya no ofrezcas «enviar un resumen»: la propuesta va adjunta):
Asunto: ${p.asunto}
${p.cuerpo.slice(0, 3000)}`;

  const forma = z.object({ asunto: texto(200), cuerpo: texto(3000) });
  return pedirJson(system, user, p.supabaseUid, "lead-correo-prospecto", 900, (v) => forma.safeParse(v));
}

// ─── 2. La propuesta, desde el correo ────────────────────────────────────────

/** Nivel de detalle esperado: la propuesta que se mandó a PFS Shipping el 2026-10-19 (página 2 y 3). */
const EJEMPLO_PFS = `{
  "vimos": {
    "titulo": "Una naviera que crece y cotiza a mano",
    "tarjetas": [
      { "titulo": "Cotización por dos canales", "texto": "Formulario web con respuesta en 24 horas y WhatsApp directo. Cada pedido se responde y se sigue a mano." },
      { "titulo": "Más rutas, más volumen", "texto": "Salidas semanales desde Colón a más de 200 puertos, y desde mayo la ruta Colón–Kingston pasó a quincenal." },
      { "titulo": "Ocho servicios distintos", "texto": "FCL, LCL, reefer, carga peligrosa, break bulk, cross-docking, seguro y salidas regulares: cada uno con su propia cotización." }
    ],
    "duele": "Cuando el volumen sube, la cotización, la reserva de espacio y los documentos viven entre el formulario, el correo, WhatsApp y hojas de cálculo. Responder en 24 horas depende de que alguien lo arme a mano.",
    "bien": "Su sitio ya ofrece rastreo de carga en tiempo real. La idea no es reemplazarlo, sino conectar lo que pasa antes: la cotización, la reserva y los documentos del embarque."
  },
  "construiriamos": {
    "titulo": "Del pedido de cotización al zarpe, sin retipear",
    "fases": [
      { "nombre": "Cotizador y reservas", "plazo": "Estimado: 6–8 semanas", "texto": "El cliente pide su cotización por servicio y ruta; el equipo la arma con tarifas guardadas y la envía en minutos. Al aprobarla, queda la reserva de espacio." },
      { "nombre": "Portal del cliente", "plazo": "Estimado: 4–6 semanas", "texto": "Cada cliente ve sus cotizaciones, reservas y documentos, y se conecta con el rastreo que ya tienen." },
      { "nombre": "Documentos con IA", "plazo": "Estimado: 4–6 semanas", "texto": "Lectura automática de facturas, listas de empaque y BL para llenar los datos del embarque sin digitarlos." }
    ],
    "caso": { "nombre": "Svitzer", "texto": "Construimos una IA que lee los reportes de laboratorio del aceite de su flota de remolcadores y alerta cuando un motor sale de límite. El mismo principio aplica a los documentos de un embarque." }
  }
}`;

const FORMA = `{
  "eyebrow": "Propuesta · <tipo de sistema en 3-5 palabras>",
  "titulo": "lo que haría el sistema para ESTA empresa, nombrándola (máx. 12 palabras)",
  "subtitulo": "1-2 oraciones: una idea a partir de lo que vimos desde afuera, para validar en 20 minutos",
  "vimos": {
    "titulo": "el hallazgo principal, en una frase con su rubro (como «Una naviera que crece y cotiza a mano»)",
    "tarjetas": [{ "titulo": "hecho (3-5 palabras)", "texto": "2-3 oraciones con el hecho, sus detalles y nombres propios" }],
    "duele": "2-3 oraciones: dónde suele doler con ESOS canales y ESOS servicios, como hipótesis",
    "bien": "2-3 oraciones: lo que ya tienen bien, nombrado, y cómo la propuesta se conecta con eso sin reemplazarlo",
    "preguntas": ["pregunta concreta para validar en la reunión", "...", "..."]
  },
  "construiriamos": {
    "titulo": "del <inicio de SU proceso> al <final>, en una frase",
    "fases": [{ "nombre": "la pieza tal como la nombra el correo", "plazo": "Estimado: N–M semanas", "texto": "2-3 oraciones: qué hace, para quién y qué cambia en su día a día", "incluye": ["entregable concreto", "entregable concreto", "entregable concreto"] }],
    "caso": { "nombre": "el cliente del caso que cita el correo", "texto": "2-3 oraciones: qué construimos y por qué aplica a ellos" },
    "comoTrabajamos": ["El código es de ustedes, sin comisiones", "Trato directo con el fundador de Pime", "Entregas cada dos semanas, probadas con su equipo", "Cuentas y datos a nombre de <empresa>"],
    "ejemploCritico": "falla crítica de ESTE sistema, p. ej. «El cotizador no abre o no permite enviar cotizaciones»"
  },
  "pasos": [
    { "titulo": "Conversación de 20 minutos", "texto": "1 oración con lo que se valida, propio de ellos" },
    { "titulo": "Propuesta con precio cerrado", "texto": "1 oración" },
    { "titulo": "Primera entrega en dos semanas", "texto": "1 oración: qué ven funcionando, con sus datos reales" }
  ]
}`;

export async function redactarPropuesta(p: {
  empresa: string;
  idioma: "es" | "en";
  notas: string;
  /** El correo tal como va a salir: la propuesta lo desarrolla. */
  asunto: string;
  cuerpo: string;
  supabaseUid: string;
}): Promise<{ propuesta: PropuestaProspecto }> {
  const system = brandSystemPrompt(
    `Redactas la propuesta corta en PDF que va adjunta a un correo ya escrito para un prospecto. El PDF desarrolla ESE correo: quien lo abra después de leer el correo tiene que encontrar lo mismo, con más detalle.

Reglas no negociables:
- Coherencia con el correo: cada hecho que menciona el correo es una tarjeta de «vimos» (con sus detalles de las notas); las fases son exactamente las piezas que el correo dice que van adjuntas, con los mismos nombres y en el mismo orden; el caso es el mismo que cita el correo (null si no cita ninguno).
- Específico: nombres propios, canales, servicios, sedes, cifras y fechas que estén en las notas. Prohibido lo que serviría para cualquier empresa («mejorar la eficiencia», «optimizar la gestión», «experiencia del cliente»). Si una frase se puede pegar en la propuesta de otra empresa, reescríbela.
- Habla como Pime: «vimos en su sitio…», «en su página…». Nunca menciones las notas, el agente ni la prospección.
- Solo hechos de las notas o del correo. Lo que no se sabe de su operación interna va como hipótesis («suele pasar…»), nunca como diagnóstico.
- Sin precios ni montos de Pime. La primera fase es el punto de partida; las demás se aprueban por separado. Plazos en rangos de semanas.
- Cantidades: 3 tarjetas, 3 preguntas, 2 o 3 fases con 3 «incluye» cada una, 4 «comoTrabajamos», 3 pasos.
- Largo (cabe en una página carta): cada tarjeta y «duele»/«bien», hasta 45 palabras; cada fase, hasta 40 palabras; cada «incluye», hasta 8 palabras; el caso, hasta 40 palabras; cada pregunta, una línea.
- Casos que se pueden nombrar (solo si el correo lo cita):
${casosNombrables()}
- Escribe en ${IDIOMA[p.idioma]}.

Este es el nivel de detalle que se espera (propuesta real enviada a PFS Shipping; no copies su contenido):
${EJEMPLO_PFS}

Responde ÚNICAMENTE con un JSON con exactamente esta forma:
${FORMA}`,
    p.idioma,
  );

  const user = `Empresa: ${p.empresa}

CORREO QUE ACOMPAÑA AL PDF (la propuesta lo desarrolla):
Asunto: ${p.asunto}
${p.cuerpo.replace(/\n+—\n[\s\S]*$/, "").slice(0, 3000)}

Notas del agente de prospección (de aquí salen los detalles):
${p.notas.slice(0, 6000)}`;

  const propuesta = await pedirJson(system, user, p.supabaseUid, "lead-propuesta-prospecto", 3000, (v) => propuestaProspectoSchema.safeParse(v));
  return { propuesta: { ...propuesta, correo: undefined, fuente: huellaCorreo(p.asunto, p.cuerpo) } };
}

// ─── Llamada al modelo ───────────────────────────────────────────────────────

/**
 * gpt-5.5 y no gpt-4o (el del resto de la suite): con gpt-4o las propuestas salían genéricas y no seguían el correo
 * (2026-10-21). Son pocas por día, así que la diferencia de costo no pesa.
 */
const MODELO = "gpt-5.5";

/** Un segundo intento si la forma no cuadra: el modelo a veces recorta una lista. */
async function pedirJson<T>(
  system: string,
  user: string,
  supabaseUid: string,
  operacion: string,
  maxTokens: number,
  validar: (v: unknown) => { success: true; data: T } | { success: false; error: { issues: unknown } },
  esfuerzo: "low" | "medium" = "low",
): Promise<T> {
  if (!elegirCerebro()) throw new PropuestaError("Falta la llave de IA en el servidor (OpenAI o Claude).");
  const openai = await clienteIA();
  let error = "";
  for (let intento = 1; intento <= 2; intento++) {
    const inicio = Date.now();
    const resp = await openai.chat.completions.create({
      model: MODELO,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      reasoning_effort: esfuerzo,
      // Incluye el razonamiento del modelo, que también cuenta como salida.
      max_completion_tokens: maxTokens + 6000,
      response_format: { type: "json_object" },
    });
    const entrada = resp.usage?.prompt_tokens ?? 0;
    const salida = resp.usage?.completion_tokens ?? 0;
    await prisma.aiUsageLog
      .create({ data: { supabaseUid, operation: operacion, model: resp.model, inputTokens: entrada, outputTokens: salida, durationMs: Date.now() - inicio } })
      .catch(() => null);
    console.info(`[${operacion}] US$${calcGptCost(entrada, salida, resp.model).toFixed(4)}`);

    let json: unknown;
    try {
      json = JSON.parse(resp.choices[0]?.message?.content ?? "{}");
    } catch {
      error = "La IA devolvió algo que no se pudo leer. Vuelve a intentarlo.";
      continue;
    }
    const r = validar(json);
    if (r.success) return r.data;
    console.error(`[${operacion}] forma inválida`, r.error.issues);
    error = "La IA dejó la propuesta incompleta. Vuelve a intentarlo.";
  }
  throw new PropuestaError(error);
}

// ─── 3. Verificación independiente del correo final y la propuesta ──────────

/** Todo el texto de una propuesta, en el orden del PDF y por sección, para leerlo de corrido. */
export function textoDePropuesta(pr: PropuestaProspecto): string {
  const c = pr.construiriamos;
  const seccion = (titulo: string, lineas: string[]) => [`[${titulo}]`, ...lineas.filter(Boolean)].join("\n");
  return [
    seccion("Portada", [pr.eyebrow, pr.titulo, pr.subtitulo]),
    seccion("Lo que vimos del prospecto", [pr.vimos.titulo, ...pr.vimos.tarjetas.map((t) => `${t.titulo}: ${t.texto}`), pr.vimos.duele, pr.vimos.bien]),
    seccion("Preguntas para la reunión", pr.vimos.preguntas),
    seccion("Oferta de Pime: qué construiríamos", [c.titulo, ...c.fases.map((f) => `${f.nombre} (${f.plazo}): ${f.texto} ${f.incluye.join("; ")}`)]),
    seccion("Caso de Pime", [c.caso ? `${c.caso.nombre}: ${c.caso.texto}` : "(ninguno)"]),
    seccion("Oferta de Pime: cómo trabajamos", c.comoTrabajamos),
    seccion("Oferta de Pime: ejemplo de falla crítica en el sistema que se construiría (para la tabla de soporte)", [c.ejemploCritico]),
    seccion("Próximos pasos", pr.pasos.map((x) => `${x.titulo}: ${x.texto}`)),
  ].join("\n\n");
}

export type Verificacion = { aprobado: boolean; problemas: string[] };

/**
 * Segunda verificación de lo que sale solo (la primera es la del agente): otra llamada, sin ver cómo se redactó,
 * contrasta cada afirmación del correo final y de la propuesta con las fuentes. Ante la duda, no aprueba.
 */
export async function verificarCorreo(p: {
  empresa: string;
  idioma: "es" | "en";
  notas: string;
  paginas: { url: string; texto: string }[];
  asunto: string;
  cuerpo: string;
  propuesta: PropuestaProspecto | null;
  supabaseUid: string;
}): Promise<Verificacion> {
  const system = `Eres un verificador independiente de Pime. Antes de que un correo en frío salga solo a un prospecto, revisas su versión final y la propuesta en PDF que lo acompaña. No redactas ni corriges: decides si puede salir.

Repruébalo (aprobado: false) si pasa cualquiera de estas cosas, y anota cada una en «problemas» con la frase exacta:
1. Una afirmación categórica sobre el prospecto (qué hace, dónde está, sus servicios, nombres, cifras, eventos, cómo opera, qué le duele) que NO esté respaldada por las FUENTES. Lo dicho como suposición o generalidad («por lo que vemos en su sitio», «imaginamos que», «suele pasar que», «en empresas como la suya») está bien.
2. Un cliente o caso de Pime que no esté en estas listas (Grupo GRF nunca se nombra):
${CASOS_AGENTE}
${casosNombrables()}
3. Cifras de Pime distintas de «50+ proyectos» y «$250K+», montos de dinero, descuentos, garantías de resultados o urgencia falsa.
4. El correo y la propuesta no dicen lo mismo (otro caso, otras piezas, otra empresa) o hablan de otra empresa que no es ${p.empresa}.
5. No está en ${p.idioma === "en" ? "inglés de EE. UU." : "español"}, o trae marcadores de plantilla ([Nombre], {{…}}), o le falta sentido.

NO son problemas los mensajes de siempre de Pime: el código es del cliente, sin comisiones, trato directo con el fundador, precio cerrado o alcance cerrado por fase (sin decir el monto), soporte y garantía, misma zona horaria que la costa este, facturación en USD. Tampoco lo que Pime propone construir para ellos (fases, piezas, plazos estimados, qué incluye cada fase, cómo trabaja Pime, ejemplos de fallas, próximos pasos, preguntas para la reunión). Eso es la oferta de Pime, no un hecho sobre el prospecto. Tampoco lo es lo que el caso de Pime dice de ese cliente, si coincide con su descripción en la lista.

Si dudas sobre un hecho del prospecto, no apruebes. «problemas» va vacío si apruebas. Responde ÚNICAMENTE con JSON: { "aprobado": true|false, "problemas": ["…"] }`;
  const user = `Prospecto: ${p.empresa}

FUENTES
Notas del investigador:
${p.notas.slice(0, 6000)}

${p.paginas.map((x) => `Página ${x.url}:\n${x.texto.slice(0, 8000)}`).join("\n\n") || "(no se pudo abrir ninguna página)"}

CORREO FINAL
Asunto: ${p.asunto}
${p.cuerpo.replace(/\n+—\n[\s\S]*$/, "").slice(0, 3000)}

PROPUESTA EN PDF
${p.propuesta ? textoDePropuesta(p.propuesta) : "(sin propuesta)"}`;
  // Las secciones marcadas «Oferta de Pime» describen el sistema que se construiría, no al prospecto.
  const forma = z.object({ aprobado: z.boolean(), problemas: z.array(z.string().trim().min(1).max(400)).max(12).default([]) });
  const r = await pedirJson(system, user, p.supabaseUid, "lead-verificar-correo", 1200, (v) => forma.safeParse(v), "medium");
  return { aprobado: r.aprobado && r.problemas.length === 0, problemas: r.problemas };
}
