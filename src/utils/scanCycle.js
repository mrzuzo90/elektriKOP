import { OUTPUT_ADDR, SCAN_MS } from "./constants";
import { evalSeries } from "./evalNode";

// Ejecuta un ciclo de scan completo: evalúa cada segmento en orden sobre la
// memoria combinada (entradas + salidas previas) y escribe su salida en esa
// misma memoria antes de pasar al siguiente segmento — así una bobina puede
// alimentar la lógica de un segmento posterior dentro del mismo ciclo, igual
// que en un PLC real. Pura (sin refs ni estado de React) para poder
// testearla de forma aislada; useSimulation la envuelve con el estado del
// hook.
export function computeScanTick(rungs, mem, prevTimers) {
  const nextMem = { ...mem };
  const nextTimers = {};

  rungs.forEach((rung) => {
    const combined = evalSeries(rung.logic, nextMem);
    if (rung.outType === "coil") {
      nextMem[rung.outAddr] = combined;
    } else if (rung.outType === "set") {
      if (combined) nextMem[rung.outAddr] = true;
    } else if (rung.outType === "reset") {
      if (combined) nextMem[rung.outAddr] = false;
    } else {
      const prevElapsed = prevTimers[rung.id] || 0;
      let elapsed = combined ? prevElapsed + SCAN_MS / 1000 : 0;
      if (elapsed > rung.preset) elapsed = rung.preset;
      nextTimers[rung.id] = elapsed;
      nextMem[rung.outAddr] = elapsed >= rung.preset;
    }
  });

  const outputs = Object.fromEntries(OUTPUT_ADDR.map((a) => [a, !!nextMem[a]]));
  return { outputs, timers: nextTimers };
}
