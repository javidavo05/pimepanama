export default function Loading() {
  return (
    <div className="w-full max-w-6xl animate-pulse" aria-busy="true" aria-label="Cargando plataformas">
      <div className="h-8 w-40 rounded-lg bg-fill-2 mb-2" />
      <div className="h-4 w-72 rounded bg-fill mb-6" />
      <div className="flex gap-6 border-b border-line mb-4 pb-3">
        <div className="h-4 w-24 rounded bg-fill-2" />
        <div className="h-4 w-32 rounded bg-fill" />
      </div>
      <div className="h-11 rounded-lg bg-fill mb-4" />
      <div className="bg-panel border border-line rounded-xl overflow-hidden">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-4 py-3 border-b border-line last:border-b-0">
            <div className="space-y-2">
              <div className="h-3 w-2/3 rounded bg-fill-2" />
              <div className="h-3 w-1/2 rounded bg-fill" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-3/4 rounded bg-fill-2" />
              <div className="h-3 w-1/3 rounded bg-fill" />
            </div>
            <div className="hidden lg:block h-3 w-3/4 rounded bg-fill-2" />
            <div className="hidden lg:block h-3 w-2/3 rounded bg-fill-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
