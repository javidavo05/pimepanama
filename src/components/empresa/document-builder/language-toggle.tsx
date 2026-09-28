"use client";

import { seg } from "@/components/empresa/page-header";

interface LanguageToggleProps {
  value: "es" | "en";
  onChange: (lang: "es" | "en") => void;
}

/**
 * Selector ES / EN con el mismo control segmentado del resto de la suite. Antes
 * era una pastilla de 28 px que, apretada junto al título, se cortaba en el
 * borde del celular.
 */
export function LanguageToggle({ value, onChange }: LanguageToggleProps) {
  return (
    <div className={seg.group} role="group" aria-label="Idioma del documento">
      {(["es", "en"] as const).map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => onChange(lang)}
          aria-pressed={value === lang}
          className={`${seg.item(value === lang)} uppercase tracking-widest`}
        >
          {lang}
        </button>
      ))}
    </div>
  );
}
