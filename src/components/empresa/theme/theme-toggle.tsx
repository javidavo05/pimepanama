"use client";

import { useTheme, type ThemePreference } from "./theme-provider";

function SunIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path strokeLinecap="round" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
    </svg>
  );
}

function SystemIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <path strokeLinecap="round" d="M9 21h6m-3-4v4" />
    </svg>
  );
}

const OPTIONS: {
  value: ThemePreference;
  label: string;
  hint: string;
  Icon: (p: { className?: string }) => React.ReactElement;
}[] = [
  { value: "light", label: "Claro", hint: "Fondo claro, siempre", Icon: SunIcon },
  { value: "dark", label: "Oscuro", hint: "Fondo oscuro, siempre", Icon: MoonIcon },
  { value: "system", label: "Sistema", hint: "Sigue a tu equipo", Icon: SystemIcon },
];

/**
 * Control compacto para la barra lateral: tres segmentos, siempre visibles.
 * Se prefiere sobre un botón que cicla porque el estado actual se lee de un
 * vistazo y llegar a "Sistema" no exige adivinar cuántos clics faltan.
 */
export function ThemeToggle() {
  const { preference, setPreference, ready } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Tema de la interfaz"
      className="flex items-center gap-1 p-1 rounded-lg bg-fill border border-line"
    >
      {OPTIONS.map(({ value, label, hint, Icon }) => {
        const active = ready && preference === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`Tema ${label.toLowerCase()} — ${hint.toLowerCase()}`}
            title={`${label} · ${hint}`}
            onClick={() => setPreference(value)}
            className={`flex-1 flex items-center justify-center h-8 rounded-md transition-colors ${
              active
                ? "bg-brand/15 text-brand-fg"
                : "text-fg-ghost hover:text-fg-mute hover:bg-fill-2"
            }`}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}
    </div>
  );
}

/**
 * Variante con etiqueta y descripción para la página de Configuración, donde
 * hay espacio para explicar qué hace cada opción.
 */
export function ThemeToggleCards() {
  const { preference, resolved, setPreference, ready } = useTheme();

  return (
    <div>
      <div role="radiogroup" aria-label="Tema de la interfaz" className="grid grid-cols-3 gap-3">
        {OPTIONS.map(({ value, label, hint, Icon }) => {
          const active = ready && preference === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setPreference(value)}
              className={`flex flex-col items-start gap-2 p-4 rounded-xl border text-left transition-colors ${
                active
                  ? "bg-brand/10 border-brand/40 text-fg"
                  : "bg-fill border-line text-fg-dim hover:bg-fill-2 hover:text-fg-mute"
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? "text-brand-fg" : "text-fg-faint"}`} />
              <span className="text-sm font-medium">{label}</span>
              <span className="text-xs text-fg-faint leading-snug">{hint}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-fg-faint" aria-live="polite">
        {ready
          ? preference === "system"
            ? `Siguiendo a tu sistema operativo: ahora se ve ${resolved === "dark" ? "oscuro" : "claro"}.`
            : "La preferencia se guarda en este navegador."
          : "Cargando preferencia…"}
      </p>
    </div>
  );
}
