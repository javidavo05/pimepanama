// motion: none — gráficas en SVG puro; el trazo se dibuja con CSS al montarse y el hover muestra el valor.
// Reglas (skill dataviz): una sola serie por gráfica, un solo tono (acento), marcas finas, tooltip al pasar,
// texto siempre en tokens de texto, nunca en el color de la serie.

export function Sparkline({ serie, id }: { serie: number[]; id: string }) {
  const w = 96, h = 28, min = Math.min(...serie), max = Math.max(...serie), r = max - min || 1;
  const pts = serie.map((v, i) => [(i / (serie.length - 1)) * w, h - 2 - ((v - min) / r) * (h - 4)] as const);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  return (
    <svg className="ch-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true" key={id}>
      <path className="ch-spark-line" d={d} pathLength={1} />
      <circle className="ch-spark-dot" cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.5" />
    </svg>
  );
}

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

export function LineChart({ valores, etiquetas, unidad, id }: { valores: number[]; etiquetas: string[]; unidad: string; id: string }) {
  const w = 340, h = 120, px = 10, pt = 14, pb = 22;
  const max = Math.max(...valores) * 1.1, min = 0;
  const x = (i: number) => px + (i / (valores.length - 1)) * (w - 2 * px);
  const y = (v: number) => pt + (1 - (v - min) / (max - min)) * (h - pt - pb);
  const d = valores.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  return (
    <svg className="ch" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${unidad}: ${valores.map(fmt).join(", ")}`} key={id}>
      {[0.25, 0.5, 0.75].map((g) => <line key={g} className="ch-grid" x1={px} x2={w - px} y1={y(max * g)} y2={y(max * g)} />)}
      <line className="ch-axis" x1={px} x2={w - px} y1={y(0)} y2={y(0)} />
      <path className="ch-area" d={`${d} L${x(valores.length - 1).toFixed(1)} ${y(0)} L${x(0).toFixed(1)} ${y(0)} Z`} />
      <path className="ch-line" d={d} pathLength={1} />
      {valores.map((v, i) => (
        <g className="ch-pt" key={i}>
          <rect className="ch-hit" x={x(i) - 18} y={0} width={36} height={h} />
          <line className="ch-cross" x1={x(i)} x2={x(i)} y1={pt} y2={y(0)} />
          <circle className="ch-dot" cx={x(i)} cy={y(v)} r="4" />
          <text className="ch-lab" x={x(i)} y={h - 6} textAnchor="middle">{etiquetas[i]}</text>
          <g className="ch-tip" transform={`translate(${Math.min(Math.max(x(i), 34), w - 34).toFixed(1)} ${Math.max(y(v) - 12, 10).toFixed(1)})`}>
            <rect x={-30} y={-9} width={60} height={16} rx={4} />
            <text y={3} textAnchor="middle">{fmt(v)}</text>
          </g>
        </g>
      ))}
    </svg>
  );
}

export function BarChart({ valores, etiquetas, unidad, id }: { valores: number[]; etiquetas: string[]; unidad: string; id: string }) {
  const w = 340, h = 120, px = 10, pt = 14, pb = 22, gap = 10;
  const max = Math.max(...valores) * 1.1 || 1;
  const bw = (w - 2 * px - gap * (valores.length - 1)) / valores.length;
  const y0 = h - pb;
  return (
    <svg className="ch" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${unidad}: ${valores.map(fmt).join(", ")}`} key={id}>
      {[0.25, 0.5, 0.75].map((g) => <line key={g} className="ch-grid" x1={px} x2={w - px} y1={y0 - g * (y0 - pt)} y2={y0 - g * (y0 - pt)} />)}
      <line className="ch-axis" x1={px} x2={w - px} y1={y0} y2={y0} />
      {valores.map((v, i) => {
        const bh = Math.max((v / max) * (y0 - pt), v > 0 ? 3 : 0), bx = px + i * (bw + gap);
        return (
          <g className="ch-pt" key={i} style={{ "--i": i } as React.CSSProperties}>
            <rect className="ch-hit" x={bx - gap / 2} y={0} width={bw + gap} height={h} />
            <rect className="ch-bar" x={bx} y={y0 - bh} width={bw} height={bh} rx={3} style={{ transformOrigin: `${bx + bw / 2}px ${y0}px` }} />
            <text className="ch-lab" x={bx + bw / 2} y={h - 6} textAnchor="middle">{etiquetas[i]}</text>
            <g className="ch-tip" transform={`translate(${(bx + bw / 2).toFixed(1)} ${Math.max(y0 - bh - 12, 10).toFixed(1)})`}>
              <rect x={-24} y={-9} width={48} height={16} rx={4} />
              <text y={3} textAnchor="middle">{fmt(v)}</text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}

/** Dona de una sola familia de color: tres pasos del acento (secuencial). Leyenda con valores siempre visible. */
export function Donut({ partes, id, titulo }: { partes: { label: string; valor: number }[]; id: string; titulo: string }) {
  const total = partes.reduce((a, p) => a + p.valor, 0) || 1;
  const r = 34, c = 2 * Math.PI * r;
  const offs = partes.reduce<number[]>((a, p, i) => [...a, (i ? a[i - 1] + (partes[i - 1].valor / total) * c : 0)], []);
  return (
    <div className="ch-donut" key={id}>
      <svg viewBox="0 0 96 96" role="img" aria-label={`${titulo}: ${partes.map((p) => `${p.label} ${p.valor}`).join(", ")}`}>
        <circle className="ch-donut-bg" cx="48" cy="48" r={r} />
        {partes.map((p, i) => {
          const len = (p.valor / total) * c, off = offs[i];
          return <circle key={p.label} className="ch-donut-seg" cx="48" cy="48" r={r} strokeDasharray={`${len - 2} ${c - len + 2}`} strokeDashoffset={-off} style={{ "--i": i } as React.CSSProperties} />;
        })}
        <text className="ch-donut-total" x="48" y="52" textAnchor="middle">{total}</text>
      </svg>
      <ul className="ch-legend">
        {partes.map((p, i) => (
          <li key={p.label} style={{ "--i": i } as React.CSSProperties}><i /><span>{p.label}</span><b className="num">{p.valor}</b></li>
        ))}
      </ul>
    </div>
  );
}
