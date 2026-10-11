/** Estado de los sistemas del cliente: solo «En línea» o «Con problemas», sin detalle técnico. */
import { ESTADO_CLIENTE, type EstadoSistema } from "@/lib/pulso/reglas";
import { Etiqueta, Tarjeta, TituloSeccion, haceCuanto, type Tono } from "./ui";

type S = { id: string; name: string; url: string | null; status: string; statusChangedAt: Date | null; lastSeenAt: Date | null };
const TONO: Record<EstadoSistema, Tono> = { ok: "ok", degradado: "aviso", caido: "peligro", sin_senal: "neutro" };

export const hayProblema = (xs: S[]) => xs.some((s) => s.status === "caido" || s.status === "degradado");

export function EstadoSistemas({ sistemas, titulo = "Tus sistemas" }: { sistemas: S[]; titulo?: string }) {
  const visibles = sistemas.filter((s) => ESTADO_CLIENTE[s.status as EstadoSistema]);
  if (!visibles.length) return null;
  const problema = hayProblema(visibles);
  return (
    <Tarjeta className={problema ? "border-danger/40" : undefined}>
      <TituloSeccion>{titulo}</TituloSeccion>
      <ul className="divide-y divide-line">
        {visibles.map((s) => {
          const e = ESTADO_CLIENTE[s.status as EstadoSistema]!;
          return (
            <li key={s.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-fg text-sm font-semibold break-words">{s.name}</p>
                <p className="text-fg-dim text-sm break-words">
                  {s.status === "ok" ? (s.url ? s.url.replace(/^https?:\/\//, "").replace(/\/$/, "") : e.detalle) : e.detalle}
                  {s.status !== "ok" && s.statusChangedAt ? ` Desde ${haceCuanto(s.statusChangedAt)}.` : ""}
                </p>
              </div>
              <Etiqueta tono={TONO[s.status as EstadoSistema]}>{e.texto}</Etiqueta>
            </li>
          );
        })}
      </ul>
    </Tarjeta>
  );
}
