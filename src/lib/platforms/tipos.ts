/** Formas que viajan al navegador en Platforms. Ninguna lleva tokens. */

export type SerializedPlatform = {
  id: string;
  name: string;
  accessUrl: string | null;
  linkUrl: string | null;
  supabaseEmail: string | null;
  supabaseSlot: number | null;
  vercelEmail: string | null;
  githubEmail: string | null;
  brevoEmail: string | null;
  notes: string | null;
  hasConfidential: boolean;
  sortOrder: number;
  clientId: string | null;
  projectId: string | null;
  githubAccountId: string | null;
  githubRepo: string | null;
  vercelProjectId: string | null;
  vercelProjectName: string | null;
  supabaseProjectRef: string | null;
};

/** Lo que se sabe de la plataforma por la última consulta guardada (caché), sin llamar a nadie. */
export type PlatformLiveSummary = {
  githubPushedAt: string | null;
  vercelState: string | null;
  vercelDomain: string | null;
  vercelDeployedAt: number | null;
  supabaseStatus: string | null;
  supabaseRegion: string | null;
};

export type ProviderAccount = {
  /** null si la cuenta solo aparece como correo en alguna plataforma (sin fila propia). */
  id: string | null;
  provider: "vercel" | "supabase";
  email: string;
  plan: "FREE" | "PRO";
  planSource: "api" | "manual";
  hasToken: boolean;
  label: string | null;
  lastError: string | null;
  lastCheckedAt: string | null;
  /** Proyectos que la API dijo que tiene (última consulta). */
  liveUsed: number | null;
  fetchedAt: string | null;
};

export type GithubAccountInfo = {
  id: string;
  login: string;
  source: string;
  error: string | null;
  checkedAt: string | null;
  repos: number | null;
  projects: number;
};

export type ClientOption = {
  id: string;
  /** Empresa si tiene; si no, la persona. */
  name: string;
  /** El otro nombre (persona de contacto), para buscar y emparejar. */
  company: string | null;
  archived: boolean;
  projects: { id: string; name: string }[];
};

export type LiveListResponse<T> = {
  items: T[];
  fetchedAt: string | null;
  error: string | null;
  auth: boolean;
};
