"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildSlotInventories,
  clampPlatformSlot,
  DEFAULT_SLOT_CAPACITY,
  normalizePlatformEmail,
  slotStatusColor,
  type EmailSlotInventory,
  type SlotProvider,
} from "@/lib/platform-slots";
import { PlatformConfidentialVault } from "@/components/empresa/platform-confidential-vault";
import { hasPlatformVault } from "@/lib/platform-vault-shared";

export type SerializedPlatform = {
  id: string;
  name: string;
  accessUrl: string | null;
  supabaseEmail: string | null;
  supabaseSlot: number | null;
  vercelEmail: string | null;
  vercelSlot: number | null;
  linkUrl: string | null;
  githubEmail: string | null;
  brevoEmail: string | null;
  notes: string | null;
  hasConfidential: boolean;
  sortOrder: number;
};

interface PlatformsBoardProps {
  initialPlatforms: SerializedPlatform[];
}

const PROVIDER_LABEL: Record<SlotProvider, string> = {
  supabase: "Supabase",
  vercel: "Vercel",
};

const PROVIDER_ACCENT: Record<SlotProvider, string> = {
  supabase: "text-[#3ECF8E]",
  vercel: "text-white",
};

function copyText(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

function parseSlotInput(raw: string | number | null | undefined): number | null {
  const s = String(raw ?? "");
  if (!s.trim()) return null;
  return clampPlatformSlot(Number(s));
}

function normalizeSearch(text: string) {
  return String(text).trim().toLowerCase();
}

function platformEmailKey(provider: SlotProvider, email: string | null | undefined): string | null {
  const normalized = normalizePlatformEmail(email);
  return normalized ? `${provider}:${normalized}` : null;
}

type PlatformApiRow = {
  id: string;
  name: string;
  accessUrl: string | null;
  supabaseEmail: string | null;
  supabaseSlot: number | null;
  vercelEmail: string | null;
  vercelSlot: number | null;
  linkUrl: string | null;
  githubEmail: string | null;
  brevoEmail: string | null;
  notes: string | null;
  confidentialVault?: string | null;
  hasConfidential?: boolean;
  sortOrder: number;
};

function toSerializedPlatform(p: PlatformApiRow): SerializedPlatform {
  return {
    id: p.id,
    name: p.name,
    accessUrl: p.accessUrl,
    supabaseEmail: p.supabaseEmail,
    supabaseSlot: p.supabaseSlot,
    vercelEmail: p.vercelEmail,
    vercelSlot: p.vercelSlot,
    linkUrl: p.linkUrl,
    githubEmail: p.githubEmail,
    brevoEmail: p.brevoEmail,
    notes: p.notes,
    hasConfidential: p.hasConfidential ?? hasPlatformVault(p.confidentialVault),
    sortOrder: p.sortOrder,
  };
}

function platformSearchHaystack(p: SerializedPlatform) {
  return [
    p.name,
    p.accessUrl,
    p.linkUrl,
    p.supabaseEmail,
    p.vercelEmail,
    p.githubEmail,
    p.brevoEmail,
    p.notes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function scorePlatformMatch(p: SerializedPlatform, query: string): number {
  const q = normalizeSearch(query);
  if (!q) return 0;
  const name = p.name.toLowerCase();
  if (name === q) return 100;
  if (name.startsWith(q)) return 80;
  if (name.includes(q)) return 65;
  const haystack = platformSearchHaystack(p);
  if (haystack.includes(q)) return 40;
  return 0;
}

function rankPlatformMatches(platforms: SerializedPlatform[], query: string) {
  const q = normalizeSearch(query);
  if (!q) return [];
  return platforms
    .map((p) => ({ p, score: scorePlatformMatch(p, q) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.p.name.localeCompare(b.p.name))
    .map(({ p }) => p);
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <span className="text-white font-semibold">{text.slice(i, i + q.length)}</span>
      {text.slice(i + q.length)}
    </>
  );
}

function PlatformSearchInput({
  platforms,
  value,
  onChange,
  onSelect,
}: {
  platforms: SerializedPlatform[];
  value: string;
  onChange: (value: string) => void;
  onSelect: (platform: SerializedPlatform) => void;
}) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(
    () => rankPlatformMatches(platforms, value).slice(0, 8),
    [platforms, value]
  );

  const ghostSuffix = useCallback(() => {
    const q = value.trim();
    if (!q || suggestions.length === 0) return "";
    const first = suggestions[0];
    if (
      first.name.toLowerCase().startsWith(q.toLowerCase()) &&
      first.name.length > q.length
    ) {
      return first.name.slice(q.length);
    }
    return "";
  }, [value, suggestions])();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function pick(platform: SerializedPlatform) {
    onSelect(platform);
    onChange(platform.name);
    setOpen(false);
    setCursor(0);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Tab" && ghostSuffix) {
      e.preventDefault();
      onChange(value + ghostSuffix);
      setCursor(0);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && suggestions[cursor]) pick(suggestions[cursor]);
      else if (suggestions.length === 1) pick(suggestions[0]);
    } else if (e.key === "Escape") {
      setOpen(false);
      onChange("");
    }
  }

  const showDropdown = open && value.trim().length > 0 && suggestions.length > 0;

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        {ghostSuffix && open && (
          <div
            aria-hidden
            className="absolute inset-0 px-3 py-2.5 text-sm pointer-events-none flex items-center overflow-hidden rounded-lg"
          >
            <span className="invisible whitespace-pre">{value}</span>
            <span className="text-white/45">{ghostSuffix}</span>
          </div>
        )}
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setCursor(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar proyecto…"
          autoComplete="off"
          className="w-full bg-[#0a0a10] border border-white/[0.1] rounded-lg pl-9 pr-20 py-2.5 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-[#1AA7F0]/40 transition-colors"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35 text-sm pointer-events-none">
          ⌕
        </span>
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white/45 hover:text-white/70 px-2 py-1 rounded"
          >
            Limpiar
          </button>
        )}
        {ghostSuffix && open && (
          <span className="absolute right-16 top-1/2 -translate-y-1/2 text-[9px] text-white/40 font-mono bg-white/[0.04] px-1 py-0.5 rounded pointer-events-none">
            Tab ↹
          </span>
        )}
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#0d0d18] border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden z-50 max-h-64 overflow-y-auto">
          {suggestions.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                pick(p);
              }}
              onMouseEnter={() => setCursor(i)}
              className={`w-full text-left px-4 py-2.5 transition-colors flex items-center justify-between gap-3 ${
                cursor === i ? "bg-white/[0.07]" : "hover:bg-white/[0.04]"
              }`}
            >
              <div className="min-w-0">
                <p className="text-white/85 text-sm truncate">
                  <HighlightMatch text={p.name} query={value} />
                </p>
                {p.accessUrl && (
                  <p className="text-white/40 text-[11px] truncate mt-0.5">{p.accessUrl}</p>
                )}
              </div>
              <span className="text-[10px] text-white/35 shrink-0 font-mono">
                {p.supabaseSlot != null ? `SB ${p.supabaseSlot}` : ""}
                {p.supabaseSlot != null && p.vercelSlot != null ? " · " : ""}
                {p.vercelSlot != null ? `V ${p.vercelSlot}` : ""}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FieldRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string | null | undefined;
  href?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-2 text-xs">
      <span className="text-white/45 shrink-0">{label}</span>
      <div className="flex items-center gap-1 min-w-0">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#1AA7F0] hover:underline truncate"
          >
            {value}
          </a>
        ) : (
          <span className="text-white/75 truncate">{value}</span>
        )}
        <button
          type="button"
          onClick={() => copyText(value)}
          className="text-white/35 hover:text-white/60 shrink-0"
          title="Copiar"
        >
          ⧉
        </button>
      </div>
    </div>
  );
}

