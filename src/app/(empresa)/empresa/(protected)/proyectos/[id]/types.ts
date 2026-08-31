import type { FinancingPlan } from "@/lib/financing";

export interface Schedule {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  status: string;
  paidAt: string | null;
  reminderSent: boolean;
}

export interface ProjectDocument {
  id: string;
  type: string;
  number: string | null;
  status: string;
  total: number | null;
  issueDate: string;
  clientName: string | null;
  linkedDocumentId: string | null;
  paymentSchedules: Schedule[];
}

export interface Contract {
  id: string;
  title: string;
  status: string;
  description: string | null;
  responsibilities: string | null;
  terms: string | null;
  value: number | null;
  startsAt: string | null;
  endsAt: string | null;
  signedAt: string | null;
}

export interface ProjectMeeting {
  id: string;
  title: string;
  status: string;
  meetingDate: string;
  durationMs: number;
  contextSummary: string | null;
  actionItemCount: number;
  /** Pendientes que todavía no se materializaron en una tarea */
  openItemCount: number;
}

export interface Deliverable {
  id: string;
  name: string;
  description: string | null;
  dueDate: string | null;
  completed: boolean;
  completedAt: string | null;
  source: string;
}

export interface ProjectClientRef {
  id: string;
  name: string;
  company: string | null;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  scope: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  totalBudget: number | null;
  aiSummary: string | null;
  aiTags: string[];
  createdAt: string;
  updatedAt: string;
  hasProposal: boolean;
  financingPlan: FinancingPlan | null;
  clients: ProjectClientRef[];
  deliverables: Deliverable[];
  meetings: ProjectMeeting[];
  contracts: Contract[];
  documents: ProjectDocument[];
}

/** Fecha ISO → `yyyy-mm-dd` para los <input type="date">. */
export const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

export const fmtUSD = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const PROJECT_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Activo", PAUSED: "Pausado", COMPLETED: "Completado", CANCELLED: "Cancelado",
};

export const PROJECT_STATUS_COLOR: Record<string, string> = {
  ACTIVE: "bg-green-500/15 text-green-400 border-green-500/20",
  PAUSED: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  COMPLETED: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  CANCELLED: "bg-white/[0.05] text-white/55 border-white/[0.08]",
};

export const CONTRACT_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador", ACTIVE: "Activo", EXPIRED: "Vencido", TERMINATED: "Terminado",
};

export const CONTRACT_STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-white/[0.05] text-white/55 border-white/[0.08]",
  ACTIVE: "bg-green-500/15 text-green-400 border-green-500/20",
  EXPIRED: "bg-white/[0.05] text-white/60 border-white/[0.10]",
  TERMINATED: "bg-red-500/15 text-red-400 border-red-500/20",
};

/**
 * Ancho, padding y tamaño de texto van aparte: al concatenar `w-40` o `text-xs`
 * sobre una clase que ya trae `w-full`/`text-sm`, Tailwind no los sobreescribe
 * (gana el orden del CSS, no el del string) y el campo sale deformado.
 */
const FIELD_BASE =
  "bg-white/[0.03] border border-white/[0.07] rounded-lg text-white placeholder-white/20 focus:outline-none focus:border-[#1AA7F0]/40 transition-all [color-scheme:dark]";

export const INPUT_CLASS = `w-full px-3 py-2.5 text-sm ${FIELD_BASE}`;

/** Variante compacta, para la barra lateral. */
export const INPUT_COMPACT = `w-full px-3 py-2 text-xs ${FIELD_BASE}`;

export const TEXTAREA_CLASS = `${INPUT_CLASS} resize-none`;

export const LABEL_CLASS =
  "block text-white/50 text-xs uppercase tracking-widest font-medium mb-1.5";
