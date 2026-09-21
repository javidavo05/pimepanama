export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto animate-pulse" aria-busy="true" aria-label="Cargando proyecto">
      <div className="h-4 w-48 rounded bg-fill mb-4" />
      <div className="h-8 w-72 max-w-full rounded-lg bg-fill-2 mb-2" />
      <div className="h-4 w-40 rounded bg-fill mb-6" />
      <div className="flex gap-6 border-b border-line mb-6 pb-3">
        <div className="h-4 w-16 rounded bg-fill-2" />
        <div className="h-4 w-20 rounded bg-fill" />
      </div>
      <div className="bg-panel border border-line rounded-xl overflow-hidden">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 min-h-12 border-b border-line last:border-b-0">
            <div className="w-5 h-5 rounded-full bg-fill-2 shrink-0" />
            <div className="h-3 flex-1 max-w-md rounded bg-fill-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
