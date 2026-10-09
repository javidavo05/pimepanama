"use client";
// Año actual sin romper el prerender (new Date() en servidor no es estable): se resuelve en el navegador.
import { useSyncExternalStore } from "react";
const sub = () => () => {};
export function Year() {
  const y = useSyncExternalStore(sub, () => String(new Date().getFullYear()), () => "");
  return <>{y}</>;
}
