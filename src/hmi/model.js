export const SCREEN_WIDTH = 640;
export const SCREEN_HEIGHT = 360;
export const COMPONENT_TYPES = {
  text: 'Texto estático', lamp: 'Piloto booleano', alarm: 'Piloto de alarma', momentary: 'Botón momentáneo',
  toggle: 'Interruptor', number: 'Valor numérico', setpoint: 'Campo de consigna', navigation: 'Navegación',
  timer: 'Temporizador', counter: 'Contador', bar: 'Barra analógica',
};
export const emptyHmi = () => ({ version: 1, initialScreenId: null, screens: [] });
const id = () => crypto.randomUUID();
const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
export function clampGeometry(rect) {
  const width = Math.max(32, Math.min(SCREEN_WIDTH, finite(rect.width, 144)));
  const height = Math.max(20, Math.min(SCREEN_HEIGHT, finite(rect.height, 64)));
  return { x: Math.max(0, Math.min(SCREEN_WIDTH - width, finite(rect.x, 16))),
    y: Math.max(0, Math.min(SCREEN_HEIGHT - height, finite(rect.y, 16))), width, height };
}
export function newScreen(name = 'Pantalla') {
  return { id: id(), name, width: SCREEN_WIDTH, height: SCREEN_HEIGHT, background: '#1e2b22', components: [] };
}
export function newComponent(type) {
  const indicator = type === 'lamp' || type === 'alarm';
  const isTimer = type === 'timer';
  const isCounter = type === 'counter';
  const isBar = type === 'bar';
  return {
    id: id(), type, label: COMPONENT_TYPES[type], x: 16, y: 16,
    width: indicator ? 96 : (isTimer || isCounter) ? 180 : isBar ? 180 : 160,
    height: indicator ? 96 : (isTimer || isCounter) ? 76 : isBar ? 40 : 64,
    ...(type === 'number' ? { decimals: null, unit: '' } : {}),
    ...(type === 'bar' ? { min: 0, max: 100, orientation: 'horizontal', barColor: '#0099cc' } : {}),
    ...(type === 'timer' ? { mode: 'elapsed', barColor: '#00b000' } : {}),
    ...(type === 'counter' ? { barColor: '#ffcc00' } : {}),
    tag: '', targetScreenId: '', foreground: '#ffffff', background: '#262626', offColor: '#555555', onColor: type === 'alarm' ? '#ff3333' : '#ffcc00'
  };
}
const color = (v, fallback) => typeof v === 'string' && /^#[\da-f]{6}$/i.test(v) ? v : fallback;
const string = (v, fallback = '') => typeof v === 'string' ? v : fallback;
// Whitelist imported properties: malformed HMI data must not prevent opening a PLC project.
export function normalizeHmi(raw) {
  if (!raw || !Array.isArray(raw.screens)) return emptyHmi();
  const usedIds = new Set();
  const uniqueId = value => {
    const result = typeof value === 'string' && value && !usedIds.has(value) ? value : id();
    usedIds.add(result); return result;
  };
  const screens = raw.screens.filter(s => s && typeof s === 'object').map(s => ({
    id: uniqueId(s.id), name: string(s.name, 'Pantalla'), width: SCREEN_WIDTH, height: SCREEN_HEIGHT,
    background: color(s.background, '#1e2b22'),
    components: (Array.isArray(s.components) ? s.components : []).filter(c => c && Object.hasOwn(COMPONENT_TYPES, c.type)).map(c => ({
      id: uniqueId(c.id), type: c.type, label: string(c.label, COMPONENT_TYPES[c.type]), ...clampGeometry(c),
      ...(c.type === 'number' ? { decimals: Number.isInteger(c.decimals) ? Math.max(0, Math.min(3, c.decimals)) : null, unit: string(c.unit) } : {}),
      ...(c.type === 'bar' ? {
        min: finite(c.min, 0),
        max: finite(c.max, 100),
        orientation: c.orientation === 'vertical' ? 'vertical' : 'horizontal',
        barColor: color(c.barColor, '#0099cc'),
      } : {}),
      ...(c.type === 'timer' ? {
        mode: c.mode === 'remaining' ? 'remaining' : 'elapsed',
        barColor: color(c.barColor, '#00b000'),
      } : {}),
      ...(c.type === 'counter' ? {
        barColor: color(c.barColor, '#ffcc00'),
      } : {}),
      tag: string(c.tag), targetScreenId: string(c.targetScreenId), foreground: color(c.foreground, '#ffffff'),
      background: color(c.background, '#262626'), offColor: color(c.offColor, '#555555'), onColor: color(c.onColor, '#ffcc00'),
    })),
  }));
  return { version: 1, initialScreenId: screens.some(s => s.id === raw.initialScreenId) ? raw.initialScreenId : screens[0]?.id ?? null, screens };
}
