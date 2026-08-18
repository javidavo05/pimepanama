interface AuditLogEntry {
  id: string;
  actorEmail: string;
  actorName: string | null;
  summary: string;
  createdAt: string;
}

interface DocumentAuditHistoryProps {
  logs: AuditLogEntry[];
  /** Sin tarjeta ni título: para usarlo dentro de una sección plegable. */
  bare?: boolean;
}

export function DocumentAuditHistory({ logs, bare = false }: DocumentAuditHistoryProps) {
  if (logs.length === 0) return null;

  if (bare) {
    return <div className="space-y-3">{logs.map(renderLog)}</div>;
  }

  return (
    <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5">
      <p className="text-white/60 text-xs uppercase tracking-widest font-medium mb-3">
        Historial de cambios
      </p>
      <div className="space-y-3">
        {logs.map(renderLog)}
      </div>
    </div>
  );
}

function renderLog(log: AuditLogEntry) {
  return (
    <div key={log.id} className="border-b border-white/[0.04] pb-3 last:border-0 last:pb-0">
      <div className="flex items-center justify-between gap-3">
        <p className="text-white/70 text-xs font-medium">{log.actorName ?? log.actorEmail}</p>
        <p className="text-white/50 text-[11px] font-mono shrink-0">
          {new Date(log.createdAt).toLocaleString("es-PA", { dateStyle: "medium", timeStyle: "short" })}
        </p>
      </div>
      <p className="text-white/55 text-xs mt-1">{log.summary}</p>
    </div>
  );
}
