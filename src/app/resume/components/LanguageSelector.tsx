"use client";

import { useLang } from "../context/ResumeContext";

export function LanguageSelector() {
  const { lang, setLang } = useLang();

  return (
    <div
      className="no-print fixed right-5 top-5 z-50 flex overflow-hidden rounded-full border"
      style={{
        borderColor: "rgba(200,169,110,0.35)",
        backgroundColor: "rgba(13,31,24,0.85)",
        backdropFilter: "blur(12px)",
      }}
    >
      {(["en", "es"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className="px-4 py-2 text-[10px] font-bold uppercase tracking-[0.25em] transition-colors duration-200"
          style={
            lang === l
              ? { backgroundColor: "#C8A96E", color: "#0D1F18" }
              : { backgroundColor: "transparent", color: "#6B7B72" }
          }
        >
          {l}
        </button>
      ))}
    </div>
  );
}
