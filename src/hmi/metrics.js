import { MAX_CALL_DEPTH } from '../utils/constants';

const TIMER_TYPES = ['ton', 'tof', 'tp'];
const COUNTER_TYPES = ['ctu', 'ctd', 'ctud'];
export const metricAddress = (path, field) => `metric:${path}:${field}`;

// Follow static call sites using the same path scheme as computeScanTick.
// Never collapse two calls to one block: each has its own timer/counter memory.
// A missing runtime entry means not executed (or reset), not a fabricated zero.
export function collectHmiMetrics(blocks = [], timerDisplay = {}) {
  const metrics = {};
  const byId = new Map(blocks.map(b => [b.id, b]));
  function visit(blockId, prefix, labels, ancestors, depth) {
    if (depth > MAX_CALL_DEPTH || ancestors.has(blockId)) return;
    const block = byId.get(blockId);
    if (!block) return;
    const nextAncestors = new Set([...ancestors, blockId]);
    for (const rung of block.rungs || []) {
      const path = `${prefix}:${rung.id}`;
      const rungLabel = `${block.name || block.id} / ${rung.title || `Segmento ${rung.id}`} [${rung.id}]`;
      const location = [...labels, rungLabel].join(' → ');
      if (rung.outType === 'call') {
        const calls = Array.isArray(rung.calls) && rung.calls.length > 0
          ? rung.calls
          : rung.callTarget
            ? [{ id: 'c0', callTarget: rung.callTarget }]
            : [];
        calls.forEach((c, callIdx) => {
          if (!c.callTarget) return;
          const subPath = calls.length > 1
            ? `${path}>${c.callTarget}:${c.id || callIdx}`
            : `${path}>${c.callTarget}`;
          visit(c.callTarget, subPath, [...labels, rungLabel], nextAncestors, depth + 1);
        });
        continue;
      }
      const timer = TIMER_TYPES.includes(rung.outType);
      if (!timer && !COUNTER_TYPES.includes(rung.outType)) continue;
      const preset = Number.isFinite(rung.preset) ? rung.preset : undefined;
      const state = timerDisplay[path];
      const raw = timer ? (rung.outType === 'tp' ? state?.elapsed : state) : state?.count;
      const value = Number.isFinite(raw) ? raw : undefined;
      const add = (field, label, value) => {
        const address = metricAddress(path, field);
        metrics[address] = { address, label: `${location} · ${rung.outType.toUpperCase()} · ${label}`,
          type: 'NUMBER', writable: false, group: timer ? 'Temporizadores' : 'Contadores',
          unit: timer ? 's' : '', decimals: timer ? 1 : 0, value };
      };
      if (timer) {
        add('ET', 'Transcurrido (ET)', value);
        add('PT', 'Consigna (PT)', preset);
        add('remaining', 'Restante', value !== undefined && preset !== undefined ? Math.max(0, preset - value) : undefined);
      } else {
        add('CV', 'Valor actual (CV)', value);
        add('PV', 'Consigna (PV)', preset);
      }
    }
  }
  visit('main', 'main', [], new Set(), 0);
  return metrics;
}

export function formatNumericValue(value, component, source = {}) {
  if (!Number.isFinite(value)) return '—';
  const decimals = component.decimals ?? source.decimals;
  const number = Number.isInteger(decimals) ? value.toFixed(Math.max(0, Math.min(3, decimals))) : String(value);
  const unit = component.unit || source.unit || '';
  return `${number}${unit ? ` ${unit}` : ''}`;
}

export function companionMetricAddress(address, targetField) {
  if (!address || typeof address !== 'string' || !address.startsWith('metric:')) return null;
  const lastColon = address.lastIndexOf(':');
  if (lastColon <= 0) return null;
  return `${address.slice(0, lastColon)}:${targetField}`;
}
