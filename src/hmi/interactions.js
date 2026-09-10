import { INPUT_ADDR } from '../utils/constants';
export function createMomentaries(write) {
  const active = new Map();
  const release = owner => {
    const address = active.get(owner);
    active.delete(owner);
    if (address && ![...active.values()].includes(address)) write(address, false);
  };
  return {
    press(owner, address) {
      if (active.get(owner) === address) return;
      release(owner); active.set(owner, address); write(address, true);
    },
    release,
    releaseAll() { const addresses = new Set(active.values()); active.clear(); addresses.forEach(a => write(a, false)); },
  };
}
export const isEditingField = el => !!el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable);
export function createIOKeyboard({ getDevice, pulse, toggle }) {
  const held = new Map();
  return {
    down(e) {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || isEditingField(e.target) || !/^[0-9]$/.test(e.key) || held.has(e.key)) return;
      const addr = INPUT_ADDR[Number(e.key)];
      const momentary = getDevice(addr) === 'pulsador';
      held.set(e.key, momentary ? addr : null);
      if (momentary) pulse(addr, true); else toggle(addr);
    },
    up(e) { const addr = held.get(e.key); held.delete(e.key); if (addr) pulse(addr, false); },
    clear() { held.forEach(addr => { if (addr) pulse(addr, false); }); held.clear(); },
  };
}
