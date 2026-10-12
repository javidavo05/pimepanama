/** Proyecto cargando: encabezado, «Qué le falta», pestañas y la primera pestaña. */
export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto animate-pulse motion-reduce:animate-none" aria-busy="true" aria-label="Cargando proyecto">
      <div className="h-4 w-48 rounded bg-fill mb-4" />
      <div className="h-8 w-72 max-w-full rounded-lg bg-fill-2 mb-2" />
      <div className="h-4 w-40 rounded bg-fill mb-6" />
      <div className="bg-panel border border-line rounded-2xl p-4 sm:p-6 mb-6 space-y-3">
        <div className="flex justify-between gap-4">
          <div className="h-4 w-32 rounded bg-fill-2" />
          <div className="h-4 w-20 rounded bg-fill" />
        </div>
        <div className="h-2 rounded-full bg-fill-3" />
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 pt-3">
            <div className="h-3 w-1/3 rounded bg-fill-2" />
            <div className="h-11 w-32 rounded-lg bg-fill" />
          </div>
        ))}
      </div>
      <div className="flex gap-6 border-b border-line mb-6 pb-3 overflow-hidden">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-4 w-20 shrink-0 rounded bg-fill-2" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 h-48 rounded-2xl bg-panel border border-line" />
        <div className="h-40 rounded-2xl bg-panel border border-line" />
      </div>
    </div>
  );
}