function SlotBadge({
  slot,
  capacity,
  conflict,
}: {
  slot: number | null;
  capacity: number;
  conflict?: boolean;
}) {
  if (slot == null) {
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 font-medium">
        Sin cupo
      </span>
    );
  }
  const over = slot > capacity;
  return (
    <span
      className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold font-mono ${
        conflict || over
          ? "border-red-500/40 bg-red-500/15 text-red-400"
          : "border-[#1AA7F0]/35 bg-[#1AA7F0]/15 text-[#1AA7F0]"
      }`}
    >
      Cupo {slot}/{capacity}
    </span>
  );
}

function AccountSlotRow({
  provider,
  email,
  slot,
  capacity,
  inventory,
}: {
  provider: SlotProvider;
  email: string;
  slot: number | null;
  capacity: number;
  inventory?: EmailSlotInventory;
}) {
  const displaySlot = clampPlatformSlot(slot, capacity);
  const conflict =
    displaySlot != null &&
    (inventory?.conflicts.some((c) => c.slot === displaySlot) ?? false);

  const status =
    inventory == null
      ? "unknown"
      : inventory.available <= 0
        ? "full"
        : inventory.available < inventory.capacity
          ? "partial"
          : "free";

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-[10px] uppercase tracking-widest font-medium ${PROVIDER_ACCENT[provider]}`}>
            {PROVIDER_LABEL[provider]}
          </p>
          <p className="text-white/80 text-xs truncate mt-0.5">{email}</p>
        </div>
        <SlotBadge slot={displaySlot} capacity={capacity} conflict={conflict} />
      </div>
      {inventory && (
        <div className="flex items-center gap-2">
          <div className="flex gap-1 flex-1">
            {Array.from({ length: capacity }, (_, i) => i + 1).map((n) => {
              const occupant = inventory.bySlot.get(n);
              const isThis = displaySlot === n;
              const taken = !!occupant;
              return (
                <div
                  key={n}
                  title={
                    occupant
                      ? `${occupant.platformName} (cupo ${n})`
                      : `Cupo ${n} disponible`
                  }
                  className={`flex-1 h-2 rounded-full transition-colors ${
                    taken
                      ? isThis
                        ? "bg-[#1AA7F0] ring-1 ring-[#1AA7F0]/50"
                        : "bg-white/25"
                      : "bg-green-500/40"
                  }`}
                />
              );
            })}
          </div>
          <span
            className={`text-[10px] font-mono shrink-0 ${
              status === "full"
                ? "text-red-400"
                : status === "partial"
                  ? "text-amber-400"
                  : "text-green-400"
            }`}
          >
            {inventory.available} libre
          </span>
        </div>
      )}
    </div>
  );
}

