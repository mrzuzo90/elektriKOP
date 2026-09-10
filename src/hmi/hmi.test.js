import { describe, expect, it } from 'vitest';
import { newScreen, newComponent, normalizeHmi, clampGeometry } from './model';
import { createTagAccess, tagCatalog } from './bindings';
import { createMomentaries, createIOKeyboard } from './interactions';
import { migrateProjectData } from '../utils/projectFormat';
import { buildShareUrl, readProjectFromLocation } from '../utils/shareLink';
import { computeScanTick } from '../utils/scanCycle';

const blocks = [{ id: 'main', kind: 'main', rungs: [], interface: { in: [], out: [] } }];
describe('definición HMI', () => {
  it('migra proyectos sin HMI y conserva pantallas y bindings al compartir', () => {
    expect(migrateProjectData({ blocks }).hmi.screens).toEqual([]);
    const screen = newScreen('Principal');
    screen.components.push({ ...newComponent('lamp'), tag: 'I0.0' });
    const project = { blocks, hmi: { version: 1, initialScreenId: screen.id, screens: [screen] } };
    const decoded = readProjectFromLocation(new URL(buildShareUrl(project, 'http://localhost/')).search);
    expect(migrateProjectData(decoded).hmi).toEqual(project.hmi);
  });
  it('acota geometría y tolera datos importados malformados', () => {
    expect(clampGeometry({ x: 630, y: -10, width: 100, height: 40 })).toEqual({ x: 540, y: 0, width: 100, height: 40 });
    expect(normalizeHmi({ screens: [null, { components: [null, { type: 'unknown' }] }] }).screens[0].components).toEqual([]);
  });
});
describe('bindings al PLC', () => {
  it('escribe el valor lógico NC y valida tipos/rangos sin alterar otros tags', () => {
    const physical = { 'I0.0': false };
    const analog = { IW0: 0 };
    const memory = { 'M0.0': false };
    const tags = createTagAccess({ inputs: physical, analogInputs: analog, outputs: {}, marks: memory,
      wiringMap: { 'I0.0': 'NC' }, setInput: (a, v) => { physical[a] = v; },
      setAnalog: (a, v) => { analog[a] = v; }, writeMemory: (a, v) => { memory[a] = v; } });
    expect(tags.read('I0.0')).toBe(true);
    expect(tags.write('I0.0', false)).toBe(true);
    expect(physical['I0.0']).toBe(true);
    expect(tags.read('I0.0')).toBe(false);
    expect(tags.write('IW0', 72)).toBe(true);
    expect(tags.read('IW0')).toBe(72);
    for (const value of [101, -1, NaN, Infinity, '', true]) expect(tags.write('IW0', value)).toBe(false);
    expect(tags.write('M0.0', 1)).toBe(false);
    expect(tags.write('unknown', true)).toBe(false);
    expect(tags.write('M0.0', true)).toBe(true);
    expect(computeScanTick(blocks, memory, {}).marks['M0.0']).toBe(true);
    expect(tagCatalog({ IW0: 'Nivel' }).find(t => t.address === 'IW0').label).toContain('Nivel');
  });
  it('el programa puede sobrescribir una salida escrita por HMI en el siguiente scan', () => {
    const program = [{ ...blocks[0], rungs: [{ id: 1, logic: [{ kind: 'contact', addr: 'I0.0', type: 'NO' }], outType: 'coil', outAddr: 'Q0.0' }] }];
    expect(computeScanTick(program, { 'Q0.0': true, 'I0.0': false }, {}).outputs['Q0.0']).toBe(false);
  });
});
describe('interacciones', () => {
  it('libera todas las pulsaciones y no libera otro propietario del mismo tag antes de tiempo', () => {
    const writes = [];
    const pulses = createMomentaries((a, v) => writes.push([a, v]));
    pulses.press('a', 'I0.0'); pulses.press('b', 'I0.0'); pulses.release('a');
    expect(writes.at(-1)).toEqual(['I0.0', true]);
    pulses.releaseAll();
    expect(writes.at(-1)).toEqual(['I0.0', false]);
    const count = writes.length;
    pulses.releaseAll(); expect(writes).toHaveLength(count);
  });
  it('ignora números en campos y libera una tecla iniciada fuera aunque el foco cambie', () => {
    const writes = []; const toggles = [];
    const keyboard = createIOKeyboard({ getDevice: () => 'pulsador', pulse: (a, v) => writes.push([a, v]), toggle: a => toggles.push(a) });
    keyboard.down({ key: '0', target: { tagName: 'INPUT' } });
    expect(writes).toEqual([]);
    keyboard.down({ key: '0', target: {} });
    keyboard.up({ key: '0', target: { tagName: 'INPUT' } });
    expect(writes).toEqual([['I0.0', true], ['I0.0', false]]);
    keyboard.down({ key: '1', target: {} }); keyboard.clear();
    expect(writes.at(-1)).toEqual(['I0.1', false]);
    expect(toggles).toEqual([]);
  });
});
