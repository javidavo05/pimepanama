"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { LeadStatus, LeadPriority } from "@prisma/client";
import { updateLeadStatusAction } from "@/app/(empresa)/empresa/actions";
import type { SerializedLead } from "@/lib/serializers";
import { priorityRank, LEAD_PRIORITIES } from "@/components/empresa/lead-priority-badge";
import { LEAD_STATUSES } from "@/components/empresa/lead-status";
import { LeadsTable, LeadsCardList } from "./leads-table";
import { LeadsKanban } from "./leads-kanban";

type Vista = "tabla" | "tablero";

const SELECT =
  "rounded-lg border border-line bg-panel px-3 py-2 text-sm text-fg-mute outline-none transition-colors hover:border-line-mid focus:border-brand/50";

export function LeadsView({ leads: initialLeads }: { leads: SerializedLead[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [vista, setVista] = useState<Vista>("tabla");
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<LeadStatus | "TODOS">("TODOS");
  const [prioridad, setPrioridad] = useState<LeadPriority | "TODAS">("TODAS");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleStatusChange(id: string, status: LeadStatus) {
    const lead = leads.find((l) => l.id === id);
    if (!lead || lead.status === status) return;

    const previous = leads;
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    setSavingId(id);
    try {
      const updated = await updateLeadStatusAction(id, status);
      setLeads((prev) => prev.map((l) => (l.id === id ? updated : l)));
      if (status === "GANADO" && !lead.convertedClientId) {
        setNotice(`"${lead.name}" se convirtió en cliente automáticamente.`);
        setTimeout(() => setNotice(null), 5000);
      }
    } catch {
      setLeads(previous);
      setNotice("No se pudo cambiar la etapa. Revisá la conexión e intentá de nuevo.");
      setTimeout(() => setNotice(null), 5000);
    } finally {
      setSavingId(null);
    }
  }

  const filtrados = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return leads
      .filter((l) => {
        if (estado !== "TODOS" && l.status !== estado) return false;
        if (prioridad !== "TODAS" && l.priority !== prioridad) return false;
        if (!needle) return true;
        return [l.name, l.company, l.email, l.phone]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(needle));
      })
      .sort(
        (a, b) =>
          priorityRank(a.priority) - priorityRank(b.priority) ||
          +new Date(b.createdAt) - +new Date(a.createdAt)
      );
  }, [leads, q, estado, prioridad]);

  const altas = leads.filter((l) => l.priority === "ALTA").length;
  const filtrando = q.trim() !== "" || estado !== "TODOS" || prioridad !== "TODAS";

  // Sin ningún lead todavía: explicar qué va a aparecer y ofrecer la acción.
  if (leads.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-panel px-6 py-12 text-center">
        <p className="text-sm font-medium text-fg-mute">Todavía no hay prospectos</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-fg-faint">
          Cada solicitud del formulario de pimepanama.com entra acá sola, ya clasificada por
          prioridad. También podés cargar uno a mano.
        </p>
        <Link
          href="/empresa/leads/nuevo"
          className="mt-6 inline-flex rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-on-brand transition-all hover:bg-brand-hi"
        >
          Cargar el primer lead
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {notice && (
        <div className="flex items-center justify-between rounded-lg border border-ok/20 bg-ok/[0.08] px-4 py-3 text-sm text-ok">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-ok hover:text-ok">
            ×
          </button>
        </div>
      )}

      {/* Barra de control */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, empresa, correo o teléfono"
          aria-label="Buscar prospectos"
          className="min-w-[220px] flex-1 rounded-lg border border-line bg-panel px-4 py-2 text-sm text-fg placeholder-fg-trace outline-none transition-colors focus:border-brand/50"
        />

        <select
          value={prioridad}
          onChange={(e) => setPrioridad(e.target.value as LeadPriority | "TODAS")}
          aria-label="Filtrar por prioridad"
          className={SELECT}
        >
          <option value="TODAS">Toda prioridad{altas ? ` · ${altas} alta${altas > 1 ? "s" : ""}` : ""}</option>
          {LEAD_PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              Prioridad {p.label.toLowerCase()}
            </option>
          ))}
        </select>

        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value as LeadStatus | "TODOS")}
          aria-label="Filtrar por etapa"
          className={SELECT}
        >
          <option value="TODOS">Toda etapa</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label} · {leads.filter((l) => l.status === s.value).length}
            </option>
          ))}
        </select>

        <div className="flex rounded-lg border border-line p-1">
          {(["tabla", "tablero"] as Vista[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVista(v)}
              className={`rounded px-3 py-1 text-xs font-medium capitalize transition-colors ${
                vista === v ? "bg-fill-2 text-fg-soft" : "text-fg-faint hover:text-fg-mute"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-fg-faint">
        {filtrados.length === leads.length
          ? `${leads.length} prospecto${leads.length === 1 ? "" : "s"}`
          : `${filtrados.length} de ${leads.length}`}
      </p>

      {filtrados.length === 0 ? (
        <div className="rounded-xl border border-line bg-panel px-6 py-12 text-center">
          <p className="text-sm text-fg-dim">Ningún prospecto coincide con el filtro.</p>
          <button
            type="button"
            onClick={() => {
              setQ("");
              setEstado("TODOS");
              setPrioridad("TODAS");
            }}
            className="mt-4 text-sm text-brand-fg hover:underline"
          >
            Limpiar filtros
          </button>
        </div>
      ) : vista === "tablero" ? (
        <LeadsKanban leads={filtrados} onStatusChange={handleStatusChange} />
      ) : (
        <>
          <div className="hidden md:block">
            <LeadsTable leads={filtrados} onStatusChange={handleStatusChange} savingId={savingId} />
          </div>
          <div className="md:hidden">
            <LeadsCardList leads={filtrados} />
          </div>
        </>
      )}

      {filtrando && vista === "tablero" && (
        <p className="text-xs text-fg-ghost">
          El tablero muestra solo los {filtrados.length} prospectos filtrados.
        </p>
      )}
    </div>
  );
}
