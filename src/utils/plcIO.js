import { INPUT_ADDR, OUTPUT_ADDR } from "./constants";

// Direcciones I/Q realmente referenciadas en un segmento (contactos + su
// propia salida), usado para no mostrar en "Proceso simulado" direcciones
// que no se usan en ningún sitio todavía.
function collectContactAddrs(nodes, set) {
  nodes.forEach((n) => {
    if (n.kind === "contact") set.add(n.addr);
    else n.branches.forEach((b) => collectContactAddrs(b.nodes, set));
  });
}
export function collectUsedAddresses(rungs) {
  const set = new Set();
  rungs.forEach((rung) => {
    collectContactAddrs(rung.logic, set);
    set.add(rung.outAddr);
  });
  return [...INPUT_ADDR, ...OUTPUT_ADDR].filter((a) => set.has(a));
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
    if (!byAddr[r.outAddr]) byAddr[r.outAddr] = [];
    byAddr[r.outAddr].push(idx);
  });
  return Object.entries(byAddr).filter(([, idxs]) => {
    if (idxs.length < 2) return false;
    // Solo avisamos si hay una bobina directa o un TON compartiendo la
    // dirección con algo más — esos dos tipos sobrescriben sin condiciones,
    // así que compartir dirección con ellos casi siempre es un despiste.
    return idxs.some((i) => rungs[i].outType === "coil" || rungs[i].outType === "ton");
  });
}
