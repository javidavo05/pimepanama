export const MEETING_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador",
  RECORDING: "Grabando",
  TRANSCRIBED: "Transcrita",
  PROCESSING: "Procesando",
  READY: "Lista",
  FAILED: "Falló",
};

export const MEETING_STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-white/[0.05] text-white/55 border-white/[0.08]",
  RECORDING: "bg-red-500/15 text-red-400 border-red-500/20",
  TRANSCRIBED: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  PROCESSING: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  READY: "bg-green-500/15 text-green-400 border-green-500/20",
  FAILED: "bg-red-500/15 text-red-400 border-red-500/20",
};

export const KIND_LABEL: Record<string, string> = {
  TECNICO: "Técnico",
  COMERCIAL: "Comercial",
  ADMINISTRATIVO: "Administrativo",
  DECISION: "Decisión",
  RIESGO: "Riesgo",
};

export const KIND_COLOR: Record<string, string> = {
  TECNICO: "bg-[#1AA7F0]/15 text-[#1AA7F0] border-[#1AA7F0]/25",
  COMERCIAL: "bg-[#C8A96E]/15 text-[#C8A96E] border-[#C8A96E]/25",
  ADMINISTRATIVO: "bg-white/[0.06] text-white/70 border-white/[0.12]",
  DECISION: "bg-purple-500/15 text-purple-300 border-purple-500/25",
  RIESGO: "bg-red-500/15 text-red-400 border-red-500/25",
};

export const PRIORITY_LABEL: Record<string, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
};
