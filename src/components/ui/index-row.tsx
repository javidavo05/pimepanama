// motion: none — fila de lista; su entrada la coordina el contenedor con data-reveal="rise-row".
import { NumChip } from "./primitives";

export function IndexRow({ n, title, sub, right, i = 0 }: { n: number; title: string; sub?: string; right?: string; i?: number }) {
  return (
    <div className="index-row" style={{ "--i": i } as React.CSSProperties}>
      <NumChip n={n} />
      <div style={{ minWidth: 0 }}>
        <div className="t">{title}</div>
        {sub && <div className="s">{sub}</div>}
      </div>
      {right && <div className="n num">{right}</div>}
    </div>
  );
}
