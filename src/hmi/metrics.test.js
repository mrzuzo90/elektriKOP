import { describe, expect, it } from 'vitest';
import { collectHmiMetrics, metricAddress, formatNumericValue } from './metrics';
import { createTagAccess } from './bindings';
import { computeScanTick } from '../utils/scanCycle';
import { newComponent, newScreen, normalizeHmi } from './model';
const contact = addr => [{ kind: 'contact', id: addr, addr, neg: false }];
const block = (id, rungs) => ({ id, name: id, kind: id === 'main' ? 'main' : 'fb', rungs, interface: { in: [], out: [], static: [] } });
const timer = (id, type = 'ton') => ({ id, title: `Tiempo ${id}`, outType: type, preset: 2, logic: contact('I0.0'), outAddr: 'Q0.0' });
const read = (metrics, path, field) => metrics[metricAddress(path, field)]?.value;
describe('valores de temporizadores y contadores para HMI', () => {
  it.each(['ton', 'tof', 'tp'])('expone ET, PT y restante de %s desde la memoria del motor', type => {
    const blocks = [block('main', [timer('t', type)])];
    const state = type === 'tp' ? { elapsed: 0.7 } : 0.7;
    const metrics = collectHmiMetrics(blocks, { 'main:t': state });
    expect(read(metrics, 'main:t', 'ET')).toBe(0.7);
    expect(read(metrics, 'main:t', 'PT')).toBe(2);
    expect(read(metrics, 'main:t', 'remaining')).toBeCloseTo(1.3);
  });
  it.each(['ctu', 'ctd', 'ctud'])('expone CV y PV de %s sin confundirlos con la salida BOOL', type => {
    const metrics = collectHmiMetrics([block('main', [{ ...timer('c', type), preset: 10 }])], { 'main:c': { count: 7 } });
    expect(read(metrics, 'main:c', 'CV')).toBe(7);
    expect(read(metrics, 'main:c', 'PV')).toBe(10);
  });
  it('mantiene independientes dos llamadas al mismo FB y distingue una llamada no ejecutada', () => {
    const calls = [1, 2].map(id => ({ id, title: `Llamada ${id}`, outType: 'call', callTarget: 'fb', logic: contact(`I0.${id}`) }));
    const blocks = [block('main', calls), block('fb', [timer('t')])];
    const tick = computeScanTick(blocks, { 'I0.0': true, 'I0.1': true, 'I0.2': false }, {});
    const metrics = collectHmiMetrics(blocks, tick.timers);
    expect(read(metrics, 'main:1>fb:t', 'ET')).toBe(0.1);
    expect(read(metrics, 'main:2>fb:t', 'ET')).toBeUndefined();
    expect(read(metrics, 'main:2>fb:t', 'PT')).toBe(2);
    const next = collectHmiMetrics(blocks, { 'main:1>fb:t': 0.8, 'main:2>fb:t': 1.4 });
    expect(read(next, 'main:1>fb:t', 'ET')).toBe(0.8);
    expect(read(next, 'main:2>fb:t', 'ET')).toBe(1.4);
    expect(next[metricAddress('main:1>fb:t', 'ET')].label).toContain('Llamada 1');
  });
  it('conserva bindings al renombrar, los invalida al borrar y corta ciclos importados', () => {
    const t = timer('t');
    const blocks = [block('main', [t, { id: 'loop', outType: 'call', callTarget: 'main' }])];
    const metrics = collectHmiMetrics(blocks, {});
    expect(Object.keys(metrics)).toHaveLength(3);
    expect(read(metrics, 'main:t', 'ET')).toBeUndefined();
    expect(Object.keys(collectHmiMetrics([{ ...blocks[0], name: 'Renombrado', rungs: [{ ...t, title: 'Otra etiqueta' }] }], {}))).toEqual(Object.keys(metrics));
    expect(collectHmiMetrics([block('main', [])], {})).toEqual({});
  });
  it('el adaptador permite leer métricas pero nunca escribirlas', () => {
    const metrics = collectHmiMetrics([block('main', [timer('t')])], { 'main:t': 1.2 });
    const access = createTagAccess({ inputs: {}, outputs: {}, marks: {}, analogInputs: {}, metrics });
    const key = metricAddress('main:t', 'ET');
    expect(access.read(key)).toBe(1.2);
    expect(access.write(key, 0)).toBe(false);
    expect(access.catalog.find(t => t.address === key).writable).toBe(false);
  });
  it('formatea tiempos sin errores de coma flotante y conserva unidad/decimales en el proyecto', () => {
    expect(formatNumericValue(0.30000000000000004, {}, { decimals: 1, unit: 's' })).toBe('0.3 s');
    expect(formatNumericValue(7, { decimals: 0, unit: 'piezas' })).toBe('7 piezas');
    expect(formatNumericValue(undefined, {})).toBe('—');
    const c = { ...newComponent('number'), tag: metricAddress('main:t', 'ET'), decimals: 2, unit: 'seg' };
    const screen = { ...newScreen(), components: [c] };
    expect(normalizeHmi({ screens: [screen] }).screens[0].components[0]).toEqual(c);
  });
});
