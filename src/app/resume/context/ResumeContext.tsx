"use client";

import { createContext, useContext, useState } from "react";
import type { Lang } from "../data/content";

interface ResumeCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
}

const ResumeContext = createContext<ResumeCtx>({ lang: "en", setLang: () => {} });

export function ResumeProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  return <ResumeContext.Provider value={{ lang, setLang }}>{children}</ResumeContext.Provider>;
}

export function useLang(): ResumeCtx {
  return useContext(ResumeContext);
}
