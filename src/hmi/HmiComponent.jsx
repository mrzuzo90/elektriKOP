import { useRef, useState } from 'react';
import { formatNumericValue, companionMetricAddress } from './metrics';
import { bindingType, tagCatalog, validTagValue } from './bindings';

function Setpoint({ component: c, value, write, disabled }) {
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  const cancelBlur = useRef(false);
  const commit = () => {
    if (draft === null) return;
    const number = draft.trim() === '' ? NaN : Number(draft);
    if (!validTagValue(c.tag, number)) { setError('Introduce un valor de 0 a 100'); return; }
    write(c.tag, number); setDraft(null); setError('');
  };
  return <label className="hmi-setpoint">
    <span>{c.label}</span>
    <input aria-label={c.label} type="text" inputMode="decimal" disabled={disabled}
      value={draft ?? String(value ?? 0)} aria-invalid={!!error}
      onChange={e => { setDraft(e.target.value); setError(''); }} onBlur={() => { if (cancelBlur.current) { cancelBlur.current = false; return; } commit(); }}
      onKeyDown={e => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); }
        if (e.key === 'Escape') { cancelBlur.current = true; setDraft(null); setError(''); e.currentTarget.blur(); }
      }} />
    {error && <small role="alert">{error}</small>}
  </label>;
}

