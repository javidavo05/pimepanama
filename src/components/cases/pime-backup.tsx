// motion: none — réplica estática del tablero real con datos de muestra; se captura a imagen (scripts/capture-cases.mjs).
import "./pime-backup.css";

export default function CasePimeBackup() {
  return (
    <div className="case case-pime-backup">
      <aside className="pb-side">
        <div className="pb-logo">
          <span className="pb-logo-mark"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /></svg></span>
          <div className="pb-min"><p className="pb-logo-t">Pime Backup</p><p className="pb-logo-s">Enterprise</p></div>
        </div>
        <nav className="pb-nav">
          <div className="pb-nav-item is-active"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z" /></svg><span>Dashboard</span></div>
          <div className="pb-nav-item"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 4h18v7H3zM3 13h18v7H3zM7 7.5h.01M7 16.5h.01" /></svg><span>Agentes</span></div>
          <div className="pb-nav-item"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg><span>Proyectos</span></div>
          <div className="pb-nav-item"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12h4l3-8 4 16 3-8h4" /></svg><span>Trabajos</span></div>
          <div className="pb-nav-item"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h8" /></svg><span>Registros</span></div>
          <div className="pb-nav-item"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2" /></svg><span>Reportes</span></div>
          <div className="pb-nav-item"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M4 20h16" /></svg><span>Descargas</span></div>
          <div className="pb-nav-item"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.7a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2l.4 2.7h4l.4-2.7a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z" /></svg><span>Configuración</span></div>
        </nav>
        <div className="pb-foot"><div className="pb-nav-item"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg><span>Cerrar sesión</span></div></div>
      </aside>
      <main className="pb-main">
        <div>
          <h1 className="pb-h1">Panel de Control</h1>
          <p className="pb-welcome">Bienvenido, Mariana Quintero</p>
        </div>
        <div className="pb-metrics">
        <div className="pb-card pb-metric">
          <div>
            <p className="pb-eyebrow">Agentes Online</p>
            <p className="pb-metric-value" style={{ color: "var(--c-emerald)" }}>4</p>
            <p className="pb-sub">2 ocupados · 1 offline</p>
          </div>
          <span style={{ color: "var(--c-emerald)" }} className="pb-metric-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 4h18v7H3zM3 13h18v7H3z" /></svg></span>
        </div>
        <div className="pb-card pb-metric">
          <div>
            <p className="pb-eyebrow">Proyectos Totales</p>
            <p className="pb-metric-value" style={{ color: "var(--c-sky)" }}>12</p>
            <p className="pb-sub">todos los proyectos</p>
          </div>
          <span style={{ color: "var(--c-sky)" }} className="pb-metric-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg></span>
        </div>
        <div className="pb-card pb-metric">
          <div>
            <p className="pb-eyebrow">Trabajos Activos</p>
            <p className="pb-metric-value" style={{ color: "var(--c-warn)" }}>3</p>
            <p className="pb-sub">en ejecución ahora</p>
          </div>
          <span style={{ color: "var(--c-warn)" }} className="pb-metric-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12h4l3-8 4 16 3-8h4" /></svg></span>
        </div>
        <div className="pb-card pb-gauge-card">
          <div className="pb-gauge">
            <svg width="80" height="80" viewBox="0 0 80 80" aria-hidden="true">
              <g transform="rotate(-90 40 40)">
                <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                <circle cx="40" cy="40" r="32" fill="none" stroke="#10b981" strokeWidth="6" strokeLinecap="round" strokeDasharray="201.06" strokeDashoffset="1.2" />
              </g>
            </svg>
            <span className="pb-gauge-v">99%</span>
          </div>
          <div>
            <p className="pb-eyebrow">Integridad Promedio</p>
            <p className="pb-sub">últimas verificaciones</p>
          </div>
        </div>
        </div>
        <div className="pb-cols">
          <section>
            <h2 className="pb-h2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12h4l3-8 4 16 3-8h4" /></svg>Transferencias Activas</h2>
            <div className="pb-jobs">
          <div className="pb-card pb-job">
            <div className="pb-job-top">
              <div className="pb-min">
                <div className="pb-job-name"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12h4l3-8 4 16 3-8h4" /></svg><span>Respaldo Drive — Finanzas</span></div>
                <p className="pb-id">a41f9c20...</p>
                <p className="pb-agent">Servidor-Contabilidad<span className="pb-code">7B3E91AD</span></p>
              </div>
              <span className="pb-pill is-sky">Transfiriendo</span>
            </div>
            <div className="pb-prog">
              <div className="pb-prog-row">
                <div className="pb-min"><span className="pb-prog-l">Transfiriendo</span></div>
                <span className="pb-prog-v"><span className="pb-sky">62.4%</span></span>
              </div>
              <div className="pb-bar"><div className="pb-fill" style={{ width: "62.4%" }} /></div>
            </div>
            <div className="pb-stats pb-cols-4">
            <div className="pb-stat"><div className="pb-stat-l"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 6c0-1 3.6-2 8-2s8 1 8 2-3.6 2-8 2-8-1-8-2zM4 6v12c0 1 3.6 2 8 2s8-1 8-2V6" /></svg><span>Descargado</span></div><span className="pb-stat-v ">1.84 TB</span></div>
            <div className="pb-stat"><div className="pb-stat-l"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></svg><span>Velocidad</span></div><span className="pb-stat-v pb-sky">38.6 MB/s</span></div>
            <div className="pb-stat"><div className="pb-stat-l"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2" /></svg><span>ETA</span></div><span className="pb-stat-v ">7h 12m</span></div>
            <div className="pb-stat"><div className="pb-stat-l"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12h4l3-8 4 16 3-8h4" /></svg><span>Archivos</span></div><span className="pb-stat-v ">412,380/660,912</span></div>
            </div>
          </div>
          <div className="pb-card pb-job">
            <div className="pb-job-top">
              <div className="pb-min">
                <div className="pb-job-name"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12h4l3-8 4 16 3-8h4" /></svg><span>Buzón Gmail — Gerencia</span></div>
                <p className="pb-id">c92d7e15...</p>
                <p className="pb-agent">Estación-Legal<span className="pb-code">E05A12C4</span></p>
              </div>
              <span className="pb-pill is-sky">Analizando</span>
            </div>
            <div className="pb-prog">
              <div className="pb-prog-row">
                <div className="pb-min"><span className="pb-prog-l">Análisis</span><p className="pb-phase">Analizando mensajes…</p></div>
                <span className="pb-prog-v"><span className="pb-sky">41.7%</span><span className="pb-prog-sub">18,240 / 43,700</span></span>
              </div>
              <div className="pb-bar"><div className="pb-fill" style={{ width: "41.7%" }} /></div>
            </div>
            <div className="pb-stats pb-cols-3">
            <div className="pb-stat"><div className="pb-stat-l"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12h4l3-8 4 16 3-8h4" /></svg><span>Mensajes</span></div><span className="pb-stat-v ">18,240</span></div>
            <div className="pb-stat"><div className="pb-stat-l"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 6c0-1 3.6-2 8-2s8 1 8 2-3.6 2-8 2-8-1-8-2zM4 6v12c0 1 3.6 2 8 2s8-1 8-2V6" /></svg><span>Tamaño total</span></div><span className="pb-stat-v ">9.37 GB</span></div>
            <div className="pb-stat"><div className="pb-stat-l"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 6c0-1 3.6-2 8-2s8 1 8 2-3.6 2-8 2-8-1-8-2zM4 6v12c0 1 3.6 2 8 2s8-1 8-2V6" /></svg><span>Promedio</span></div><span className="pb-stat-v ">538 KB</span></div>
            </div>
          </div>
            </div>
          </section>
          <section>
            <h2 className="pb-h2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 4h18v7H3zM3 13h18v7H3z" /></svg>Estado de Agentes</h2>
            <div className="pb-card pb-agents">
            <div className="pb-agent-row">
              <div className="pb-min"><p className="pb-agent-name">Servidor-Contabilidad</p><p className="pb-host">CONTAB-SRV01</p></div>
              <span className="pb-pill pb-st-ok"><span className="pb-dot" />En línea</span>
            </div>
            <div className="pb-agent-row">
              <div className="pb-min"><p className="pb-agent-name">Servidor-Archivo</p><p className="pb-host">ARCHIVO-SRV02</p></div>
              <span className="pb-pill pb-st-busy"><span className="pb-dot" />Ocupado</span>
            </div>
            <div className="pb-agent-row">
              <div className="pb-min"><p className="pb-agent-name">Estación-Legal</p><p className="pb-host">LEGAL-PC07</p></div>
              <span className="pb-pill pb-st-busy"><span className="pb-dot" />Ocupado</span>
            </div>
            <div className="pb-agent-row">
              <div className="pb-min"><p className="pb-agent-name">Estación-RRHH</p><p className="pb-host">RRHH-PC03</p></div>
              <span className="pb-pill pb-st-ok"><span className="pb-dot" />En línea</span>
            </div>
            <div className="pb-agent-row">
              <div className="pb-min"><p className="pb-agent-name">Portátil-Auditoría</p><p className="pb-host">AUD-LT12</p></div>
              <span className="pb-pill pb-st-off"><span className="pb-dot" />Desconectado</span>
            </div>
            <div className="pb-agent-row">
              <div className="pb-min"><p className="pb-agent-name">Servidor-Sucursal-Colón</p><p className="pb-host">COLON-SRV01</p></div>
              <span className="pb-pill pb-st-err"><span className="pb-dot" />Error</span>
            </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
