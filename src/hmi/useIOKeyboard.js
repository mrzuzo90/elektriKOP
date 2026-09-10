import { useEffect, useRef } from 'react';
import { createIOKeyboard } from './interactions';
export function useIOKeyboard(deviceMap, toggle, pulse) {
  const latest = useRef(null);
  latest.current = { deviceMap, toggle, pulse };
  useEffect(() => {
    const keys = createIOKeyboard({ getDevice: a => latest.current.deviceMap[a],
      toggle: a => latest.current.toggle(a), pulse: (a, v) => latest.current.pulse(a, v) });
    const hidden = () => { if (document.hidden) keys.clear(); };
    document.addEventListener('keydown', keys.down);
    document.addEventListener('keyup', keys.up);
    window.addEventListener('blur', keys.clear);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      keys.clear();
      document.removeEventListener('keydown', keys.down);
      document.removeEventListener('keyup', keys.up);
      window.removeEventListener('blur', keys.clear);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, []);
}
