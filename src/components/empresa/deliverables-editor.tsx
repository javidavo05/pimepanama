"use client";

export type DeliverableDraft = {
  name: string;
  description: string;
  dueDate: string;
};

interface DeliverablesEditorProps {
  items: DeliverableDraft[];
  onChange: (items: DeliverableDraft[]) => void;
  /** Cuántos vinieron del análisis del documento, para señalarlo. */
  fromDocument?: number;
}

export function DeliverablesEditor({ items, onChange, fromDocument = 0 }: DeliverablesEditorProps) {
  function update(i: number, patch: Partial<DeliverableDraft>) {
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  return (
    <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium">
            Entregables
          </h3>
          <p className="text-white/45 text-xs mt-1">
            {fromDocument > 0
              ? `${fromDocument} extraído${fromDocument !== 1 ? "s" : ""} del documento. Revísalos y ajusta lo que haga falta.`
              : "Lo concreto y verificable que se compromete a entregar."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange([...items, { name: "", description: "", dueDate: "" }])}
          className="text-[#1AA7F0] text-xs hover:text-[#4FC0FF] transition-colors shrink-0"
        >
          + Agregar
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-white/35 text-xs">Sin entregables definidos.</p>
      ) : (
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="border border-white/[0.06] rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-white/30 text-[10px] font-mono w-5 shrink-0">{i + 1}.</span>
                <input
                  value={it.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                  placeholder="Nombre del entregable"
                  className="flex-1 bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#1AA7F0]/40"
                />
                <input
                  type="date"
                  value={it.dueDate}
                  onChange={(e) => update(i, { dueDate: e.target.value })}
                  className="w-40 bg-white/[0.03] border border-white/[0.07] rounded-lg px-2 py-2 text-white text-xs focus:outline-none focus:border-[#1AA7F0]/40 [color-scheme:dark]"
                />
                <button
                  type="button"
                  onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                  className="text-white/35 hover:text-red-400 text-sm px-1 shrink-0"
                >
                  ×
                </button>
              </div>
              <input
                value={it.description}
                onChange={(e) => update(i, { description: e.target.value })}
                placeholder="Descripción (opcional)"
                className="w-full bg-white/[0.02] border border-white/[0.05] rounded-lg px-3 py-1.5 text-white/70 text-xs placeholder-white/20 focus:outline-none focus:border-[#1AA7F0]/30"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
