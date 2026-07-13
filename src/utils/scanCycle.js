import { OUTPUT_ADDR, SCAN_MS } from "./constants";
import { evalSeries } from "./evalNode";

// Ejecuta un ciclo de scan completo: evalúa cada segmento en orden sobre la
// memoria combinada (entradas + salidas previas) y escribe su salida en esa
// misma memoria antes de pasar al siguiente segmento — así una bobina puede
// alimentar la lógica de un segmento posterior dentro del mismo ciclo, igual
// que en un PLC real. Pura (sin refs ni estado de React) para poder
// testearla de forma aislada; useSimulation la envuelve con el estado del
// hook.
//
// prevScanMem es la memoria final (nextMem) tal cual quedó al terminar el
// ciclo ANTERIOR — no `mem` de este ciclo, que ya trae los valores actuales
// de las entradas y sería idéntico a nextMem para cualquier dirección que
// ningún segmento haya escrito todavía. Sin esa distinción, un contacto de
// flanco P/N nunca vería una transición real entre un ciclo y el siguiente.
// El llamador debe guardar el `mem` devuelto y pasarlo como prevScanMem en
// la siguiente llamada (así lo hacen useSimulation.js y challengeRunner.js).
export function computeScanTick(rungs, mem, prevTimers, prevScanMem = {}) {
  const nextMem = { ...mem };
  const nextTimers = {};

  rungs.forEach((rung) => {
    const combined = evalSeries(rung.logic, nextMem, prevScanMem);
    if (rung.outType === "coil") {
      nextMem[rung.outAddr] = combined;
    } else if (rung.outType === "set") {
      if (combined) nextMem[rung.outAddr] = true;
    } else if (rung.outType === "reset") {
      if (combined) nextMem[rung.outAddr] = false;
    } else if (rung.outType === "tof") {
      // Off-delay: la salida sigue a la entrada al activarse, pero al
      // desactivarse se queda encendida "preset" segundos más. elapsed
      // representa "tiempo desde que se cortó la corriente", así que su
      // valor de reposo (nunca se ha activado, o ya terminó de contar) es
      // rung.preset — NO 0. Si el valor por defecto fuera 0, cualquier
      // ciclo sin corriente (incluido el primero, en frío) se leería como
      // "acaba de desactivarse" y arrancaría la cuenta atrás solo — la
      // salida se activaría sin que la entrada hubiera estado nunca a 1.
      const prevElapsed = prevTimers[rung.id] ?? rung.preset;
      let elapsed;
      if (combined) {
        elapsed = 0; // energizado: listo para arrancar la cuenta en cuanto se corte
      } else if (prevElapsed >= rung.preset) {
        elapsed = rung.preset; // ya estaba en reposo (o nunca se activó): sigue así
      } else {
        elapsed = prevElapsed + SCAN_MS / 1000; // flanco de bajada o ya contando: sigue la cuenta
        if (elapsed > rung.preset) elapsed = rung.preset;
      }
      nextTimers[rung.id] = elapsed;
      nextMem[rung.outAddr] = combined || elapsed < rung.preset;
    } else if (rung.outType === "tp") {
      // Pulso: un flanco de subida en la entrada dispara "preset" segundos
      // de salida a 1, sin importar lo que haga la entrada mientras tanto,
      // y sin volver a disparar hasta que la entrada baje y vuelva a subir.
      const prevState = prevTimers[rung.id] || { elapsed: rung.preset, prevCombined: false };
      const rising = combined && !prevState.prevCombined;
      let elapsed = rising ? 0 : prevState.elapsed;
      const pulseActive = elapsed < rung.preset;
      if (pulseActive) elapsed = Math.min(elapsed + SCAN_MS / 1000, rung.preset);
      nextTimers[rung.id] = { elapsed, prevCombined: combined };
      nextMem[rung.outAddr] = pulseActive;
    } else {
      // ton
      const prevElapsed = prevTimers[rung.id] || 0;
      let elapsed = combined ? prevElapsed + SCAN_MS / 1000 : 0;
      if (elapsed > rung.preset) elapsed = rung.preset;
      nextTimers[rung.id] = elapsed;
      nextMem[rung.outAddr] = elapsed >= rung.preset;
    }
  });

  const outputs = Object.fromEntries(OUTPUT_ADDR.map((a) => [a, !!nextMem[a]]));
  return { outputs, timers: nextTimers, mem: nextMem };
}