function InventoryCard({ item }: { item: EmailSlotInventory }) {
  const statusCls = slotStatusColor(item.available, item.capacity);

  return (
    <div className={`rounded-xl border p-3 space-y-2 ${statusCls}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest opacity-70">
            {PROVIDER_LABEL[item.provider]}
          </p>
          <p className="text-sm font-medium truncate">{item.email}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-mono font-semibold leading-none">
            {item.available}/{item.capacity}
          </p>
          <p className="text-[10px] opacity-70 mt-0.5">disponibles</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {Array.from({ length: item.capacity }, (_, i) => i + 1).map((n) => {
          const occupant = item.bySlot.get(n);
          return (
            <div
              key={n}
              className={`rounded-lg px-2 py-1.5 text-[11px] border ${
                occupant
                  ? "border-white/10 bg-black/20 text-white/75"
                  : "border-green-500/25 bg-green-500/10 text-green-400"
              }`}
            >
              <span className="font-mono font-semibold">#{n}</span>
              <span className="mx-1 opacity-40">·</span>
              <span className="truncate">{occupant ? occupant.platformName : "Libre"}</span>
            </div>
          );
        })}
      </div>

      {item.unassigned.length > 0 && (
        <p className="text-[10px] opacity-80">
          Sin cupo asignado: {item.unassigned.map((u) => u.platformName).join(", ")}
        </p>
      )}
      {item.conflicts.length > 0 && (
        <p className="text-[10px] text-red-300">
          Conflicto: cupo duplicado en{" "}
          {item.conflicts.map((c) => `#${c.slot} (${c.platforms.join(", ")})`).join("; ")}
        </p>
      )}
    </div>
  );
}

