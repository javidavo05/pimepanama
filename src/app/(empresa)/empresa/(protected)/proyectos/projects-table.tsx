"use client";

import Link from "next/link";
import { useState } from "react";
import { dueInfo, Segmented } from "@/components/empresa/tasks/task-parts";
import { PROJECT_STATUS_COLOR, PROJECT_STATUS_LABEL } from "./[id]/types";

export interface ProjectRow {
  id: string;
  name: string;
  status: string;
  clients: string[];
  done: number;
  total: number;
  endDate: string | null;
  next: { title: string; dueDate: string; allDay: boolean } | null;
}

type Scope = "current" | "closed" | "all";

const IN_PROGRESS = new Set(["ACTIVE", "PAUSED"]);

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter((w) => /[a-z0-9]/i.test(w[0] ?? ""))
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("") || "·"
  );
}

export function ProjectsTable({ rows }: { rows: ProjectRow[] }) {
  const current = rows.filter((r) => IN_PROGRESS.has(r.status));
  const closed = rows.filter((r) => !IN_PROGRESS.has(r.status));
  const [scope, setScope] = useState<Scope>(current.length > 0 ? "current" : "all");
  const shown = scope === "current" ? current : scope === "closed" ? closed : rows;

  return (
    <div>
      <div className="mb-4">
        <Segmented
          label="Mostrar proyectos"
          value={scope}
          onChange={setScope}
          options={[
            { value: "current", label: "En curso", count: current.length },
            { value: "closed", label: "Cerrados", count: closed.length },
            { value: "all", label: "Todos", count: rows.length },
          ]}
        />
      </div>

      {shown.length === 0 ? (
        <div className="bg-panel border border-line rounded-xl px-6 py-12 text-center">
          <p className="text-fg-mute font-medium">
            {scope === "current" ? "No hay proyectos en curso" : "No hay proyectos cerrados"}
          </p>
          <p className="text-fg-dim text-sm mt-1">
            {scope === "current"
              ? "Los proyectos activos o en pausa aparecen aquí."
              : "Los proyectos completados o cancelados aparecen aquí."}
          </p>
        </div>
      ) : (
        <div className="bg-panel border border-line rounded-xl overflow-hidden">
          <div className="hidden lg:grid grid-cols-[minmax(0,1fr)_112px_160px_minmax(0,220px)_96px] gap-4 px-4 py-2 border-b border-line text-[11px] uppercase tracking-wider text-fg-faint">
            <span>Proyecto</span>
            <span>Estado</span>
            <span>Avance</span>
            <span>Próxima entrega</span>
            <span>Fin</span>
          </div>
          {shown.map((r) => {
            const pct = r.total > 0 ? Math.round((r.done / r.total) * 100) : 0;
            const due = r.next ? dueInfo({ dueDate: r.next.dueDate, allDay: r.next.allDay, completed: false }) : null;
            return (
              <Link
                key={r.id}
                href={`/empresa/proyectos/${r.id}`}
                className="group grid grid-cols-[auto_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_112px_160px_minmax(0,220px)_96px] gap-x-3 lg:gap-4 gap-y-2 items-center px-4 py-3 border-b border-line last:border-b-0 hover:bg-fill transition-colors"
              >
                {/* Proyecto */}
                <div className="col-span-2 lg:col-span-1 flex items-center gap-3 min-w-0">
                  <span className="w-9 h-9 rounded-lg bg-brand/10 border border-brand/20 text-brand-fg text-xs font-semibold flex items-center justify-center shrink-0">
                    {initials(r.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-fg truncate group-hover:text-brand-fg transition-colors">{r.name}</p>
                    <p className={`text-xs truncate ${r.clients.length ? "text-fg-dim" : "text-warn"}`}>
                      {r.clients.length ? r.clients.join(" · ") : "Sin cliente asignado"}
                    </p>
                  </div>
                </div>

                {/* Estado */}
                <div className="col-start-1 lg:col-start-auto">
                  <span className={`inline-block px-2 py-1 text-[11px] leading-none rounded border ${PROJECT_STATUS_COLOR[r.status]}`}>
                    {PROJECT_STATUS_LABEL[r.status]}
                  </span>
                </div>

                {/* Avance */}
                <div className="flex items-center gap-2 min-w-0">
                  {r.total > 0 ? (
                    <>
                      <div className="flex-1 max-w-24 h-1 rounded-full bg-fill-2 overflow-hidden">
                        <div className="h-full bg-ok-solid rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-fg-dim tabular-nums whitespace-nowrap">
                        {r.done}/{r.total}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-fg-faint">Sin tareas</span>
                  )}
                </div>

                {/* Próxima entrega */}
                <div className="col-span-2 lg:col-span-1 min-w-0">
                  {r.next && due ? (
                    <p className="text-xs truncate">
                      <span className={due.tone}>{due.label}</span>
                      <span className="text-fg-dim"> · {r.next.title}</span>
                    </p>
                  ) : (
                    <p className="text-xs text-fg-faint hidden lg:block">—</p>
                  )}
                </div>

                {/* Fin */}
                <p className="hidden lg:block text-xs text-fg-dim">
                  {r.endDate
                    ? new Date(r.endDate).toLocaleDateString("es-PA", { day: "numeric", month: "short", year: "2-digit", timeZone: "UTC" })
                    : "—"}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
