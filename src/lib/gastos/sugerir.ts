/**
 * Categoría y proveedor de un gasto a partir de lo que se escribe («Vercel Pro», «dominio en Namecheap»…).
 * Solo sugiere: el formulario lo precarga mientras la persona no haya elegido otra cosa.
 */
export type CategoriaGasto = "HOSTING" | "SAAS" | "SALARIOS" | "SERVICIOS" | "MARKETING" | "IMPUESTOS" | "COMISIONES" | "SOFTWARE" | "OTRO";

const REGLAS: { re: RegExp; vendor: string; category: CategoriaGasto }[] = [
  { re: /\bvercel\b/i, vendor: "Vercel", category: "HOSTING" },
  { re: /\bsupabase\b/i, vendor: "Supabase", category: "HOSTING" },
  { re: /\bcloudflare\b/i, vendor: "Cloudflare", category: "HOSTING" },
  { re: /\b(aws|amazon web services)\b/i, vendor: "AWS", category: "HOSTING" },
  { re: /\b(namecheap)\b/i, vendor: "Namecheap", category: "HOSTING" },
  { re: /\b(godaddy)\b/i, vendor: "GoDaddy", category: "HOSTING" },
  { re: /\b(dominio|domain)\b/i, vendor: "", category: "HOSTING" },
  { re: /\bgithub\b/i, vendor: "GitHub", category: "SOFTWARE" },
  { re: /\b(openai|chatgpt)\b/i, vendor: "OpenAI", category: "SAAS" },
  { re: /\b(anthropic|claude)\b/i, vendor: "Anthropic", category: "SAAS" },
  { re: /\bbrevo\b/i, vendor: "Brevo", category: "SAAS" },
  { re: /\b(google workspace|gsuite|g suite)\b/i, vendor: "Google", category: "SAAS" },
  { re: /\b(apple developer|app store)\b/i, vendor: "Apple", category: "SOFTWARE" },
  { re: /\b(google play)\b/i, vendor: "Google", category: "SOFTWARE" },
  { re: /\bfigma\b/i, vendor: "Figma", category: "SOFTWARE" },
  { re: /\b(meta ads|facebook ads|google ads|anuncio|publicidad)\b/i, vendor: "", category: "MARKETING" },
  { re: /\b(stripe|paypal|yappy)\b/i, vendor: "", category: "COMISIONES" },
];

export function sugerirGasto(texto: string): { category: CategoriaGasto; vendor: string | null } | null {
  const t = texto.trim();
  if (!t) return null;
  const r = REGLAS.find((x) => x.re.test(t));
  if (!r) return null;
  return { category: r.category, vendor: r.vendor || null };
}
