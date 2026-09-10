import { INPUT_ADDR, OUTPUT_ADDR, MARK_ADDR, ANALOG_ADDR, ANALOG_MAX } from '../utils/constants';
const BOOL_ADDR = [...INPUT_ADDR, ...OUTPUT_ADDR, ...MARK_ADDR];
export function tagCatalog(symbols = {}, metrics = {}) {
  return [...BOOL_ADDR, ...ANALOG_ADDR].map(address => ({ address,
    type: ANALOG_ADDR.includes(address) ? 'NUMBER' : 'BOOL',
    label: symbols[address] ? `${symbols[address]} · ${address}` : address, writable: true, group: 'Tags PLC' })).concat(Object.values(metrics));
}
export function bindingType(componentType) {
  if (['lamp', 'alarm', 'momentary', 'toggle'].includes(componentType)) return 'BOOL';
  if (['number', 'setpoint', 'timer', 'counter', 'bar'].includes(componentType)) return 'NUMBER';
  return null;
}
export function validTagValue(address, value) {
  return BOOL_ADDR.includes(address) ? typeof value === 'boolean'
    : ANALOG_ADDR.includes(address) && typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= ANALOG_MAX;
}
// The adapter owns no second PLC memory. Reads and writes always use existing owners.
export function createTagAccess({ inputs, analogInputs, outputs, marks, wiringMap, setInput, setAnalog, writeMemory, symbols = {}, metrics = {} }) {
  return {
    catalog: tagCatalog(symbols, metrics),
    read(address) {
      if (INPUT_ADDR.includes(address)) return wiringMap?.[address] === 'NC' ? !inputs[address] : !!inputs[address];
      if (ANALOG_ADDR.includes(address)) return analogInputs[address] ?? 0;
      if (OUTPUT_ADDR.includes(address)) return !!outputs[address];
      if (MARK_ADDR.includes(address)) return !!marks[address];
      return metrics[address]?.value;
    },
    write(address, value) {
      if (!validTagValue(address, value)) return false;
      if (INPUT_ADDR.includes(address)) setInput(address, wiringMap?.[address] === 'NC' ? !value : value);
      else if (ANALOG_ADDR.includes(address)) setAnalog(address, value);
      else writeMemory(address, value);
      return true;
    },
  };
}
