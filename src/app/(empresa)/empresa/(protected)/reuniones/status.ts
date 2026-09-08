export const MEETING_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador",
  RECORDING: "Grabando",
  TRANSCRIBED: "Transcrita",
  PROCESSING: "Procesando",
  READY: "Lista",
  FAILED: "Falló",
};

export const MEETING_STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-fill-2 text-fg-dim border-line",
  RECORDING: "bg-danger/15 text-danger border-danger/20",
  TRANSCRIBED: "bg-info/15 text-info border-info/20",
  PROCESSING: "bg-warn/15 text-warn border-warn/20",
  READY: "bg-ok/15 text-ok border-ok/20",
  FAILED: "bg-danger/15 text-danger border-danger/20",
};

export const KIND_LABEL: Record<string, string> = {
  TECNICO: "Técnico",
  COMERCIAL: "Comercial",
  ADMINISTRATIVO: "Administrativo",
  DECISION: "Decisión",
  RIESGO: "Riesgo",
};

export const KIND_COLOR: Record<string, string> = {
  TECNICO: "bg-brand/15 text-brand-fg border-brand/25",
  COMERCIAL: "bg-sand/15 text-sand-fg border-sand/25",
  ADMINISTRATIVO: "bg-fill-2 text-fg-mute border-line-mid",
  DECISION: "bg-grape/15 text-grape-soft border-grape/25",
  RIESGO: "bg-danger/15 text-danger border-danger/25",
};

export const PRIORITY_LABEL: Record<string, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
};
