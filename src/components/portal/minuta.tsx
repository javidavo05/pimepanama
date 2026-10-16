/**
 * La minuta ejecutiva tal como la ve el cliente: texto plano con sus saltos de línea y listas. Nunca HTML del
 * modelo: React escapa todo, así que no hay forma de que una minuta inyecte marcado.
 */
import type { MinutaCliente } from "@/lib/portal/documentos";

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 min-w-0">
      <h3 className="p-eyebrow">{titulo}</h3>
      {children}
    </section>
  );
}
const Parrafo = ({ texto }: { texto: string }) => <p className="text-fg-mute text-sm sm:text-base leading-relaxed whitespace-pre-line [overflow-wrap:anywhere]">{texto}</p>;
const Lista = ({ items }: { items: string[] }) => (
  <ul className="space-y-2">
    {items.map((x, i) => (
      <li key={i} className="flex gap-3 text-fg-mute text-sm sm:text-base leading-relaxed min-w-0"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden /><span className="min-w-0 [overflow-wrap:anywhere]">{x}</span></li>
    ))}
  </ul>
);

export function MinutaEjecutiva({ m }: { m: MinutaCliente }) {
  return (
    <div className="space-y-6">
      {m.agenda && <Bloque titulo="De qué se habló"><Parrafo texto={m.agenda} /></Bloque>}
      {m.decisiones.length > 0 && <Bloque titulo="Decisiones"><Lista items={m.decisiones} /></Bloque>}
      {m.compromisos.length > 0 && <Bloque titulo="Compromisos"><Lista items={m.compromisos} /></Bloque>}
      {m.riesgos.length > 0 && <Bloque titulo="Riesgos y bloqueos"><Lista items={m.riesgos} /></Bloque>}
      {m.proximosPasos && <Bloque titulo="Próximos pasos"><Parrafo texto={m.proximosPasos} /></Bloque>}
      {m.proximaReunion && <Bloque titulo="Próxima reunión"><Parrafo texto={m.proximaReunion} /></Bloque>}
    </div>
  );
}
