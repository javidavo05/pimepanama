export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto animate-pulse" aria-busy="true" aria-label="Cargando proyectos">
      <div className="h-8 w-40 rounded-lg bg-fill-2 mb-2" />
      <div className="h-4 w-56 rounded bg-fill mb-6" />
      <div className="flex gap-6 border-b border-line mb-6 pb-3">
        <div className="h-4 w-20 rounded bg-fill-2" />
        <div className="h-4 w-16 rounded bg-fill" />
      </div>
      <div className="bg-panel border border-line rounded-xl overflow-hidden">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-b-0">
            <div className="w-9 h-9 rounded-lg bg-fill-2 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/3 rounded bg-fill-2" />
              <div className="h-3 w-1/4 rounded bg-fill" />
            </div>
            <div className="hidden lg:block h-1 w-24 rounded bg-fill-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
