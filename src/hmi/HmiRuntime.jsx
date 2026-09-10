import { useEffect, useRef, useState } from 'react';
import { createMomentaries } from './interactions';
import HmiComponent from './HmiComponent';
import HmiSiemensFrame from './HmiSiemensFrame';

export default function HmiRuntime({ hmi, tags, running, onToggleRun }) {
  const [screenId, setScreenId] = useState(hmi.initialScreenId);
  const currentTags = useRef(tags);
  currentTags.current = tags;
  const [pulses] = useState(() => createMomentaries((a, v) => currentTags.current.write(a, v)));
  const screen = hmi.screens.find(s => s.id === screenId) || hmi.screens.find(s => s.id === hmi.initialScreenId) || hmi.screens[0];
  useEffect(() => {
    const hidden = () => { if (document.hidden) pulses.releaseAll(); };
    window.addEventListener('blur', pulses.releaseAll);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      pulses.releaseAll();
      window.removeEventListener('blur', pulses.releaseAll);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [pulses]);
  useEffect(() => () => pulses.releaseAll(), [hmi, pulses]);
  const navigate = id => { pulses.releaseAll(); setScreenId(id); };
  if (!screen) return <p className="hmi-empty">Crea una pantalla en Editar HMI para empezar.</p>;

  const screenIndex = hmi.screens.findIndex(s => s.id === screen.id);
  const prevScreenId = screenIndex > 0 ? hmi.screens[screenIndex - 1]?.id : null;
  const nextScreenId = screenIndex >= 0 && screenIndex < hmi.screens.length - 1 ? hmi.screens[screenIndex + 1]?.id : null;
  const hasAlarm = (screen.components || []).some(c => c.type === 'alarm' && Boolean(tags?.read(c.tag)));

  return <div className="hmi-runtime">
    <div className="hmi-toolbar"><strong>{screen.name}</strong><button onClick={() => navigate(hmi.initialScreenId)}>⌂ Pantalla inicial</button><span>0–9 · depuración E/S</span></div>
    <div className="hmi-canvas-scroll">
      <HmiSiemensFrame
        screenName={screen.name}
        running={running}
        hasAlarm={hasAlarm}
        onHome={() => navigate(hmi.initialScreenId || hmi.screens[0]?.id)}
        onToggleRun={onToggleRun}
        onPrevScreen={prevScreenId ? () => navigate(prevScreenId) : undefined}
        onNextScreen={nextScreenId ? () => navigate(nextScreenId) : undefined}
      >
        <div className="hmi-canvas" style={{ backgroundColor: screen.background }} aria-label={`Pantalla HMI ${screen.name}`}>
          {screen.components.map(c => <div key={`${screen.id}:${c.id}`} className="hmi-position" style={{ left: c.x, top: c.y, width: c.width, height: c.height }}>
            <HmiComponent component={c} tags={tags} screens={hmi.screens} pulses={pulses} navigate={navigate} />
          </div>)}
        </div>
      </HmiSiemensFrame>
    </div>
  </div>;
}
