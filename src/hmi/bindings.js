import { INPUT_ADDR, OUTPUT_ADDR, MARK_ADDR, ANALOG_ADDR, ANALOG_OUT_ADDR, ANALOG_MAX, ANALOG_OUT_MAX } from '../utils/constants';
const BOOL_ADDR = [...INPUT_ADDR, ...OUTPUT_ADDR, ...MARK_ADDR];
const ALL_ANALOG = [...ANALOG_ADDR, ...ANALOG_OUT_ADDR];

export function tagCatalog(symbols = {}, metrics = {}) {
  return [...BOOL_ADDR, ...ALL_ANALOG].map(address => ({
    address,
    type: ALL_ANALOG.includes(address) ? 'NUMBER' : 'BOOL',
    label: symbols[address] ? `${symbols[address]} · ${address}` : address,
    writable: true,
    group: ANALOG_OUT_ADDR.includes(address) ? 'Salidas Analógicas' : ANALOG_ADDR.includes(address) ? 'Entradas Analógicas' : 'Tags PLC'
  })).concat(Object.values(metrics));
}

export function bindingType(componentType) {
  if (['lamp', 'alarm', 'momentary', 'toggle'].includes(componentType)) return 'BOOL';
  if (['number', 'setpoint', 'timer', 'counter', 'bar'].includes(componentType)) return 'NUMBER';
  return null;
}

export function validTagValue(address, value) {
  if (BOOL_ADDR.includes(address)) return typeof value === 'boolean';
  if (ANALOG_ADDR.includes(address)) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= ANALOG_MAX;
  }
  if (ANALOG_OUT_ADDR.includes(address)) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= ANALOG_OUT_MAX;
  }
  return false;
}

// The adapter owns no second PLC memory. Reads and writes always use existing owners.
export function createTagAccess({ inputs, analogInputs, analogOutputs = {}, outputs, marks, wiringMap, setInput, setAnalog, setAnalogOutput, writeMemory, symbols = {}, metrics = {} }) {
  return {
    catalog: tagCatalog(symbols, metrics),
    read(address) {
      if (INPUT_ADDR.includes(address)) return wiringMap?.[address] === 'NC' ? !inputs[address] : !!inputs[address];
      if (ANALOG_ADDR.includes(address)) return analogInputs[address] ?? 0;
      if (ANALOG_OUT_ADDR.includes(address)) return analogOutputs[address] ?? 0;
      if (OUTPUT_ADDR.includes(address)) return !!outputs[address];
      if (MARK_ADDR.includes(address)) return !!marks[address];
      return metrics[address]?.value;
    },
    write(address, value) {
      if (!validTagValue(address, value)) return false;
      if (INPUT_ADDR.includes(address)) setInput(address, wiringMap?.[address] === 'NC' ? !value : value);
      else if (ANALOG_ADDR.includes(address)) setAnalog(address, value);
      else if (ANALOG_OUT_ADDR.includes(address) && setAnalogOutput) setAnalogOutput(address, value);
      else writeMemory(address, value);
      return true;
    },
  };
}
