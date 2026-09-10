import { useEffect, useRef, useState } from 'react';
import { clampGeometry, COMPONENT_TYPES, newComponent, newScreen } from './model';
import HmiComponent from './HmiComponent';
import HmiInspector from './HmiInspector';
import HmiSiemensFrame from './HmiSiemensFrame';

export default function HmiEditor({ hmi, onChange, tags, symbols, running, onToggleRun }) {
  const [screenId, setScreenId] = useState(hmi.initialScreenId);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);
  const gesture = useRef(null);
  const screen = hmi.screens.find(s => s.id === screenId) || hmi.screens[0];
  const selected = screen?.components.find(c => c.id === selectedId);
  const updateScreen = (patch, options) => onChange({ ...hmi, screens: hmi.screens.map(s => s.id === screen.id ? { ...s, ...patch } : s) }, options);
  const updateComponent = patch => updateScreen({ components: screen.components.map(c => c.id === selectedId ? { ...c, ...patch } : c) });
  const cancelGesture = () => { gesture.current = null; setDraft(null); };
  useEffect(() => {
    const hidden = () => { if (document.hidden) cancelGesture(); };
    window.addEventListener('blur', cancelGesture);
    document.addEventListener('visibilitychange', hidden);
    return () => { window.removeEventListener('blur', cancelGesture); document.removeEventListener('visibilitychange', hidden); };
  }, []);
  const start = (event, component, resize) => {
    if (event.button !== 0) return;
    event.preventDefault(); event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedId(component.id);
    gesture.current = { component, screenId: screen.id, x: event.clientX, y: event.clientY, resize, next: component };
  };
  const move = event => {
    const g = gesture.current;
    if (!g) return;
    const dx = event.clientX - g.x; const dy = event.clientY - g.y;
    const geometry = clampGeometry({ ...g.component, ...(g.resize ? {
      width: Math.min(640 - g.component.x, g.component.width + dx), height: Math.min(360 - g.component.y, g.component.height + dy),
    } : { x: g.component.x + dx, y: g.component.y + dy }) });
    g.next = { ...g.component, ...geometry };
    setDraft(g.next);
  };
  const finish = () => {
    const g = gesture.current;
    if (!g) return;
    if (screen?.id === g.screenId && g.next !== g.component) {
      updateScreen({ components: screen.components.map(c => c.id === g.component.id ? g.next : c) }, { discrete: true });
    }
    cancelGesture();
  };
  const addScreen = () => {
    const next = newScreen(`Pantalla ${hmi.screens.length + 1}`);
    onChange({ ...hmi, initialScreenId: hmi.initialScreenId || next.id, screens: [...hmi.screens, next] }, { discrete: true });
    setScreenId(next.id); setSelectedId(null);
  };
  return <div className="hmi-editor">
    <div className="hmi-toolbar hmi-screens" aria-label="Pantallas HMI">
      {hmi.screens.map(s => <button key={s.id} aria-pressed={s.id === screen?.id} onClick={() => { cancelGesture(); setScreenId(s.id); setSelectedId(null); }}>
        {s.id === hmi.initialScreenId ? '⌂ ' : ''}{s.name}
      </button>)}
      <button onClick={addScreen}>+ Pantalla</button>
    </div>
    {!screen ? <div className="hmi-empty"><h3>Tu primera pantalla de operador</h3><p>Añade una pantalla y coloca los componentes sobre el lienzo.</p><button onClick={addScreen}>Crear pantalla</button></div> : <>
      <div className="hmi-toolbar hmi-screen-properties">
        <label>Nombre de pantalla<input value={screen.name} onChange={e => updateScreen({ name: e.target.value })} /></label>
        <label>Fondo de pantalla<input type="color" value={screen.background} onChange={e => updateScreen({ background: e.target.value })} /></label>
        <button disabled={screen.id === hmi.initialScreenId} onClick={() => onChange({ ...hmi, initialScreenId: screen.id }, { discrete: true })}>Usar como inicial</button>
        <button className="hmi-danger" onClick={() => {
          const screens = hmi.screens.filter(s => s.id !== screen.id);
          onChange({ ...hmi, screens, initialScreenId: hmi.initialScreenId === screen.id ? screens[0]?.id ?? null : hmi.initialScreenId }, { discrete: true });
          setSelectedId(null);
        }}>Eliminar pantalla</button>
      </div>
      <div className="hmi-palette" aria-label="Añadir componente">{Object.entries(COMPONENT_TYPES).map(([type, label]) =>
        <button key={type} onClick={() => {
          const offset = (screen.components.length % 6) * 24;
          const next = { ...newComponent(type), x: 16 + offset, y: 16 + offset };
          updateScreen({ components: [...screen.components, next] }, { discrete: true }); setSelectedId(next.id);
        }}>+ {label}</button>)}</div>
      <div className="hmi-editor-body">
        <section className="hmi-design-area">
          <div className="hmi-canvas-scroll">
            <HmiSiemensFrame
              screenName={screen.name}
              running={running}
              hasAlarm={screen.components.some(c => c.type === 'alarm' && Boolean(tags?.read(c.tag)))}
              onHome={() => { cancelGesture(); setScreenId(hmi.initialScreenId); setSelectedId(null); }}
              onToggleRun={onToggleRun}
            >
              <div className="hmi-canvas hmi-grid" aria-label="Lienzo HMI" style={{ backgroundColor: screen.background }} onPointerDown={() => setSelectedId(null)}>
                {screen.components.map(saved => {
                  const c = draft?.id === saved.id ? draft : saved;
                  return <div key={c.id} role="button" tabIndex={0} aria-label={`Seleccionar ${c.label}`} aria-pressed={selectedId === c.id}
                    className={`hmi-position hmi-editable ${selectedId === c.id ? 'hmi-selected' : ''}`}
                    style={{ left: c.x, top: c.y, width: c.width, height: c.height }}
                    onFocus={() => setSelectedId(c.id)}
                    onKeyDown={e => {
                      if (e.target !== e.currentTarget) return;
                      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedId(c.id); }
                    }}
                    onPointerDown={e => start(e, saved, false)} onPointerMove={move} onPointerUp={finish} onPointerCancel={cancelGesture} onLostPointerCapture={cancelGesture}>
                    <HmiComponent component={c} tags={tags} screens={hmi.screens} editing />
                    {selectedId === c.id && <span className="hmi-resize" role="button" aria-label={`Redimensionar ${c.label}`} onPointerDown={e => start(e, saved, true)} />}
                  </div>;
                })}
              </div>
            </HmiSiemensFrame>
          </div>
          <p className="hmi-hint">640 × 360 · Arrastra para mover · Tirador inferior para redimensionar · Ctrl+Z para deshacer</p>
          {screen.components.length > 0 && <div className="hmi-object-list" aria-label="Componentes de pantalla">{screen.components.map(c =>
            <button key={c.id} aria-pressed={c.id === selectedId} onClick={() => setSelectedId(c.id)}>{c.label || COMPONENT_TYPES[c.type]}</button>)}</div>}
        </section>
        <HmiInspector component={selected} screens={hmi.screens} symbols={symbols} catalog={tags.catalog} onChange={updateComponent}
          onDelete={() => { updateScreen({ components: screen.components.filter(c => c.id !== selectedId) }, { discrete: true }); setSelectedId(null); }} />
      </div>
    </>}
  </div>;
}
