/** Indica si hay datos cifrados guardados (sin exponer el blob). */
export function hasPlatformVault(stored: string | null | undefined): boolean {
  return typeof stored === "string" && stored.length > 0 && stored.includes(":");
}
