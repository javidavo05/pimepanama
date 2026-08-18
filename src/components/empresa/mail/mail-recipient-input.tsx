"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  filterRecipientSuggestions,
  RECIPIENT_SOURCE_LABEL,
  type MailRecipientSuggestion,
} from "@/lib/mail/recipient-suggestions";
import { parseMailAddressList } from "@/lib/mail/validate-address";

interface MailRecipientInputProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  disabled?: boolean;
  multiple?: boolean;
  suggestions?: MailRecipientSuggestion[];
  onRequestSuggestions?: () => void;
}

function joinAddresses(addresses: string[]): string {
  return addresses.join(", ");
}

export function MailRecipientInput({
  value,
  onChange,
  label,
  placeholder = "correo@empresa.com",
  disabled = false,
  multiple = true,
  suggestions = [],
  onRequestSuggestions,
}: MailRecipientInputProps) {
  const inputId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [draft, setDraft] = useState("");

  const committed = useMemo(() => parseMailAddressList(value), [value]);

  const query = multiple ? draft : value;
  const filtered = useMemo(
    () => filterRecipientSuggestions(suggestions, query, 10),
    [suggestions, query]
  );

  const showDropdown = open && !disabled && filtered.length > 0;

  useEffect(() => {
    setCursor(0);
  }, [query, filtered.length]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function applyAddresses(addresses: string[]) {
    onChange(joinAddresses(addresses));
    setDraft("");
  }

  function selectSuggestion(item: MailRecipientSuggestion) {
    if (multiple) {
      const next = committed.includes(item.email) ? committed : [...committed, item.email];
      applyAddresses(next);
    } else {
      onChange(item.email);
    }
    setOpen(false);
    inputRef.current?.focus();
  }

  function commitDraft() {
    const parsed = parseMailAddressList(draft);
    if (!parsed.length) return;
    if (multiple) {
      const merged = [...committed];
      for (const addr of parsed) {
        if (!merged.includes(addr)) merged.push(addr);
      }
      applyAddresses(merged);
    } else {
      onChange(parsed[0]);
      setDraft("");
    }
  }

  function removeAddress(email: string) {
    applyAddresses(committed.filter((a) => a !== email));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (multiple && e.key === "Backspace" && !draft && committed.length > 0) {
      e.preventDefault();
      removeAddress(committed[committed.length - 1]);
      return;
    }

    if (multiple && (e.key === "," || e.key === ";") && draft.trim()) {
      e.preventDefault();
      commitDraft();
      return;
    }

    if (e.key === "Enter") {
      if (showDropdown && filtered[cursor]) {
        e.preventDefault();
        selectSuggestion(filtered[cursor]);
        return;
      }
      if (multiple && draft.trim()) {
        e.preventDefault();
        commitDraft();
        return;
      }
    }

    if (!showDropdown) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => (c + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => (c - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const multiPlaceholder =
    committed.length > 0
      ? "Añadir otro correo…"
      : `${placeholder}${multiple ? ", otro@empresa.com" : ""}`;

  return (
    <div ref={rootRef} className="relative">
      <label htmlFor={inputId} className="text-white/40 text-xs">
        {label}
        {multiple ? (
          <span className="text-white/25 font-normal ml-1">(varios con coma)</span>
        ) : null}
      </label>

      <div
        className={`mt-1 min-h-[38px] flex flex-wrap items-center gap-1.5 rounded-lg border px-2 py-1.5 transition-colors ${
          disabled
            ? "bg-white/[0.02] border-white/[0.06] opacity-60"
            : "bg-white/[0.03] border-white/[0.07] focus-within:border-[#1AA7F0]/40"
        }`}
        onClick={() => inputRef.current?.focus()}
      >
        {multiple &&
          committed.map((email) => (
            <span
              key={email}
              className="inline-flex items-center gap-1 max-w-full pl-2 pr-1 py-0.5 rounded-md bg-[#0586FE]/15 border border-[#0586FE]/25 text-[#9ed0ff] text-xs"
            >
              <span className="truncate">{email}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAddress(email);
                  }}
                  className="shrink-0 w-4 h-4 rounded hover:bg-white/10 text-white/50 hover:text-white/80 leading-none"
                  aria-label={`Quitar ${email}`}
                >
                  ×
                </button>
              )}
            </span>
          ))}

        <input
          ref={inputRef}
          id={inputId}
          type="text"
          autoComplete="off"
          inputMode="email"
          value={multiple ? draft : value}
          disabled={disabled}
          placeholder={multiple ? multiPlaceholder : placeholder}
          onFocus={() => {
            onRequestSuggestions?.();
            setOpen(true);
          }}
          onBlur={() => {
            if (multiple) commitDraft();
            setTimeout(() => setOpen(false), 120);
          }}
          onChange={(e) => {
            const next = e.target.value;
            if (multiple) {
              setDraft(next);
            } else {
              onChange(next);
            }
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-[140px] bg-transparent border-0 px-1 py-0.5 text-sm text-white placeholder:text-white/25 focus:outline-none disabled:cursor-not-allowed"
        />
      </div>

      {showDropdown && (
        <ul className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-xl border border-white/[0.08] bg-[#0d0d18] shadow-xl py-1">
          {filtered.map((item, index) => (
            <li key={item.email}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectSuggestion(item)}
                className={`w-full text-left px-3 py-2.5 transition-colors ${
                  index === cursor ? "bg-[#1AA7F0]/10" : "hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-white/85 text-sm truncate">{item.label}</p>
                    <p className="text-[#1AA7F0]/80 text-xs truncate">{item.email}</p>
                    {item.subtitle && (
                      <p className="text-white/35 text-[10px] truncate mt-0.5">{item.subtitle}</p>
                    )}
                  </div>
                  <span className="text-white/30 text-[10px] uppercase tracking-wide shrink-0 pt-0.5">
                    {RECIPIENT_SOURCE_LABEL[item.source]}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
