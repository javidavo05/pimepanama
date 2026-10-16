const ESTADOS: Record<string, { label: string; clase: string }> = {
  borrador: { label: "Borrador", clase: "border-line-mid text-fg-dim" },
  preparando: { label: "Preparando", clase: "border-warn/30 bg-warn/10 text-warn" },
  enviando: { label: "Envío a medias", clase: "border-warn/30 bg-warn/10 text-warn" },
  enviada: { label: "Enviada", clase: "border-ok/30 bg-ok/10 text-ok" },
};

export function EstadoCampana({ estado }: { estado: string }) {
  const e = ESTADOS[estado] ?? ESTADOS.borrador;
  return <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold whitespace-nowrap ${e.clase}`}>{e.label}</span>;
}

export const porcentaje = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)} %` : "—");
