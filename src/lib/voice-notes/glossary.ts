/**
 * Vocabulario que Whisper destroza: nombres propios, marcas, términos técnicos.
 *
 * Es la misma lista que `references/glosario.md` de la skill `notas-de-voz`.
 * Sirve dos veces: los términos correctos van en el `prompt` de Whisper, que
 * sesga la transcripción hacia ellos (con "SAP, S/4HANA" en el prompt deja de
 * oír "Zap" y "Sfohana"), y las variantes se corrigen después sobre el texto
 * por si el sesgo no alcanzó.
 *
 * Cada entrada: término correcto y las variantes erróneas que se le han visto.
 */
const GLOSSARY: Array<[string, string[]]> = [
  // Stack técnico
  ["Supabase", ["super base", "superbase", "supa base", "súper base"]],
  ["Next.js", ["next jota ese", "nextjs", "next j s", "nex js"]],
  ["Vercel", ["verse el", "versel", "vercell", "ver cel"]],
  ["Cloudflare", ["cloud flare", "cloudflair", "cloud flair"]],
  ["TypeScript", ["type script", "tipo script", "taipscript"]],
  ["PostgreSQL", ["postgres ese cu ele", "post gres"]],
  ["Tailwind", ["tail wind", "teilwind", "tailwin"]],
  ["GitHub", ["git hub", "guitjob", "guit hub"]],
  ["API", ["a pe i"]],
  ["SaaS", ["ese a ese"]],
  ["SSO", ["ese ese o"]],
  ["RLS", ["erre ele ese"]],
  ["webhook", ["web juk", "webjuk"]],
  ["endpoint", ["end point"]],
  ["deploy", ["diploi", "deploi"]],
  ["frontend", ["front end"]],
  ["backend", ["back end"]],
  ["middleware", ["midelwer", "midel ware"]],

  // SAP y empresarial
  ["SAP", ["ese a pe", "zap"]],
  ["S/4HANA", ["ese cuatro jana", "s4 hana", "s4hana", "ese cuatro hana", "sfohana", "sfo hana"]],
  ["ERP", []],
  ["un ERP", ["un rp"]],
  ["SRM", ["ese erre eme"]],
  ["Process Orchestration", ["proces orquestation", "process orquestracion"]],
  ["Integration Suite", ["integration suit"]],
  ["Ariba", ["ariva"]],
  ["OData", ["o data"]],
  ["IDoc", ["i doc", "aidoc"]],
  ["Entra ID", ["entra ai di", "entra i de"]],
  ["Active Directory", ["active directori", "activo directorio"]],
  ["HCM", ["ache ce eme"]],

  // Clientes y marcas
  ["Pime Panamá", ["pime panama", "pyme panama", "pyme panamá"]],
  ["Copa Airlines", ["copa erlains", "copa airlains", "copa air lines"]],
  ["Copa", ["coppa"]],
  ["Svitzer", ["esvitzer", "switzer", "suitzer"]],
  ["Academyx", ["academix", "academy x"]],
  ["Godmode", ["god mode", "godmod"]],
  ["Misaza", ["mi saza", "misasa"]],
  ["Wasi", ["guasi", "wassi", "uasi"]],
  ["MedSuite", ["med suite", "medsuit"]],

  // Documentos y comercial
  ["llave en mano", ["yave en mano"]],
  ["matriz de trazabilidad", ["matriz de trazavilidad"]],
  ["alcance", ["alcanse"]],
  ["escrow", ["escrou", "escro"]],
  ["UAT", ["u a te"]],
];

/** Lo que se le pasa a Whisper como `prompt`. Tope de 224 tokens: solo los términos. */
export const WHISPER_PROMPT =
  "Nota de voz de trabajo en español de Panamá. Términos: " +
  GLOSSARY.filter(([term]) => /^[A-Z]/.test(term))
    .map(([term]) => term)
    .join(", ") +
  ".";

const RULES = GLOSSARY.flatMap(([term, variants]) =>
  variants.map((variant) => ({
    variant,
    term,
    // \b no entiende acentos; se delimita a mano con letras latinas
    pattern: new RegExp(
      `(?<![\\p{L}\\p{N}])${variant.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}(?![\\p{L}\\p{N}])`,
      "giu"
    ),
  }))
).sort((a, b) => b.variant.length - a.variant.length);

/** Corrige el texto y devuelve qué cambió, para mostrarlo y no esconder la corrección. */
export function applyGlossary(text: string): { text: string; corrections: string[] } {
  const corrections: string[] = [];
  let out = text;
  for (const { variant, term, pattern } of RULES) {
    let count = 0;
    out = out.replace(pattern, () => {
      count++;
      return term;
    });
    if (count > 0) corrections.push(`${variant} → ${term}`);
  }
  return { text: out, corrections };
}
