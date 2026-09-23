"use client";

import { useMemo, useState } from "react";
import {
  buildSlotInventories,
  clampPlatformSlot,
  DEFAULT_SLOT_CAPACITY,
  normalizePlatformEmail,
  type EmailSlotInventory,
  type SlotProvider,
} from "@/lib/platform-slots";
import { PlatformConfidentialVault } from "@/components/empresa/platform-confidential-vault";
import { hasPlatformVault } from "@/lib/platform-vault-shared";
import { Icon, ICON } from "@/components/empresa/tasks/task-parts";

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

type PlatformApiRow = Omit<SerializedPlatform, "hasConfidential"> & {
  confidentialVault?: string | null;
  hasConfidential?: boolean;
};

type Tab = "proyectos" | "cuentas";

const PROVIDER_LABEL: Record<SlotProvider, string> = {
  supabase: "Supabase",
  vercel: "Vercel",
};

const LOCAL_ICON = {
  copy: "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z",
  lock: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
  search: "M21 21l-5.2-5.2M17 10a7 7 0 11-14 0 7 7 0 0114 0z",
  alert: "M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z",
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

function byName(a: { name: string }, b: { name: string }) {
  return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
}

/** "https://www.bleiydavo.com/" → "bleiydavo.com" */
function hostOf(url: string | null) {
  if (!url) return null;
  try {
    return new URL(url.includes("://") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function hrefOf(url: string) {
  return url.includes("://") ? url : `https://${url}`;
}

function scoreMatch(p: SerializedPlatform, q: string): number {
  const name = p.name.toLowerCase();
  if (name === q) return 100;
  if (name.startsWith(q)) return 80;
  if (name.includes(q)) return 65;
  const haystack = [p.accessUrl, p.linkUrl, p.supabaseEmail, p.vercelEmail, p.githubEmail, p.brevoEmail, p.notes]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q) ? 40 : 0;
}

// ─── Piezas chicas ───────────────────────────────────────────────────────────

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard
          .writeText(value)
          .then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          })
          .catch(() => {});
      }}
      aria-label={`Copiar ${label}`}
      title={copied ? "Copiado" : `Copiar ${label}`}
      className="w-11 h-11 lg:w-8 lg:h-8 shrink-0 inline-flex items-center justify-center rounded-md text-fg-ghost hover:text-fg-mute hover:bg-fill transition-colors"
    >
      <Icon d={copied ? ICON.check : LOCAL_ICON.copy} className={`w-4 h-4 ${copied ? "text-ok" : ""}`} />
    </button>
  );
}

/** Correo + número de cupo, compacto para la fila de la lista. */
function AccountCell({ email, slot }: { email: string | null; slot: number | null }) {
  if (!email) return <span className="text-fg-ghost text-sm">—</span>;
  const n = clampPlatformSlot(slot);
  return (
    <div className="min-w-0">
      <p className="text-fg-soft text-sm truncate" title={email}>{email}</p>
      <p className={`text-xs tabular-nums ${n == null ? "text-warn" : "text-fg-faint"}`}>
        {n == null ? "Sin número de cupo" : `Cupo ${n} de ${DEFAULT_SLOT_CAPACITY}`}
      </p>
    </div>
  );
}

function DetailRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string | null;
  href?: boolean;
}) {
  return (
    <div className="grid grid-cols-[88px_minmax(0,1fr)_44px] lg:grid-cols-[88px_minmax(0,1fr)_32px] items-center gap-2 min-h-8">
      <dt className="text-fg-faint text-xs">{label}</dt>
      <dd className="min-w-0">
        {!value ? (
          <span className="text-fg-ghost text-sm">—</span>
        ) : href ? (
          <a
            href={hrefOf(value)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-fg text-sm hover:underline truncate block"
            title={value}
          >
            {hostOf(value)}
          </a>
        ) : (
          <span className="text-fg-soft text-sm truncate block" title={value}>{value}</span>
        )}
      </dd>
      {value ? <CopyButton value={value} label={label} /> : <span />}
    </div>
  );
}

function SlotPill({ n, occupant }: { n: number; occupant: string | null }) {
  return (
    <span
      className={`inline-flex items-center gap-1 min-w-0 max-w-full px-2 min-h-8 rounded-md border text-xs ${
        occupant ? "border-line bg-fill text-fg-soft" : "border-ok/30 bg-ok/10 text-ok"
      }`}
    >
      <span className="tabular-nums text-fg-faint shrink-0">{n}</span>
      <span className="truncate">{occupant ?? "Libre"}</span>
    </span>
  );
}

// ─── Tablero ────────────────────────────────────────────────────────────────

export function PlatformsBoard({ initialPlatforms }: PlatformsBoardProps) {
  const [platforms, setPlatforms] = useState(initialPlatforms);
  const [tab, setTab] = useState<Tab>("proyectos");
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<SerializedPlatform>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");

  const inventories = useMemo(() => buildSlotInventories(platforms, DEFAULT_SLOT_CAPACITY), [platforms]);

  const inventoryByKey = useMemo(() => {
    const map = new Map<string, EmailSlotInventory>();
    for (const item of [...inventories.supabase, ...inventories.vercel]) {
      map.set(`${item.provider}:${item.email}`, item);
    }
    return map;
  }, [inventories]);

  /** Una fila por correo, con sus cupos en Supabase y en Vercel lado a lado. */
  const accounts = useMemo(() => {
    const emails = new Set([...inventories.supabase, ...inventories.vercel].map((i) => i.email));
    return [...emails]
      .sort()
      .map((email) => ({
        email,
        supabase: inventoryByKey.get(`supabase:${email}`),
        vercel: inventoryByKey.get(`vercel:${email}`),
      }));
  }, [inventories, inventoryByKey]);

  const knownEmails = useMemo(() => {
    const set = new Set<string>();
    for (const p of platforms) {
      for (const e of [p.supabaseEmail, p.vercelEmail, p.githubEmail, p.brevoEmail]) {
        if (e) set.add(normalizePlatformEmail(e));
      }
    }
    return [...set].sort();
  }, [platforms]);

  const freeSupabase = inventories.supabase.reduce((s, i) => s + i.available, 0);
  const freeVercel = inventories.vercel.reduce((s, i) => s + i.available, 0);

  /** Lo que de verdad hay que arreglar: cupos sin número o repetidos. */
  const issues = useMemo(() => {
    const list: string[] = [];
    for (const item of [...inventories.supabase, ...inventories.vercel]) {
      for (const u of item.unassigned) {
        list.push(`${u.platformName} no tiene número de cupo en ${PROVIDER_LABEL[item.provider]} (${item.email})`);
      }
      for (const c of item.conflicts) {
        list.push(`${c.platforms.join(" y ")} comparten el cupo ${c.slot} en ${PROVIDER_LABEL[item.provider]} (${item.email})`);
      }
    }
    return list;
  }, [inventories]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...platforms].sort(byName);
    return platforms
      .map((p) => ({ p, score: scoreMatch(p, q) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || byName(a.p, b.p))
      .map(({ p }) => p);
  }, [platforms, query]);

  function toggleExpanded(id: string) {
    if (editingId === id) return;
    setExpandedId((cur) => (cur === id ? null : id));
    setEditingId(null);
  }

  function startEdit(p: SerializedPlatform) {
    setExpandedId(p.id);
    setEditingId(p.id);
    setDraft({ ...p });
    setError(null);
  }

  async function request(input: string, init: RequestInit, failMsg: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(input, init);
      if (!res.ok) {
        setError(failMsg);
        return null;
      }
      return await res.json();
    } catch {
      setError(`${failMsg} Revisa la conexión.`);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(id: string) {
    const updated = (await request(
      `/api/empresa/platforms/${id}`,
      { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) },
      "No se pudieron guardar los cambios."
    )) as PlatformApiRow | null;
    if (!updated) return;
    setPlatforms((list) => list.map((p) => (p.id === id ? toSerializedPlatform(updated) : p)));
    setEditingId(null);
  }

  async function addPlatform() {
    const name = newName.trim();
    if (!name) return;
    const created = (await request(
      "/api/empresa/platforms",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) },
      "No se pudo crear la plataforma."
    )) as PlatformApiRow | null;
    if (!created) return;
    const p = toSerializedPlatform(created);
    setPlatforms((list) => [...list, p]);
    setNewName("");
    setShowAdd(false);
    setQuery("");
    setTab("proyectos");
    // Recién creada solo tiene nombre: se abre directo para completar sus datos.
    startEdit(p);
  }

  async function removePlatform(p: SerializedPlatform) {
    if (!window.confirm(`¿Eliminar ${p.name}? Se borran sus accesos y su información confidencial.`)) return;
    const ok = await request(`/api/empresa/platforms/${p.id}`, { method: "DELETE" }, "No se pudo eliminar la plataforma.");
    if (!ok) return;
    setPlatforms((list) => list.filter((item) => item.id !== p.id));
    setEditingId(null);
    setExpandedId(null);
  }

  async function syncCupos() {
    const data = await request("/api/empresa/platforms/sync", { method: "POST" }, "No se pudieron sincronizar los cupos.");
    if (data && Array.isArray(data.platforms)) {
      setPlatforms(data.platforms.map((p: PlatformApiRow) => toSerializedPlatform(p)));
    }
  }

  /** Cupos de un correo en un proveedor, sin contar la plataforma que se edita. */
  function slotOccupants(provider: SlotProvider, email: string | null | undefined, selfId: string) {
    const inv = email ? inventoryByKey.get(`${provider}:${normalizePlatformEmail(email)}`) : undefined;
    const out = new Map<number, string>();
    if (!inv) return out;
    for (const [n, ref] of inv.bySlot) if (ref.platformId !== selfId) out.set(n, ref.platformName);
    return out;
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-fg text-xl font-semibold tracking-tight">Platforms</h1>
          <p className="text-fg-faint text-sm mt-1">Accesos, cuentas de Supabase y Vercel y enlaces de cada proyecto.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          aria-expanded={showAdd}
          className="inline-flex items-center gap-2 px-4 min-h-11 bg-brand hover:bg-brand-hi text-on-brand text-sm font-semibold rounded-lg transition-colors"
        >
          <Icon d={ICON.plus} />
          Nueva plataforma
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void addPlatform();
          }}
          className="bg-panel border border-line rounded-xl p-4 mb-6 flex flex-col sm:flex-row gap-2"
        >
          <label htmlFor="new-platform" className="sr-only">Nombre de la plataforma</label>
          <input
            id="new-platform"
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre del proyecto, p. ej. Academyx"
            className="flex-1 min-w-0 bg-panel-2 border border-line-mid rounded-lg px-3 min-h-11 text-base text-fg placeholder:text-fg-ghost focus:outline-none focus:border-brand/40"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy || !newName.trim()}
              className="flex-1 sm:flex-none px-4 min-h-11 bg-brand hover:bg-brand-hi text-on-brand text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {busy ? "Creando…" : "Crear y completar datos"}
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-4 min-h-11 text-fg-dim hover:text-fg text-sm rounded-lg"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {error && (
        <div role="alert" className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Cerrar aviso" className="w-8 h-8 inline-flex items-center justify-center shrink-0">
            <Icon d={ICON.close} />
          </button>
        </div>
      )}

      {issues.length > 0 && (
        <div className="mb-6 rounded-xl border border-warn/30 bg-warn/10 px-4 py-3">
          <p className="flex items-center gap-2 text-warn text-sm font-medium">
            <Icon d={LOCAL_ICON.alert} />
            {issues.length === 1 ? "1 cupo por revisar" : `${issues.length} cupos por revisar`}
          </p>
          <ul className="mt-1 pl-6 space-y-1 text-sm text-fg-soft list-disc marker:text-warn/60">
            {issues.map((msg) => <li key={msg}>{msg}</li>)}
          </ul>
        </div>
      )}

      {/* Pestañas */}
      <div role="tablist" aria-label="Vistas de plataformas" className="flex gap-6 border-b border-line mb-4">
        {(
          [
            { key: "proyectos", label: "Proyectos", count: platforms.length },
            { key: "cuentas", label: "Cuentas y cupos", count: accounts.length },
          ] as { key: Tab; label: string; count: number }[]
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px flex items-center gap-2 min-h-11 border-b-2 text-sm font-medium transition-colors ${
              tab === t.key ? "border-brand text-fg" : "border-transparent text-fg-dim hover:text-fg-mute"
            }`}
          >
            {t.label}
            <span className="text-xs text-fg-faint tabular-nums">{t.count}</span>
          </button>
        ))}
      </div>

      {tab === "proyectos" ? (
        <>
          <div className="relative mb-4">
            <Icon d={LOCAL_ICON.search} className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-fg-ghost pointer-events-none" />
            <label htmlFor="platform-search" className="sr-only">Buscar plataforma</label>
            <input
              id="platform-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setQuery("")}
              placeholder="Buscar por proyecto, dominio o correo…"
              autoComplete="off"
              className="w-full bg-panel border border-line-mid rounded-lg pl-8 pr-4 min-h-11 text-base text-fg placeholder:text-fg-ghost focus:outline-none focus:border-brand/40 transition-colors"
            />
          </div>

          {platforms.length === 0 ? (
            <div className="bg-panel border border-line rounded-xl px-6 py-12 text-center">
              <p className="text-fg-mute font-medium">Todavía no hay plataformas</p>
              <p className="text-fg-dim text-sm mt-1">
                Registra cada proyecto con su dominio y las cuentas de Supabase y Vercel donde vive.
              </p>
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="mt-6 px-4 min-h-11 bg-brand hover:bg-brand-hi text-on-brand text-sm font-semibold rounded-lg transition-colors"
              >
                Registrar la primera plataforma
              </button>
            </div>
          ) : visible.length === 0 ? (
            <div className="bg-panel border border-line rounded-xl px-6 py-12 text-center">
              <p className="text-fg-mute font-medium">Nada coincide con «{query.trim()}»</p>
              <p className="text-fg-dim text-sm mt-1">Se busca en el nombre, los dominios y los correos de cada plataforma.</p>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="mt-6 px-4 min-h-11 border border-line-mid text-fg-soft hover:text-fg text-sm rounded-lg transition-colors"
              >
                Ver las {platforms.length} plataformas
              </button>
            </div>
          ) : (
            <div className="bg-panel border border-line rounded-xl overflow-hidden">
              <div className="hidden lg:grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_32px] gap-4 px-4 py-2 border-b border-line text-xs uppercase tracking-wider text-fg-faint">
                <span>Proyecto</span>
                <span>Supabase</span>
                <span>Vercel</span>
                <span>GitHub</span>
                <span />
              </div>
              {visible.map((p) => {
                const open = expandedId === p.id;
                const editing = editingId === p.id;
                const host = hostOf(p.accessUrl ?? p.linkUrl);
                return (
                  <div key={p.id} className="border-b border-line last:border-b-0">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(p.id)}
                      aria-expanded={open}
                      className={`w-full text-left px-4 py-3 grid grid-cols-[minmax(0,1fr)_32px] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_32px] gap-x-4 gap-y-2 items-center transition-colors ${
                        open ? "bg-fill" : "hover:bg-fill"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-fg text-sm font-medium flex items-center gap-2 min-w-0">
                          <span className="truncate">{p.name}</span>
                          {p.hasConfidential && (
                            <span title="Tiene información confidencial" className="text-fg-faint shrink-0">
                              <Icon d={LOCAL_ICON.lock} className="w-4 h-4" />
                              <span className="sr-only">Tiene información confidencial</span>
                            </span>
                          )}
                        </p>
                        <p className="text-fg-faint text-xs truncate">{host ?? "Sin dominio"}</p>
                      </div>
                      <Icon
                        d={ICON.chevronDown}
                        className={`w-4 h-4 text-fg-ghost justify-self-end lg:order-last transition-transform ${open ? "rotate-180" : ""}`}
                      />
                      {/* En móvil, las cuentas van debajo del nombre en dos columnas */}
                      <div className="col-span-2 lg:col-span-1 grid grid-cols-2 lg:contents gap-4">
                        <div className="min-w-0">
                          <p className="lg:hidden text-xs text-fg-faint mb-1">Supabase</p>
                          <AccountCell email={p.supabaseEmail} slot={p.supabaseSlot} />
                        </div>
                        <div className="min-w-0">
                          <p className="lg:hidden text-xs text-fg-faint mb-1">Vercel</p>
                          <AccountCell email={p.vercelEmail} slot={p.vercelSlot} />
                        </div>
                        <div className="min-w-0 hidden lg:block">
                          {p.githubEmail ? (
                            <p className="text-fg-soft text-sm truncate" title={p.githubEmail}>{p.githubEmail}</p>
                          ) : (
                            <span className="text-fg-ghost text-sm">—</span>
                          )}
                        </div>
                      </div>
                    </button>

                    {open && (
                      <div className="px-4 pb-4 pt-2 bg-fill">
                        {editing ? (
                          <EditForm
                            draft={draft}
                            setDraft={setDraft}
                            knownEmails={knownEmails}
                            occupants={(provider, email) => slotOccupants(provider, email, p.id)}
                            busy={busy}
                            onSave={() => void saveEdit(p.id)}
                            onCancel={() => setEditingId(null)}
                            onDelete={() => void removePlatform(p)}
                          />
                        ) : (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <section>
                                <h3 className="text-xs uppercase tracking-wider text-fg-faint mb-1">Enlaces</h3>
                                <dl>
                                  <DetailRow label="Acceso" value={p.accessUrl} href />
                                  {p.linkUrl && p.linkUrl !== p.accessUrl && <DetailRow label="Link" value={p.linkUrl} href />}
                                </dl>
                              </section>
                              <section>
                                <h3 className="text-xs uppercase tracking-wider text-fg-faint mb-1">Cuentas</h3>
                                <dl>
                                  <DetailRow label="Supabase" value={p.supabaseEmail} />
                                  <DetailRow label="Vercel" value={p.vercelEmail} />
                                  <DetailRow label="GitHub" value={p.githubEmail} />
                                  <DetailRow label="Brevo" value={p.brevoEmail} />
                                </dl>
                              </section>
                              {p.notes && (
                                <section>
                                  <h3 className="text-xs uppercase tracking-wider text-fg-faint mb-1">Notas</h3>
                                  <p className="text-sm text-fg-soft whitespace-pre-line leading-relaxed">{p.notes}</p>
                                </section>
                              )}
                              <button
                                type="button"
                                onClick={() => startEdit(p)}
                                className="inline-flex items-center gap-2 px-4 min-h-11 border border-line-mid text-fg-soft hover:text-fg text-sm rounded-lg transition-colors"
                              >
                                <Icon d={ICON.pencil} />
                                Editar datos
                              </button>
                            </div>
                            <PlatformConfidentialVault
                              platformId={p.id}
                              hasConfidential={p.hasConfidential}
                              onUpdated={(hasConfidential) =>
                                setPlatforms((list) =>
                                  list.map((item) => (item.id === p.id ? { ...item, hasConfidential } : item))
                                )
                              }
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <p className="text-sm text-fg-dim">
              Cada correo admite {DEFAULT_SLOT_CAPACITY} proyectos por proveedor en el plan gratis.{" "}
              <span className="text-ok tabular-nums">
                Libres: {freeSupabase} en Supabase · {freeVercel} en Vercel
              </span>
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void syncCupos()}
              className="px-4 min-h-11 border border-line-mid text-fg-soft hover:text-fg text-sm rounded-lg transition-colors disabled:opacity-50"
            >
              {busy ? "Sincronizando…" : "Sincronizar cupos"}
            </button>
          </div>

          {accounts.length === 0 ? (
            <div className="bg-panel border border-line rounded-xl px-6 py-12 text-center">
              <p className="text-fg-mute font-medium">Ninguna plataforma tiene cuenta asignada</p>
              <p className="text-fg-dim text-sm mt-1">
                Al poner el correo de Supabase o Vercel en una plataforma, aquí ves cuántos cupos le quedan.
              </p>
            </div>
          ) : (
            <div className="bg-panel border border-line rounded-xl overflow-hidden">
              <div className="hidden md:grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-4 px-4 py-2 border-b border-line text-xs uppercase tracking-wider text-fg-faint">
                <span>Correo</span>
                <span>Supabase</span>
                <span>Vercel</span>
              </div>
              {accounts.map((a) => (
                <div
                  key={a.email}
                  className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-4 gap-y-2 px-4 py-3 border-b border-line last:border-b-0 items-center"
                >
                  <div className="flex items-center gap-1 min-w-0">
                    <p className="text-fg text-sm truncate" title={a.email}>{a.email}</p>
                    <CopyButton value={a.email} label="correo" />
                  </div>
                  {(["supabase", "vercel"] as const).map((provider) => {
                    const inv = a[provider];
                    return (
                      <div key={provider} className="min-w-0">
                        <p className="md:hidden text-xs text-fg-faint mb-1">{PROVIDER_LABEL[provider]}</p>
                        {inv ? (
                          <>
                            <div className="grid grid-cols-2 gap-2">
                              {Array.from({ length: inv.capacity }, (_, i) => i + 1).map((n) => (
                                <SlotPill key={n} n={n} occupant={inv.bySlot.get(n)?.platformName ?? null} />
                              ))}
                            </div>
                            {inv.unassigned.length > 0 && (
                              <p className="text-xs text-warn mt-1">
                                Sin número: {inv.unassigned.map((u) => u.platformName).join(", ")}
                              </p>
                            )}
                          </>
                        ) : (
                          <span className="text-fg-ghost text-sm">Sin uso</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Formulario de edición ──────────────────────────────────────────────────

const inputCls =
  "w-full bg-panel border border-line-mid rounded-lg px-3 min-h-11 text-base text-fg placeholder:text-fg-ghost focus:outline-none focus:border-brand/40";

function EditForm({
  draft,
  setDraft,
  knownEmails,
  occupants,
  busy,
  onSave,
  onCancel,
  onDelete,
}: {
  draft: Partial<SerializedPlatform>;
  setDraft: React.Dispatch<React.SetStateAction<Partial<SerializedPlatform>>>;
  knownEmails: string[];
  occupants: (provider: SlotProvider, email: string | null | undefined) => Map<number, string>;
  busy: boolean;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const set = (key: keyof SerializedPlatform, value: string | number | null) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  function textField(key: "name" | "accessUrl" | "linkUrl" | "githubEmail" | "brevoEmail", label: string, placeholder: string, email = false) {
    const id = `edit-${key}`;
    return (
      <div>
        <label htmlFor={id} className="block text-xs text-fg-faint mb-1">{label}</label>
        <input
          id={id}
          type={email ? "email" : "text"}
          list={email ? "platform-emails" : undefined}
          value={(draft[key] as string | null) ?? ""}
          onChange={(e) => set(key, e.target.value || null)}
          placeholder={placeholder}
          className={inputCls}
        />
      </div>
    );
  }

  function accountField(provider: SlotProvider) {
    const emailKey = provider === "supabase" ? "supabaseEmail" : "vercelEmail";
    const slotKey = provider === "supabase" ? "supabaseSlot" : "vercelSlot";
    const email = draft[emailKey] ?? null;
    const taken = occupants(provider, email);
    const slot = clampPlatformSlot(draft[slotKey] ?? null);
    const id = `edit-${emailKey}`;

    return (
      <fieldset className="rounded-lg border border-line p-3 space-y-3">
        <legend className="px-1 text-xs text-fg-faint">{PROVIDER_LABEL[provider]}</legend>
        <div>
          <label htmlFor={id} className="block text-xs text-fg-faint mb-1">Correo de la cuenta</label>
          <input
            id={id}
            type="email"
            list="platform-emails"
            value={email ?? ""}
            onChange={(e) => {
              const value = e.target.value || null;
              setDraft((prev) => {
                const next = { ...prev, [emailKey]: value };
                // Si el cupo actual está tomado en la cuenta nueva, se propone el primero libre.
                const occ = occupants(provider, value);
                const cur = clampPlatformSlot(prev[slotKey] ?? null);
                if (value && (cur == null || occ.has(cur))) {
                  const free = Array.from({ length: DEFAULT_SLOT_CAPACITY }, (_, i) => i + 1).find((n) => !occ.has(n));
                  next[slotKey] = free ?? cur;
                }
                return next;
              });
            }}
            placeholder="cuenta@gmail.com"
            className={inputCls}
          />
        </div>
        {email && (
          <div>
            <p className="text-xs text-fg-faint mb-1">Cupo en esa cuenta</p>
            <div role="radiogroup" aria-label={`Cupo en ${PROVIDER_LABEL[provider]}`} className="grid grid-cols-2 gap-2">
              {Array.from({ length: DEFAULT_SLOT_CAPACITY }, (_, i) => i + 1).map((n) => {
                const other = taken.get(n);
                const selected = slot === n;
                return (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => set(slotKey, n)}
                    className={`min-h-11 px-3 rounded-lg border text-left text-sm transition-colors ${
                      selected
                        ? other
                          ? "border-danger/50 bg-danger/10 text-fg"
                          : "border-brand/50 bg-brand/10 text-fg"
                        : "border-line-mid text-fg-soft hover:bg-fill-2"
                    }`}
                  >
                    <span className="tabular-nums font-medium">Cupo {n}</span>
                    <span className={`block text-xs truncate ${other ? (selected ? "text-danger" : "text-fg-faint") : "text-ok"}`}>
                      {other ? `Ocupado por ${other}` : "Libre"}
                    </span>
                  </button>
                );
              })}
            </div>
            {taken.size >= DEFAULT_SLOT_CAPACITY && (
              <p className="text-xs text-warn mt-1">
                Esta cuenta ya tiene {DEFAULT_SLOT_CAPACITY} proyectos. Usa otro correo o libera un cupo.
              </p>
            )}
          </div>
        )}
      </fieldset>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
      className="space-y-4"
    >
      <datalist id="platform-emails">
        {knownEmails.map((e) => <option key={e} value={e} />)}
      </datalist>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {textField("name", "Nombre", "Nombre del proyecto")}
        {textField("accessUrl", "Acceso (URL del sitio o panel)", "https://…")}
        {textField("linkUrl", "Link (si es distinto del acceso)", "https://…")}
        {textField("githubEmail", "Cuenta de GitHub", "cuenta@gmail.com", true)}
        {accountField("supabase")}
        {accountField("vercel")}
        {textField("brevoEmail", "Cuenta de Brevo", "cuenta@gmail.com", true)}
        <div className="md:col-span-2">
          <label htmlFor="edit-notes" className="block text-xs text-fg-faint mb-1">Notas</label>
          <textarea
            id="edit-notes"
            rows={3}
            value={draft.notes ?? ""}
            onChange={(e) => set("notes", e.target.value || null)}
            placeholder="Lo que conviene recordar de este proyecto"
            className={`${inputCls} py-2 resize-y`}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={busy || !String(draft.name ?? "").trim()}
          className="px-4 min-h-11 bg-brand hover:bg-brand-hi text-on-brand text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
        >
          {busy ? "Guardando…" : "Guardar cambios"}
        </button>
        <button type="button" onClick={onCancel} className="px-4 min-h-11 text-fg-dim hover:text-fg text-sm rounded-lg">
          Cancelar
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="ml-auto inline-flex items-center gap-2 px-4 min-h-11 text-danger hover:bg-danger/10 text-sm rounded-lg transition-colors disabled:opacity-50"
        >
          <Icon d={ICON.trash} />
          Eliminar plataforma
        </button>
      </div>
    </form>
  );
}
