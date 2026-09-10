import { useState } from 'react';

export default function HmiSiemensFrame({
  children,
  screenName = '',
  running = false,
  hasAlarm = false,
  onHome,
  onToggleRun,
  onPrevScreen,
  onNextScreen,
  defaultChassis = true,
}) {
  const [chassisMode, setChassisMode] = useState(defaultChassis);

  if (!chassisMode) {
    return (
      <div className="hmi-frame-plain">
        <div className="hmi-frame-toggle-bar">
          <button
            type="button"
            className="hmi-chassis-toggle-btn"
            onClick={() => setChassisMode(true)}
            title="Activar chasis industrial Siemens SIMATIC HMI"
          >
            🖥️ Mostrar Chasis Siemens
          </button>
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="siemens-hmi-chassis" aria-label="Panel de Operador Siemens SIMATIC HMI">
      {/* 4 Corner Allen Screws */}
      <div className="siemens-screw screw-tl" aria-hidden="true"><span>+</span></div>
      <div className="siemens-screw screw-tr" aria-hidden="true"><span>+</span></div>
      <div className="siemens-screw screw-bl" aria-hidden="true"><span>+</span></div>
      <div className="siemens-screw screw-br" aria-hidden="true"><span>+</span></div>

      {/* Top Header / Branding */}
      <header className="siemens-chassis-header">
        <div className="siemens-brand-block">
          <span className="siemens-logo-text">SIEMENS</span>
          <span className="siemens-model-badge">SIMATIC HMI</span>
          <span className="siemens-model-sub">KTP-600 COLOR PN</span>
        </div>

        <div className="siemens-header-center">
          <div className="siemens-accent-line" />
          {screenName && <span className="siemens-screen-tag">{screenName}</span>}
        </div>

        <div className="siemens-led-cluster" aria-label="Indicadores de estado del panel">
          <div className="siemens-led-item" title="Alimentación">
            <span className="siemens-panel-led led-pwr" />
            <span className="siemens-led-label">PWR</span>
          </div>
          <div className="siemens-led-item" title={running ? "PLC en modo RUN" : "PLC en STOP"}>
            <span className={`siemens-panel-led ${running ? 'led-run' : 'led-off'}`} />
            <span className="siemens-led-label">RUN</span>
          </div>
          <div className="siemens-led-item" title={hasAlarm ? "Alarma activa" : "Sin alarmas"}>
            <span className={`siemens-panel-led ${hasAlarm ? 'led-alarm-active' : 'led-off'}`} />
            <span className="siemens-led-label">ALARM</span>
          </div>
          <button
            type="button"
            className="siemens-mini-toggle"
            onClick={() => setChassisMode(false)}
            title="Ocultar chasis y ver solo pantalla limpia"
          >
            ✕
          </button>
        </div>
      </header>

      {/* Inner Beveled Screen Container */}
      <div className="siemens-bezel-recess">
        <div className="siemens-bezel-inner">
          {children}
        </div>
      </div>

      {/* Bottom Membrane Keypad */}
      <footer className="siemens-membrane-keypad" aria-label="Teclas de función de membrana">
        <div className="siemens-membrane-strip">
          <button
            type="button"
            className="siemens-key-btn"
            onClick={onHome}
            title="F1 — Ir a pantalla inicial"
          >
            <span className="siemens-key-num">F1</span>
            <span className="siemens-key-desc">⌂ INICIO</span>
          </button>

          <button
            type="button"
            className={`siemens-key-btn ${running ? 'key-run-active' : ''}`}
            onClick={onToggleRun}
            disabled={!onToggleRun}
            title="F2 — Alternar RUN / STOP del PLC"
          >
            <span className="siemens-key-num">F2</span>
            <span className="siemens-key-desc">{running ? '⏹ STOP' : '▶ RUN'}</span>
          </button>

          <button
            type="button"
            className="siemens-key-btn"
            onClick={onPrevScreen}
            disabled={!onPrevScreen}
            title="F3 — Pantalla anterior"
          >
            <span className="siemens-key-num">F3</span>
            <span className="siemens-key-desc">◄ ANT</span>
          </button>

          <button
            type="button"
            className="siemens-key-btn"
            onClick={onNextScreen}
            disabled={!onNextScreen}
            title="F4 — Pantalla siguiente"
          >
            <span className="siemens-key-num">F4</span>
            <span className="siemens-key-desc">SIG ►</span>
          </button>
        </div>

        {/* Industrial Tactile Ribs */}
        <div className="siemens-tactile-ribs" aria-hidden="true">
          <div className="rib" /><div className="rib" /><div className="rib" /><div className="rib" />
        </div>
      </footer>
    </div>
  );
}
