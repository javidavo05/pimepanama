"use client";

interface LanguageToggleProps {
  value: "es" | "en";
  onChange: (lang: "es" | "en") => void;
}

export function LanguageToggle({ value, onChange }: LanguageToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-line overflow-hidden">
      {(["es", "en"] as const).map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => onChange(lang)}
          className={`px-4 py-1.5 text-xs font-medium uppercase tracking-widest transition-all ${
            value === lang
              ? "bg-sand/10 text-sand-fg border-r border-sand/20"
              : "text-fg-dim hover:text-fg-dim"
          }`}
        >
          {lang}
        </button>
      ))}
    </div>
  );
}
