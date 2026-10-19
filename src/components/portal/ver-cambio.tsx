/** Enlace «Ver el cambio» de un evento de la línea de tiempo: abre el lugar del sistema donde quedó. */
import { IconFlecha } from "./iconos";

export function VerCambio({ url, texto = "Ver el cambio" }: { url: string | null | undefined; texto?: string }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener" className="p-link inline-flex items-center gap-1 min-h-11 text-sm font-semibold">
      {texto}<IconFlecha width={14} height={14} />
    </a>
  );
}
