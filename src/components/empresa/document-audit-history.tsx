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
    <div className="bg-panel border border-line rounded-xl p-5">
      <p className="text-fg-dim text-xs uppercase tracking-widest font-medium mb-3">
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
    <div key={log.id} className="border-b border-line pb-3 last:border-0 last:pb-0">
      <div className="flex items-center justify-between gap-3">
        <p className="text-fg-mute text-xs font-medium">{log.actorName ?? log.actorEmail}</p>
        <p className="text-fg-faint text-[11px] font-mono shrink-0">
          {new Date(log.createdAt).toLocaleString("es-PA", { dateStyle: "medium", timeStyle: "short" })}
        </p>
      </div>
      <p className="text-fg-dim text-xs mt-1">{log.summary}</p>
    </div>
  );
}
