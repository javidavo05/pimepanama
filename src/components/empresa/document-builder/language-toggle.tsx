"use client";

interface LanguageToggleProps {
  value: "es" | "en";
  onChange: (lang: "es" | "en") => void;
}

export function LanguageToggle({ value, onChange }: LanguageToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-white/[0.08] overflow-hidden">
      {(["es", "en"] as const).map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => onChange(lang)}
          className={`px-4 py-1.5 text-xs font-medium uppercase tracking-widest transition-all ${
            value === lang
              ? "bg-[#C8A96E]/10 text-[#C8A96E] border-r border-[#C8A96E]/20"
              : "text-white/60 hover:text-white/60"
          }`}
        >
          {lang}
        </button>
      ))}
    </div>
  );
}
