"use client";

import { useState } from "react";
import LiveMannequin from "./live-mannequin";
import { CHIP_FIELDS, CONFIRMED_SAMPLE, FIELD_CONFIG, SAMPLE_MEASUREMENTS } from "./data";
import "./live-mannequin.css";

export { default as LiveMannequin } from "./live-mannequin";

const fmt = (n: number) => n.toFixed(1).replace(".", ",");

/* Pantalla de medidas del editor de sastrería, con datos de muestra: chips a la izquierda, maniquí 3D a la derecha. */
export function LiveMannequinPanel() {
  const [measurements, setMeasurements] = useState<Record<string, number>>(SAMPLE_MEASUREMENTS);
  const [confirmed, setConfirmed] = useState<Set<string>>(() => new Set(CONFIRMED_SAMPLE));
  const [active, setActive] = useState<string | null>(null);

  const cfg = active ? FIELD_CONFIG[active] : null;
  const value = active ? measurements[active] : 0;
  const confirmedCount = CHIP_FIELDS.filter((f) => confirmed.has(f)).length;

  const change = (v: number) => active && setMeasurements((m) => ({ ...m, [active]: v }));
  const confirm = () => active && setConfirmed((s) => new Set(s).add(active));

  return (
    <section className="lm-panel" aria-label="Editor de medidas con maniquí 3D (datos de muestra)" data-motion="orbit">
      <header className="lm-head">
        <div>
          <h2 className="lm-title">Medidas · Juan Pérez</h2>
          <p className="lm-sub">Saco azul marino · 8 de 10 medidas mostradas</p>
        </div>
        <p className="lm-progress">
          <span className="lm-legend" aria-hidden="true" />
          <strong>{confirmedCount}</strong> de {CHIP_FIELDS.length} confirmadas
        </p>
      </header>

      <div className="lm-body">
        <div className="lm-side">
        <ul className="lm-chips">
          {CHIP_FIELDS.map((f) => {
            const isConfirmed = confirmed.has(f);
            return (
              <li key={f}>
                <button
                  type="button"
                  className="lm-chip"
                  data-active={active === f}
                  data-confirmed={isConfirmed}
                  aria-pressed={active === f}
                  onMouseEnter={() => setActive(f)}
                  onFocus={() => setActive(f)}
                  onClick={() => setActive(f)}
                >
                  <span className="lm-chip-top">
                    <span className="lm-chip-label">{FIELD_CONFIG[f].label}</span>
                    {isConfirmed && (
                      <svg className="lm-check" viewBox="0 0 12 12" width="12" height="12" aria-label="Confirmada">
                        <path d="M2 6.5l2.5 2.5L10 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span className="lm-chip-value">
                    {fmt(measurements[f])}
                    <span className="lm-chip-unit">cm</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
          <div className="lm-editor" aria-live="polite">
            {cfg && active ? (
              <>
                <div className="lm-editor-row">
                  <span className="lm-editor-name">{cfg.label}</span>
                  <span className="lm-editor-value">{fmt(value)} cm</span>
                </div>
                <input
                  className="lm-range"
                  type="range"
                  min={cfg.typicalMin}
                  max={cfg.typicalMax}
                  step={0.5}
                  value={value}
                  aria-label={`${cfg.label} en centímetros`}
                  onChange={(e) => change(Number(e.target.value))}
                />
                <div className="lm-editor-row">
                  <span className="lm-editor-range">Rango habitual {cfg.typicalMin}–{cfg.typicalMax} cm</span>
                  <button type="button" className="lm-confirm" onClick={confirm} disabled={confirmed.has(active)}>
                    {confirmed.has(active) ? "Medida confirmada" : `Confirmar ${cfg.label.toLowerCase()}`}
                  </button>
                </div>
              </>
            ) : (
              <p className="lm-editor-empty">Pasa el cursor por una medida o por un punto del maniquí para ver dónde se toma.</p>
            )}
          </div>
        </div>

        <div className="lm-stage">
          <LiveMannequin measurements={measurements} activeField={active} onActiveFieldChange={setActive} />

        </div>
      </div>
    </section>
  );
}

export default LiveMannequinPanel;
