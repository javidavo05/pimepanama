/** Estados de Vercel y Supabase en palabras. Sin "use client": lo usan la ficha (servidor) y Platforms. */

export type Tone = "ok" | "warn" | "danger" | "brand" | "mute";

export function vercelEstado(state: string | null | undefined): { label: string; tone: Tone } | null {
  if (!state) return null;
  switch (state) {
    case "READY":
      return { label: "Publicado", tone: "ok" };
    case "ERROR":
      return { label: "Falló el último deploy", tone: "danger" };
    case "BUILDING":
    case "INITIALIZING":
    case "QUEUED":
      return { label: "Publicando…", tone: "brand" };
    case "CANCELED":
      return { label: "Deploy cancelado", tone: "warn" };
    default:
      return { label: state.toLowerCase(), tone: "mute" };
  }
}

export function supabaseEstado(status: string | null | undefined): { label: string; tone: Tone } | null {
  if (!status) return null;
  switch (status) {
    case "ACTIVE_HEALTHY":
      return { label: "Activo", tone: "ok" };
    case "INACTIVE":
      return { label: "Pausado", tone: "danger" };
    case "COMING_UP":
    case "RESTORING":
    case "UPGRADING":
      return { label: "Arrancando…", tone: "brand" };
    case "ACTIVE_UNHEALTHY":
      return { label: "Con fallas", tone: "danger" };
    default:
      return { label: status.toLowerCase().replace(/_/g, " "), tone: "warn" };
  }
}
