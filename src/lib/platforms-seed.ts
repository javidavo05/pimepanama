/**
 * Cupos corregidos respecto al Excel: un cupo (1–2) por correo y proveedor.
 * Regenerar base con: node scripts/parse-platforms-xlsx.cjs (luego revisar conflictos).
 */

export type PlatformSeedRow = {
  name: string;
  accessUrl?: string | null;
  supabaseEmail?: string | null;
  supabaseSlot?: number | null;
  vercelEmail?: string | null;
  vercelSlot?: number | null;
  linkUrl?: string | null;
  githubEmail?: string | null;
  brevoEmail?: string | null;
  notes?: string | null;
  sortOrder: number;
};

function normUrl(v: string | undefined | null): string | null {
  if (!v?.trim()) return null;
  const s = v.trim();
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
}

function normSlot(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const slot = Math.round(n);
  if (slot < 1 || slot > 2) return null;
  return slot;
}

/** Siempre minúsculas para agrupar inventario de cupos. */
function normEmail(v: string | undefined | null): string | null {
  if (v == null) return null;
  const s = String(v).trim().toLowerCase();
  return s || null;
}

export const PLATFORMS_SEED: PlatformSeedRow[] = [
  {
    sortOrder: 0,
    name: "Church Saas",
    accessUrl: normUrl("https://churchsaas.vercel.app/"),
    supabaseEmail: normEmail("javier@pimepanama.com"),
    supabaseSlot: 1,
    vercelEmail: normEmail("fliavallejovega@gmail.com"),
    vercelSlot: 1,
    linkUrl: normUrl("https://churchsaas.vercel.app/"),
    githubEmail: normEmail("academyxsystem@gmail.com"),
  },
  {
    sortOrder: 1,
    name: "Godmode",
    accessUrl: normUrl("https://godmode-three.vercel.app/"),
    supabaseEmail: normEmail("javier@pimepanama.com"),
    supabaseSlot: 2,
    vercelEmail: normEmail("academyxsystem@gmail.com"),
    vercelSlot: 1,
    linkUrl: normUrl("https://godmode-three.vercel.app/"),
    githubEmail: normEmail("academyxsystem@gmail.com"),
    brevoEmail: normEmail("javidavo05@gmail.com"),
  },
  {
    sortOrder: 2,
    name: "BB Real Estate",
    accessUrl: normUrl("https://project-zp4z9.vercel.app/"),
    supabaseEmail: normEmail("marketing@bbrealestate.com.pa"),
    supabaseSlot: 1,
    vercelEmail: normEmail("marketing@bbrealestate.com.pa"),
    vercelSlot: 1,
    linkUrl: normUrl("https://project-zp4z9.vercel.app/"),
  },
  {
    sortOrder: 3,
    name: "Academyx",
    accessUrl: normUrl("https://academyxcrm.com/"),
    supabaseEmail: normEmail("academyxsystem@gmail.com"),
    supabaseSlot: 1,
    vercelEmail: normEmail("academyxsystem@gmail.com"),
    vercelSlot: 2,
    linkUrl: normUrl("https://academyxcrm.com/"),
    githubEmail: normEmail("academyxsystem@gmail.com"),
  },
  {
    sortOrder: 4,
    name: "Chivas",
    accessUrl: normUrl("https://project-ppdqp.vercel.app/"),
    supabaseEmail: normEmail("pimegerencia@gmail.com"),
    supabaseSlot: 2,
    vercelEmail: normEmail("pimegerencia@gmail.com"),
    vercelSlot: 2,
    linkUrl: normUrl("https://project-ppdqp.vercel.app/"),
  },
  {
    sortOrder: 5,
    name: "Wedding OS",
    accessUrl: normUrl("https://wedding-saas-pi.vercel.app/"),
    supabaseEmail: normEmail("pimegerencia@gmail.com"),
    supabaseSlot: 1,
    vercelEmail: normEmail("pimegerencia@gmail.com"),
    vercelSlot: 1,
    linkUrl: normUrl("https://wedding-saas-pi.vercel.app/"),
  },
  {
    sortOrder: 6,
    name: "Blei y Davo",
    accessUrl: normUrl("https://www.bleiydavo.com"),
    supabaseEmail: normEmail("fliavallejovega@gmail.com"),
    supabaseSlot: 2,
    vercelEmail: normEmail("fliavallejovega@gmail.com"),
    vercelSlot: 2,
    linkUrl: normUrl("https://www.bleiydavo.com"),
  },
  {
    sortOrder: 7,
    name: "Pimepanama",
    accessUrl: normUrl("https://pimepanama.com"),
    supabaseEmail: normEmail("academyxsystem@gmail.com"),
    vercelEmail: normEmail("javier@pimepanama.com"),
    linkUrl: normUrl("https://pimepanama.com"),
    githubEmail: normEmail("javidavo05"),
  },
  {
    sortOrder: 8,
    name: "TDP",
    accessUrl: normUrl("https://pos.pimetransport.com"),
    vercelEmail: normEmail("javier@pimepanama.com"),
    vercelSlot: 1,
    linkUrl: normUrl("https://pos.pimetransport.com"),
  },
  {
    sortOrder: 9,
    name: "tickets",
    accessUrl: normUrl("https://ticket-system-sigma-nine.vercel.app"),
    vercelEmail: normEmail("javier@pimepanama.com"),
    vercelSlot: 2,
    linkUrl: normUrl("https://ticket-system-sigma-nine.vercel.app"),
  },
  {
    sortOrder: 10,
    name: "data transfer",
    notes: "vegaexperiences@gmail.com github",
  },
  {
    sortOrder: 11,
    name: "GeoGenius",
    supabaseEmail: normEmail("anita.gawecka26@gmail.com"),
    supabaseSlot: 1,
    vercelEmail: normEmail("anita.gawecka26@gmail.com"),
    vercelSlot: 1,
  },
];

export { normUrl, normSlot, normEmail };
