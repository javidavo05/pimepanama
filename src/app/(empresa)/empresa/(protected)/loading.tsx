/**
 * Esqueleto común de la suite. Además de mostrarse al instante al cambiar de
 * pestaña, es el límite hasta donde Next precarga las páginas dinámicas: sin
 * él, cada toque en el menú esperaba la respuesta completa del servidor antes
 * de mover la pantalla.
 */
export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto animate-pulse" aria-busy="true" aria-label="Cargando">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div className="space-y-2">
          <div className="h-8 w-40 rounded-lg bg-fill-2" />
          <div className="h-4 w-56 rounded bg-fill" />
        </div>
        <div className="h-11 w-full sm:w-36 rounded-lg bg-fill-2" />
      </div>
      <div className="bg-panel border border-line rounded-xl overflow-hidden">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-b-0">
            <div className="w-9 h-9 rounded-lg bg-fill-2 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/3 rounded bg-fill-2" />
              <div className="h-3 w-1/4 rounded bg-fill" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
