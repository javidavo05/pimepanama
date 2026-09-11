/**
 * Etapas del análisis de una reunión, en el orden en que se corren. Las comparten
 * el grabador y la subida de las grabaciones hechas sin conexión, que al final
 * recorren el mismo camino.
 */
export const PROCESS_STAGES = [
  { key: "diarize", label: "Separando quién habla" },
  { key: "minutes", label: "Redactando minuta ejecutiva y técnica" },
  { key: "items", label: "Extrayendo pendientes técnicos" },
  { key: "deliverable", label: "Determinando el entregable técnico" },
  { key: "prompt", label: "Armando el master prompt" },
  // Va al final y sobre la transcripción, no sobre las minutas: si falla, la
  // reunión ya está completa y solo se queda sin índice de temas.
  { key: "chapters", label: "Armando el índice de temas" },
] as const;
