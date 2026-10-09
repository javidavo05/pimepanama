// motion: none — réplica estática del tablero real con datos de muestra; se captura a imagen (scripts/capture-cases.mjs).
// Svitzer: analítica de muestras de aceite. No hay repo del sistema en esta máquina, así que esta pantalla
// sigue la descripción del mandato (lectura de reportes con IA, límites por motor, alertas, historial por
// embarcación). Datos de muestra inventados.
import "./svitzer.css";

const filas = [
  ["Delta 7", "Motor BB", "21", "4", "14.1", "0.08", "Crítica"],
  ["Orion 2", "Motor EB", "9", "3", "11.8", "0.05", "Revisar"],
  ["Atlas 1", "Motor BB", "7", "2", "14.6", "0.02", "Normal"],
  ["Pacífico 4", "Motor EB", "12", "5", "13.9", "0.21", "Revisar"],
  ["Caribe 3", "Motor BB", "6", "2", "14.3", "0.03", "Normal"],
  ["Bocas 9", "Motor EB", "8", "3", "14.0", "0.04", "Normal"],
];

export default function CaseSvitzer() {
  return (
    <div className="case case-svitzer">
      <aside className="sv-side">
        <div className="sv-logo">OilSense</div>
        {["Flota", "Muestras", "Alertas", "Límites", "Reportes", "Ajustes"].map((m, i) => (
          <div key={m} className={`sv-nav ${i === 1 ? "on" : ""}`}><i /><span>{m}</span></div>
        ))}
      </aside>
      <div className="sv-main">
        <header className="sv-top">
          <div><h1>Muestras de aceite</h1><p>Flota Panamá · 23 embarcaciones · última carga hace 2 h</p></div>
          <div className="sv-actions"><span className="sv-btn ghost">Exportar</span><span className="sv-btn">Cargar reporte PDF</span></div>
        </header>
        <div className="sv-kpis">
          {[["Muestras este mes", "148", "+12 % vs. septiembre"], ["Fuera de límite", "6", "2 críticas"], ["Procesadas con IA", "100 %", "sin revisión manual"], ["Tiempo medio de lectura", "9 s", "por reporte"]].map(([k, v, s]) => (
            <div className="sv-kpi" key={k}><span>{k}</span><b>{v}</b><small>{s}</small></div>
          ))}
        </div>
        <div className="sv-grid">
          <div className="sv-card sv-chart">
            <div className="sv-card-h"><b>Hierro (Fe) · Remolcador Delta 7</b><span>ppm · últimos 7 meses</span></div>
            <svg viewBox="0 0 640 200" aria-hidden="true">
              {[40, 80, 120, 160].map((y) => <line key={y} x1="40" x2="620" y1={y} y2={y} className="sv-grid-l" />)}
              <line x1="40" x2="620" y1="60" y2="60" className="sv-limit" />
              <text x="44" y="54" className="sv-lab">límite 20 ppm</text>
              <polyline points="60,150 140,142 220,130 300,136 380,110 460,96 540,70 620,52" className="sv-line" />
              {[["60", "150"], ["140", "142"], ["220", "130"], ["300", "136"], ["380", "110"], ["460", "96"], ["540", "70"], ["620", "52"]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="4" className="sv-dot" />)}
              {["Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct"].map((m, i) => <text key={m} x={60 + i * 93} y="192" className="sv-lab">{m}</text>)}
            </svg>
          </div>
          <div className="sv-card">
            <div className="sv-card-h"><b>Alertas abiertas</b><span>3</span></div>
            {[["Delta 7 · Motor BB", "Fe por encima del límite", "crit"], ["Orion 2 · Motor EB", "Viscosidad baja", "warn"], ["Pacífico 4 · Motor EB", "Agua en aceite 0.21 %", "warn"]].map(([a, b, c]) => (
              <div className="sv-alert" key={a}><i className={c} /><div><b>{a}</b><span>{b}</span></div><em>{c === "crit" ? "Crítica" : "Revisar"}</em></div>
            ))}
          </div>
        </div>
        <div className="sv-card">
          <div className="sv-card-h"><b>Últimas muestras</b><span>Extraídas del PDF del laboratorio por el modelo de IA</span></div>
          <table>
            <thead><tr>{["Embarcación", "Motor", "Fe ppm", "Cu ppm", "Visc. 100 °C", "Agua %", "Estado"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>{filas.map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i}>{i === 6 ? <span className={`sv-pill ${c === "Crítica" ? "crit" : c === "Revisar" ? "warn" : "ok"}`}>{c}</span> : c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
