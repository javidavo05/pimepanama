"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { THEME_STORAGE_KEY } from "./theme-script";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  /** Lo que eligió la persona. Puede ser "system". */
  preference: ThemePreference;
  /** Lo que se está pintando ahora mismo. Nunca es "system". */
  resolved: ResolvedTheme;
  setPreference: (next: ThemePreference) => void;
  /** false hasta que el cliente leyó localStorage; evita pintar el estado equivocado. */
  ready: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const DARK_QUERY = "(prefers-color-scheme: dark)";

function readSystem(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

function readStored(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    return raw === "light" || raw === "dark" || raw === "system" ? raw : "system";
  } catch {
    return "system";
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [resolved, setResolved] = useState<ResolvedTheme>("dark");
  const [ready, setReady] = useState(false);

  const apply = useCallback((pref: ThemePreference) => {
    const next = pref === "system" ? readSystem() : pref;
    setResolved(next);
    document.documentElement.setAttribute("data-theme", next);
  }, []);

  // Arranque: adoptamos lo que ya dejó ThemeScript, sin reescribir el atributo.
  useEffect(() => {
    const stored = readStored();
    setPreferenceState(stored);
    apply(stored);
    setReady(true);
  }, [apply]);

  // Con preferencia "system" seguimos al SO en vivo, sin recargar.
  useEffect(() => {
    if (preference !== "system") return;
    const mq = window.matchMedia(DARK_QUERY);
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [preference, apply]);

  // Si cambian el tema en otra pestaña, esta se pone al día.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== THEME_STORAGE_KEY) return;
      const stored = readStored();
      setPreferenceState(stored);
      apply(stored);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [apply]);

  const setPreference = useCallback(
    (next: ThemePreference) => {
      setPreferenceState(next);
      apply(next);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        /* modo privado: el tema vale para esta sesión y ya */
      }
    },
    [apply],
  );

  return (
    <ThemeContext.Provider value={{ preference, resolved, setPreference, ready }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme debe usarse dentro de <ThemeProvider>");
  return ctx;
}
