import { INPUT_ADDR, OUTPUT_ADDR, MARK_ADDR, ANALOG_ADDR } from "./constants";

// Direcciones I/Q/IW realmente referenciadas en un segmento (contactos,
// comparadores + su propia salida), usado para no mostrar en "Proceso
// simulado" direcciones que no se usan en ningún sitio todavía.
function collectContactAddrs(nodes, set) {
  nodes.forEach((n) => {
    if (n.kind === "contact" || n.kind === "compare") set.add(n.addr);
    else n.branches.forEach((b) => collectContactAddrs(b.nodes, set));
  });
}
export function collectUsedAddresses(rungs) {
  const set = new Set();
  rungs.forEach((rung) => {
    collectContactAddrs(rung.logic, set);
    // Rama R1 de un bloque SR/RS: sus contactos son direcciones reales
    // (se leen cada scan) igual que los de rung.logic, aunque vivan en un
    // array aparte.
    collectContactAddrs(rung.logicR || [], set);
    // Un rung "call" conserva un outAddr heredado/ignorado (ver TiaSegment)
    // — no es una dirección realmente escrita, no debe marcarse "en uso".
    if (rung.outType !== "call") set.add(rung.outAddr);
    // El pin de Reset/Carga de un CTU/CTD también es una dirección real
    // (se lee cada scan), aunque no forme parte de rung.logic.
    if (rung.resetAddr) set.add(rung.resetAddr);
  });
  return [...INPUT_ADDR, ...OUTPUT_ADDR, ...MARK_ADDR, ...ANALOG_ADDR].filter((a) => set.has(a));
}

// Convierte el estado "físico" de cada entrada (¿está el pulsador pulsado?,
// ¿ha detectado el sensor?) en el bit que realmente llega al terminal DI del
// PLC, según cómo esté cableado ese dispositivo en la realidad. Un sensor
// NC (p.ej. un termostato que abre al superar una temperatura) deja pasar
// señal en reposo y la corta al activarse — justo lo contrario de un NA.
// Por defecto (sin asignar) se asume NA, que es el cableado más habitual.
export function applyWiring(inputs, wiringMap) {
  const out = {};
  INPUT_ADDR.forEach((a) => {
    const physicallyActive = !!inputs[a];
    const isNC = wiringMap?.[a] === "NC";
    out[a] = isNC ? !physicallyActive : physicallyActive;
  });
  return out;
}

// Segmentos distintos que escriben en la misma dirección de salida — casi
// siempre un despiste, salvo el patrón normal de un SET y un RESET
// compartiendo dirección (eso es el enclavamiento típico, no un error).
export function collectOutputConflicts(rungs) {
  const byAddr = {};
  rungs.forEach((r, idx) => {
    // Un rung "call" (instrucción "Llamar a bloque") conserva un outAddr
    // heredado/ignorado (ver TiaSegment) — no es una dirección realmente
    // escrita, así que no debe contar para el aviso de "salida duplicada".
    if (r.outType === "call") return;
    if (!byAddr[r.outAddr]) byAddr[r.outAddr] = [];
    byAddr[r.outAddr].push(idx);
  });
  return Object.entries(byAddr).filter(([, idxs]) => {
    if (idxs.length < 2) return false;
    // Solo avisamos si hay una bobina directa, un temporizador (TON/TOF/TP)
    // o un bloque SR/RS compartiendo la dirección con algo más — estos
    // tipos ya resuelven su propio enclavamiento (o sobrescriben sin
    // condiciones), así que compartir dirección con ellos casi siempre es
    // un despiste.
    return idxs.some((i) => ["coil", "ton", "tof", "tp", "sr", "rs"].includes(rungs[i].outType));
  });
}

// Variantes que agregan sobre todos los bloques del proyecto (Main + FCs),
// reutilizando las funciones de un solo bloque internamente.
export function collectUsedAddressesAcrossBlocks(blocks) {
  return collectUsedAddresses(blocks.flatMap((b) => b.rungs));
}
export function collectOutputConflictsAcrossBlocks(blocks) {
  return collectOutputConflicts(blocks.flatMap((b) => b.rungs));
}
