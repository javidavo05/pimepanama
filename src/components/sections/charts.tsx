// motion: none — gráficas en SVG puro; el trazo se dibuja con CSS al montarse y el hover muestra el valor.
// Reglas (skill dataviz): una serie por gráfica o una sola familia de tono, marcas finas, tooltip al pasar,
// texto siempre en tokens de texto, leyenda cuando hay más de una serie.

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

/** Área con línea y tooltip por punto. */
export function AreaChart({ valores, etiquetas, unidad, id, h = 140 }: { valores: number[]; etiquetas: string[]; unidad: string; id: string; h?: number }) {
  const w = 640, px = 12, pt = 16, pb = 22;
  const max = Math.max(...valores) * 1.15;
  const x = (i: number) => px + (i / (valores.length - 1)) * (w - 2 * px);
  const y = (v: number) => pt + (1 - v / max) * (h - pt - pb);
  const d = valores.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  return (
    <svg className="ch" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${unidad}: ${valores.map(fmt).join(", ")}`} key={id}>
      {[0.25, 0.5, 0.75].map((g) => <line key={g} className="ch-grid" x1={px} x2={w - px} y1={y(max * g)} y2={y(max * g)} />)}
      <line className="ch-axis" x1={px} x2={w - px} y1={y(0)} y2={y(0)} />
      <path className="ch-area" d={`${d} L${x(valores.length - 1).toFixed(1)} ${y(0)} L${x(0).toFixed(1)} ${y(0)} Z`} />
      <path className="ch-line" d={d} pathLength={1} />
      {valores.map((v, i) => (
        <g className="ch-pt" key={i}>
          <rect className="ch-hit" x={x(i) - (w / valores.length) / 2} y={0} width={w / valores.length} height={h} />
          <line className="ch-cross" x1={x(i)} x2={x(i)} y1={pt} y2={y(0)} />
          <circle className="ch-dot" cx={x(i)} cy={y(v)} r="4" />
          <text className="ch-lab" x={x(i)} y={h - 6} textAnchor="middle">{etiquetas[i]}</text>
          <g className="ch-tip" transform={`translate(${Math.min(Math.max(x(i), 34), w - 34).toFixed(1)} ${Math.max(y(v) - 12, 10).toFixed(1)})`}>
            <rect x={-30} y={-9} width={60} height={16} rx={4} /><text y={3} textAnchor="middle">{fmt(v)}</text>
          </g>
        </g>
      ))}
    </svg>
  );
}

/** Barras horizontales con valor al final (carga, antigüedad). */
export function HBars({ items, unidad, id, max: maxIn }: { items: { label: string; valor: number; dim?: boolean }[]; unidad: string; id: string; max?: number }) {
  const max = maxIn ?? (Math.max(...items.map((i) => i.valor)) || 1);
  return (
    <div className="ch-hbars" role="img" aria-label={`${unidad}: ${items.map((i) => `${i.label} ${i.valor}`).join(", ")}`} key={id}>
      {items.map((it, i) => (
        <div className={`ch-hbar ${it.dim ? "dim" : ""}`} key={it.label} style={{ "--i": i, "--w": `${(it.valor / max) * 100}%` } as React.CSSProperties}>
          <span className="ch-hbar-l">{it.label}</span>
          <span className="ch-hbar-track"><i /></span>
          <b className="num">{fmt(it.valor)}</b>
        </div>
      ))}
    </div>
  );
}

/** Anillo de progreso (meta del mes). */
export function Ring({ valor, meta, label, id }: { valor: number; meta: number; label: string; id: string }) {
  const r = 44, c = 2 * Math.PI * r, p = Math.min(valor / meta, 1);
  return (
    <div className="ch-ring" key={id}>
      <svg viewBox="0 0 112 112" role="img" aria-label={`${label}: ${Math.round(p * 100)} %`}>
        <circle className="ch-ring-bg" cx="56" cy="56" r={r} />
        <circle className="ch-ring-fg" cx="56" cy="56" r={r} strokeDasharray={c} style={{ "--off": c * (1 - p) } as React.CSSProperties} />
        <text className="ch-ring-v" x="56" y="61" textAnchor="middle">{Math.round(p * 100)}%</text>
      </svg>
    </div>
  );
}

/** Gantt de una semana: filas con barras entre día de inicio y fin. */
export function Gantt({ filas, dias, id }: { filas: { cliente: string; inicio: number; fin: number }[]; dias: string[]; id: string }) {
  return (
    <div className="ch-gantt" key={id} style={{ "--n": dias.length } as React.CSSProperties}>
      <div className="ch-gantt-head"><span /> {dias.map((d, i) => <span key={i} className="ch-lab-t">{d}</span>)}</div>
      {filas.map((f, i) => (
        <div className="ch-gantt-row" key={f.cliente} style={{ "--i": i } as React.CSSProperties}>
          <span className="ch-gantt-l">{f.cliente}</span>
          <span className="ch-gantt-track"><i style={{ "--a": f.inicio, "--b": f.fin + 1 } as React.CSSProperties} /></span>
        </div>
      ))}
    </div>
  );
}

/** Embudo: etapas decrecientes, tocables. */
export function Funnel({ etapas, activa, onPick, id }: { etapas: { label: string; n: number }[]; activa: number; onPick: (i: number) => void; id: string }) {
  const max = Math.max(...etapas.map((e) => e.n)) || 1;
  return (
    <div className="ch-funnel" key={id}>
      {etapas.map((e, i) => (
        <button type="button" key={e.label} className="ch-funnel-step" aria-pressed={activa === i} onClick={() => onPick(i)} style={{ "--i": i, "--w": `${Math.max((e.n / max) * 100, 28)}%` } as React.CSSProperties}>
          <i /><span className="ch-funnel-l">{e.label}</span><b className="num">{e.n}</b>
        </button>
      ))}
    </div>
  );
}

/** Mapa de calor secuencial (un tono, claro → oscuro). */
export function Heat({ filas, cols, datos, id, unidad }: { filas: string[]; cols: string[]; datos: number[][]; id: string; unidad: string }) {
  const all = datos.flat(), min = Math.min(...all), max = Math.max(...all), r = max - min || 1;
  return (
    <div className="ch-heat" key={id} style={{ "--cols": cols.length } as React.CSSProperties} role="img" aria-label={`${unidad}: ${filas.map((f, i) => `${f} ${datos[i].join(" ")}`).join("; ")}`}>
      <span />{cols.map((c) => <span key={c} className="ch-lab-t">{c}</span>)}
      {filas.map((f, i) => (
        [<span key={`l${i}`} className="ch-heat-l">{f}</span>, ...datos[i].map((v, j) => (
          <span key={`${i}-${j}`} className="ch-cell" style={{ "--t": (v - min) / r, "--i": i * cols.length + j } as React.CSSProperties} title={`${f} · ${cols[j]}: ${v}`} />
        ))]
      ))}
      <span className="ch-heat-scale" aria-hidden="true"><i /><span>{min}</span><em /><span>{max}</span></span>
    </div>
  );
}

/** Calendario de 5 semanas con intensidad por día. */
export function Calendar({ dias, diasCorto, id, unidad }: { dias: number[]; diasCorto: string[]; id: string; unidad: string }) {
  const max = Math.max(...dias) || 1;
  return (
    <div className="ch-cal" key={id} role="img" aria-label={`${unidad}: ${dias.join(" ")}`}>
      {diasCorto.map((d, i) => <span key={`h${i}`} className="ch-lab-t">{d}</span>)}
      {dias.map((v, i) => <span key={i} className="ch-cal-d" style={{ "--t": v / max, "--i": i } as React.CSSProperties} title={`${v}`} />)}
    </div>
  );
}

/** Columnas apiladas de una sola familia de tono, con leyenda. */
export function Stacked({ series, tipos, meses, id, unidad }: { series: number[][]; tipos: string[]; meses: string[]; id: string; unidad: string }) {
  const w = 300, h = 140, px = 12, pt = 10, pb = 22, gap = 18;
  const totals = meses.map((_, m) => series.reduce((a, s) => a + s[m], 0));
  const max = Math.max(...totals) * 1.1 || 1;
  const bw = (w - 2 * px - gap * (meses.length - 1)) / meses.length;
  const y0 = h - pb;
  return (
    <div className="ch-stacked" key={id}>
      <svg className="ch" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${unidad}: ${meses.map((m, i) => `${m} ${totals[i]}`).join(", ")}`}>
        <line className="ch-axis" x1={px} x2={w - px} y1={y0} y2={y0} />
        {meses.map((m, mi) => {
          let acc = 0;
          const bx = px + mi * (bw + gap);
          return (
            <g className="ch-pt" key={m}>
              <rect className="ch-hit" x={bx - gap / 2} y={0} width={bw + gap} height={h} />
              {series.map((s, si) => {
                const bh = (s[mi] / max) * (y0 - pt), yy = y0 - acc - bh; acc += bh + 2;
                return <rect key={si} className={`ch-stack s${si}`} x={bx} y={yy} width={bw} height={Math.max(bh - 2, 0)} rx={2} style={{ "--i": mi } as React.CSSProperties} />;
              })}
              <text className="ch-lab" x={bx + bw / 2} y={h - 6} textAnchor="middle">{m}</text>
              <g className="ch-tip" transform={`translate(${(bx + bw / 2).toFixed(1)} ${Math.max(y0 - (totals[mi] / max) * (y0 - pt) - 12, 10).toFixed(1)})`}>
                <rect x={-20} y={-9} width={40} height={16} rx={4} /><text y={3} textAnchor="middle">{totals[mi]}</text>
              </g>
            </g>
          );
        })}
      </svg>
      <ul className="ch-legend row">{tipos.map((t, i) => <li key={t} className={`s${i}`}><i /><span>{t}</span></li>)}</ul>
    </div>
  );
}