export function PlatformsBoard({ initialPlatforms }: PlatformsBoardProps) {
  const [platforms, setPlatforms] = useState(initialPlatforms);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<SerializedPlatform>>({});
  const [busy, setBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [showInventory, setShowInventory] = useState(true);
  const [filterAvailable, setFilterAvailable] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedPlatformId, setFocusedPlatformId] = useState<string | null>(null);

  const inventories = useMemo(
    () => buildSlotInventories(platforms, DEFAULT_SLOT_CAPACITY),
    [platforms]
  );

  const inventoryByKey = useMemo(() => {
    const map = new Map<string, EmailSlotInventory>();
    for (const item of [...inventories.supabase, ...inventories.vercel]) {
      map.set(`${item.provider}:${item.email}`, item);
    }
    return map;
  }, [inventories]);

  const emailsWithAvailability = useMemo(() => {
    const set = new Set<string>();
    for (const item of [...inventories.supabase, ...inventories.vercel]) {
      if (item.available > 0) set.add(`${item.provider}:${item.email}`);
    }
    return set;
  }, [inventories]);

  const visiblePlatforms = useMemo(() => {
    let list = platforms;
    if (filterAvailable) {
      list = list.filter((p) => {
        const sbKey = platformEmailKey("supabase", p.supabaseEmail);
        const vcKey = platformEmailKey("vercel", p.vercelEmail);
        return (
          (sbKey && emailsWithAvailability.has(sbKey)) ||
          (vcKey && emailsWithAvailability.has(vcKey))
        );
      });
    }
    const q = normalizeSearch(searchQuery);
    if (!q) return list;
    const matched = new Set(rankPlatformMatches(list, q).map((p) => p.id));
    return list.filter((p) => matched.has(p.id));
  }, [platforms, filterAvailable, emailsWithAvailability, searchQuery]);

  const totalFreeSupabase = inventories.supabase.reduce((s, i) => s + i.available, 0);
  const totalFreeVercel = inventories.vercel.reduce((s, i) => s + i.available, 0);

  useEffect(() => {
    if (!focusedPlatformId) return;
    const el = document.getElementById(`platform-card-${focusedPlatformId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    const timer = window.setTimeout(() => setFocusedPlatformId(null), 2400);
    return () => window.clearTimeout(timer);
  }, [focusedPlatformId]);

  function handleSearchSelect(platform: SerializedPlatform) {
    setFocusedPlatformId(platform.id);
  }

  function getInventory(provider: SlotProvider, email: string) {
    return inventoryByKey.get(`${provider}:${normalizePlatformEmail(email)}`);
  }

  function startEdit(p: SerializedPlatform) {
    setEditingId(p.id);
    setDraft({ ...p });
  }

  async function saveEdit(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/empresa/platforms/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) return;
      const updated = (await res.json()) as PlatformApiRow;
      setPlatforms((list) =>
        list.map((p) => (p.id === id ? toSerializedPlatform(updated) : p))
      );
      setEditingId(null);
    } finally {
      setBusy(false);
    }
  }

  async function addPlatform() {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/empresa/platforms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) return;
      const created = (await res.json()) as PlatformApiRow;
      setPlatforms((list) => [...list, toSerializedPlatform(created)]);
      setNewName("");
      setShowAdd(false);
    } finally {
      setBusy(false);
    }
  }

  async function removePlatform(id: string) {
    if (!window.confirm("¿Eliminar esta plataforma?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/empresa/platforms/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      setPlatforms((list) => list.filter((p) => p.id !== id));
    } finally {
      setBusy(false);
    }
  }

  async function syncCupos() {
    setBusy(true);
    try {
      const res = await fetch("/api/empresa/platforms/sync", { method: "POST" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.platforms)) {
        setPlatforms(data.platforms.map((p: PlatformApiRow) => toSerializedPlatform(p)));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <p className="text-white/55">{platforms.length} plataformas</p>
          <span className="text-green-400/90 text-xs font-mono">
            SB {totalFreeSupabase} cupos libres
          </span>
          <span className="text-green-400/90 text-xs font-mono">
            Vercel {totalFreeVercel} cupos libres
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void syncCupos()}
            className="px-3 py-2 border border-white/[0.1] text-white/60 hover:text-white text-sm rounded-lg transition-colors disabled:opacity-50"
          >
            {busy ? "Sincronizando..." : "Sincronizar cupos"}
          </button>
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="px-4 py-2 bg-[#1AA7F0] hover:bg-[#0E87C8] text-white text-sm font-medium rounded-lg transition-colors"
          >
            + Plataforma
          </button>
        </div>
      </div>

      <PlatformSearchInput
        platforms={platforms}
        value={searchQuery}
        onChange={(v) => {
          setSearchQuery(v);
          if (!v.trim()) setFocusedPlatformId(null);
        }}
        onSelect={handleSearchSelect}
      />

      {searchQuery.trim() && (
        <p className="text-xs text-white/45 -mt-2">
          {visiblePlatforms.length === 0
            ? "Sin coincidencias"
            : `${visiblePlatforms.length} resultado${visiblePlatforms.length === 1 ? "" : "s"}`}
        </p>
      )}

      {/* Panel de cupos */}
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowInventory((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
        >
          <div className="text-left">
            <p className="text-white text-sm font-medium">Disponibilidad de cupos</p>
            <p className="text-white/45 text-xs mt-0.5">
              Máx. {DEFAULT_SLOT_CAPACITY} proyectos por correo en Supabase y Vercel
            </p>
          </div>
          <span className="text-white/40 text-sm">{showInventory ? "▾" : "▸"}</span>
        </button>

        {showInventory && (
          <div className="px-4 pb-4 space-y-4 border-t border-white/[0.06]">
            <div className="flex flex-wrap gap-2 pt-3">
              <button
                type="button"
                onClick={() => setFilterAvailable(false)}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                  !filterAvailable
                    ? "bg-white/10 border-white/20 text-white"
                    : "border-white/[0.08] text-white/45"
                }`}
              >
                Todas las plataformas
              </button>
              <button
                type="button"
                onClick={() => setFilterAvailable(true)}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                  filterAvailable
                    ? "bg-green-500/15 border-green-500/30 text-green-400"
                    : "border-white/[0.08] text-white/45"
                }`}
              >
                Solo con cupo disponible
              </button>
            </div>

            {inventories.supabase.length > 0 && (
              <div>
                <p className="text-[#3ECF8E] text-xs uppercase tracking-widest font-medium mb-2">
                  Supabase
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                  {inventories.supabase.map((item) => (
                    <InventoryCard key={item.email} item={item} />
                  ))}
                </div>
              </div>
            )}

            {inventories.vercel.length > 0 && (
              <div>
                <p className="text-white/70 text-xs uppercase tracking-widest font-medium mb-2">
                  Vercel
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                  {inventories.vercel.map((item) => (
                    <InventoryCard key={item.email} item={item} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showAdd && (
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 flex flex-col sm:flex-row gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre de la plataforma"
            className="flex-1 bg-[#0a0a10] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/35"
          />
          <button
            type="button"
            disabled={busy || !newName.trim()}
            onClick={addPlatform}
            className="px-4 py-2 bg-green-600/80 hover:bg-green-600 text-white text-sm rounded-lg disabled:opacity-50"
          >
            Guardar
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {visiblePlatforms.map((p) => {
          const isEditing = editingId === p.id;
          const d = isEditing ? draft : p;

          return (
            <div
              key={p.id}
              id={`platform-card-${p.id}`}
              className={`bg-[#0a0a10] border rounded-xl p-4 space-y-3 hover:border-white/[0.12] transition-colors ${
                focusedPlatformId === p.id
                  ? "border-[#1AA7F0]/60 ring-2 ring-[#1AA7F0]/25"
                  : "border-white/[0.06]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                {isEditing ? (
                  <input
                    value={d.name ?? ""}
                    onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                    className="flex-1 bg-[#07070e] border border-white/[0.1] rounded px-2 py-1 text-sm text-white font-medium"
                  />
                ) : (
                  <h3 className="text-white font-medium text-sm flex items-center gap-1.5">
                    {p.name}
                    {p.hasConfidential && (
                      <span className="text-[9px] text-amber-400/80" title="Tiene información confidencial">
                        🔒
                      </span>
                    )}
                  </h3>
                )}
                <div className="flex gap-1 shrink-0">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => saveEdit(p.id)}
                        className="text-xs text-green-400 hover:text-green-300 px-2 py-1"
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="text-xs text-white/45 hover:text-white/70 px-2 py-1"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => startEdit(p)}
                        className="text-xs text-white/45 hover:text-[#1AA7F0] px-2 py-1"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => removePlatform(p.id)}
                        className="text-xs text-white/35 hover:text-red-400 px-2 py-1"
                      >
                        ×
                      </button>
                    </>
                  )}
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  {(
                    [
                      ["accessUrl", "Access"],
                      ["linkUrl", "Link"],
                      ["supabaseEmail", "Supabase"],
                      ["vercelEmail", "Vercel"],
                      ["githubEmail", "Github"],
                      ["brevoEmail", "BREVO"],
                      ["notes", "Notas"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key}>
                      <label className="text-[10px] text-white/40 uppercase tracking-wider">
                        {label}
                      </label>
                      <input
                        value={(d[key] as string) ?? ""}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            [key]: e.target.value || null,
                          }))
                        }
                        className="w-full mt-0.5 bg-[#07070e] border border-white/[0.08] rounded px-2 py-1.5 text-xs text-white"
                      />
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-white/40 uppercase">
                        Cupo Supabase (1–{DEFAULT_SLOT_CAPACITY})
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={DEFAULT_SLOT_CAPACITY}
                        placeholder="1 o 2"
                        value={d.supabaseSlot ?? ""}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            supabaseSlot: parseSlotInput(e.target.value),
                          }))
                        }
                        className="w-full mt-0.5 bg-[#07070e] border border-white/[0.08] rounded px-2 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/40 uppercase">
                        Cupo Vercel (1–{DEFAULT_SLOT_CAPACITY})
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={DEFAULT_SLOT_CAPACITY}
                        placeholder="1 o 2"
                        value={d.vercelSlot ?? ""}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            vercelSlot: parseSlotInput(e.target.value),
                          }))
                        }
                        className="w-full mt-0.5 bg-[#07070e] border border-white/[0.08] rounded px-2 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <FieldRow label="Access" value={p.accessUrl} href={p.accessUrl} />
                  <FieldRow label="Link" value={p.linkUrl} href={p.linkUrl} />

                  {p.supabaseEmail && (
                    <AccountSlotRow
                      provider="supabase"
                      email={p.supabaseEmail}
                      slot={clampPlatformSlot(p.supabaseSlot, DEFAULT_SLOT_CAPACITY)}
                      capacity={DEFAULT_SLOT_CAPACITY}
                      inventory={getInventory("supabase", p.supabaseEmail)}
                    />
                  )}
                  {p.vercelEmail && (
                    <AccountSlotRow
                      provider="vercel"
                      email={p.vercelEmail}
                      slot={clampPlatformSlot(p.vercelSlot, DEFAULT_SLOT_CAPACITY)}
                      capacity={DEFAULT_SLOT_CAPACITY}
                      inventory={getInventory("vercel", p.vercelEmail)}
                    />
                  )}

                  <FieldRow label="Github" value={p.githubEmail} />
                  <FieldRow label="BREVO" value={p.brevoEmail} />
                  {p.notes && (
                    <p className="text-[11px] text-amber-400/80 border-t border-white/[0.06] pt-2 mt-2">
                      {p.notes}
                    </p>
                  )}
                </div>
              )}

              {!isEditing && (
                <PlatformConfidentialVault
                  platformId={p.id}
                  hasConfidential={p.hasConfidential}
                  onUpdated={(hasConfidential) =>
                    setPlatforms((list) =>
                      list.map((item) =>
                        item.id === p.id ? { ...item, hasConfidential } : item
                      )
                    )
                  }
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