export default function HmiComponent({ component: c, tags, screens, editing = false, pulses, navigate }) {
  const expected = bindingType(c.type);
  const source = (tags?.catalog || tagCatalog()).find(t => t.address === c.tag && t.type === expected);
  const valid = !expected || !!source && (c.type !== 'setpoint' || source.writable !== false);
  const destinationExists = c.type !== 'navigation' || screens.some(s => s.id === c.targetScreenId);
  const unavailable = !valid || !destinationExists;
  const value = valid ? tags?.read(c.tag) : undefined;
  const title = !valid ? 'Tag sin asignar o incompatible' : !destinationExists ? 'Pantalla destino no disponible' : source?.writable === false ? `${source.label}${value === undefined ? ' · Sin ejecución en el último scan' : ''}` : c.tag;
  const indicator = c.type === 'lamp' || c.type === 'alarm';
  const diameter = Math.max(12, Math.min(c.width - 12, c.height - 28));
  let content;
  if (c.type === 'text') content = <span className="hmi-text">{c.label}</span>;
  else if (indicator) content = <div className="hmi-lamp" role="status" aria-label={c.label} data-value={value ? 'true' : 'false'}>
    <span className="hmi-led" aria-hidden="true" style={{ width: diameter, height: diameter, borderColor: c.background,
      '--lamp-on': c.onColor, '--lamp-off': c.offColor }}>
      <span className={`hmi-lens ${c.type === 'alarm' && value && !editing ? 'hmi-alarm-active' : ''}`}
        style={{ backgroundColor: value ? c.onColor : c.offColor, boxShadow: value ? `0 0 14px ${c.onColor}` : 'inset 2px 3px 5px #0008' }} />
    </span>
    <span className="hmi-lamp-label">{c.label}</span>
  </div>;
  else if (c.type === 'number') content = <div className="hmi-number"><span>{c.label}</span><output aria-label={c.label}>{valid ? formatNumericValue(value, c, source) : '—'}</output></div>;
  else if (c.type === 'timer') {
    const ptVal = tags?.read(companionMetricAddress(c.tag, 'PT'));
    const currentVal = Number.isFinite(value) ? Number(value) : undefined;
    const ptNumber = Number.isFinite(ptVal) ? Number(ptVal) : undefined;
    const pct = ptNumber && ptNumber > 0 && currentVal !== undefined ? Math.min(100, Math.max(0, (currentVal / ptNumber) * 100)) : 0;
    const displayVal = currentVal !== undefined ? `${currentVal.toFixed(1)} s` : '—';
    const ptDisplay = ptNumber !== undefined ? `PT: ${ptNumber.toFixed(1)} s` : '';
    content = <div className="hmi-gauge-card hmi-timer-card" role="group" aria-label={c.label}>
      <div className="hmi-gauge-header">
        <span className="hmi-gauge-label">{c.label}</span>
        {ptDisplay && <span className="hmi-gauge-preset">{ptDisplay}</span>}
      </div>
      <div className="hmi-gauge-body">
        <span className="hmi-gauge-value">{valid ? displayVal : '—'}</span>
      </div>
      <div className="hmi-gauge-track" aria-hidden="true">
        <div className="hmi-gauge-fill" style={{ width: `${pct}%`, backgroundColor: c.barColor || '#00b000' }} />
      </div>
    </div>;
  }
  else if (c.type === 'counter') {
    const pvVal = tags?.read(companionMetricAddress(c.tag, 'PV'));
    const currentVal = Number.isFinite(value) ? Number(value) : undefined;
    const pvNumber = Number.isFinite(pvVal) ? Number(pvVal) : undefined;
    const reached = currentVal !== undefined && pvNumber !== undefined && currentVal >= pvNumber;
    const pct = pvNumber && pvNumber > 0 && currentVal !== undefined ? Math.min(100, Math.max(0, (currentVal / pvNumber) * 100)) : 0;
    content = <div className="hmi-gauge-card hmi-counter-card" role="group" aria-label={c.label}>
      <div className="hmi-gauge-header">
        <span className="hmi-gauge-label">{c.label}</span>
        <span className={`hmi-counter-badge ${reached ? 'hmi-counter-reached' : ''}`}>
          {reached ? 'MAX' : (pvNumber !== undefined ? `PV: ${pvNumber}` : '')}
        </span>
      </div>
      <div className="hmi-gauge-body hmi-counter-body">
        <span className="hmi-gauge-value">{currentVal !== undefined ? currentVal : '—'}</span>
        {pvNumber !== undefined && <span className="hmi-counter-max">/ {pvNumber}</span>}
      </div>
      <div className="hmi-gauge-track" aria-hidden="true">
        <div className="hmi-gauge-fill" style={{ width: `${pct}%`, backgroundColor: reached ? '#ff3333' : (c.barColor || '#ffcc00') }} />
      </div>
    </div>;
  }
  else if (c.type === 'bar') {
    const minVal = Number.isFinite(c.min) ? c.min : 0;
    const maxVal = Number.isFinite(c.max) ? c.max : 100;
    const range = maxVal - minVal;
    const currentVal = Number.isFinite(value) ? Number(value) : 0;
    const pct = range > 0 ? Math.min(100, Math.max(0, ((currentVal - minVal) / range) * 100)) : 0;
    const isVertical = c.orientation === 'vertical';
    content = <div className={`hmi-bargraph ${isVertical ? 'hmi-bar-v' : 'hmi-bar-h'}`} role="meter" aria-valuenow={currentVal} aria-valuemin={minVal} aria-valuemax={maxVal} aria-label={c.label}>
      <div className="hmi-bar-info">
        <span className="hmi-bar-label">{c.label}</span>
        <span className="hmi-bar-val">{valid && Number.isFinite(value) ? (Number.isInteger(value) ? value : value.toFixed(1)) : '—'}</span>
      </div>
      <div className="hmi-bar-frame">
        <div className="hmi-bar-fill" style={{
          [isVertical ? 'height' : 'width']: `${pct}%`,
          backgroundColor: c.barColor || '#0099cc'
        }} />
        {!isVertical && <div className="hmi-bar-ticks" aria-hidden="true">
          <span style={{ left: '0%' }} />
          <span style={{ left: '25%' }} />
          <span style={{ left: '50%' }} />
          <span style={{ left: '75%' }} />
          <span style={{ left: '100%' }} />
        </div>}
      </div>
    </div>;
  }
  else if (c.type === 'setpoint') content = <Setpoint component={c} value={value} write={tags?.write} disabled={editing || unavailable} />;
  else {
    const momentary = c.type === 'momentary';
    const release = () => pulses?.release(c.id);
    content = <button type="button" className="hmi-control" disabled={editing || unavailable}
      aria-pressed={c.type === 'toggle' ? !!value : undefined}
      style={{ background: c.type === 'toggle' ? (value ? c.onColor : c.offColor) : c.background, color: c.foreground }}
      onPointerDown={momentary ? e => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId); pulses.press(c.id, c.tag);
      } : undefined}
      onPointerUp={momentary ? release : undefined} onPointerCancel={momentary ? release : undefined}
      onLostPointerCapture={momentary ? release : undefined} onBlur={momentary ? release : undefined}
      onKeyDown={momentary ? e => {
        if ([' ', 'Enter'].includes(e.key)) { e.preventDefault(); if (!e.repeat) pulses.press(c.id, c.tag); }
      } : undefined}
      onKeyUp={momentary ? e => { if ([' ', 'Enter'].includes(e.key)) { e.preventDefault(); release(); } } : undefined}
      onClick={c.type === 'navigation' ? () => navigate(c.targetScreenId) : c.type === 'toggle' ? () => tags.write(c.tag, !tags.read(c.tag)) : undefined}>
      {c.label}{c.type === 'navigation' && <span aria-hidden="true"> →</span>}
    </button>;
  }
  return <div className={`hmi-component ${indicator ? 'hmi-indicator' : ''} ${unavailable ? 'hmi-unbound' : ''}`} title={title}
    style={{ color: c.foreground, background: indicator ? 'transparent' : c.background }}>
    {content}{unavailable && <span className="hmi-binding-error">{!valid ? 'TAG ?' : 'DESTINO ?'}</span>}
  </div>;
}
