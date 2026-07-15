import { OUTPUT_ADDR, SCAN_MS, MAX_CALL_DEPTH } from "./constants";
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
//
// Una única memoria física compartida (nextMem, I+Q) recorre todo el árbol
// de llamadas entre bloques sin copiarse/aislarse — así un FC que escribe
// una dirección global directamente se refleja globalmente sin caso
// especial. Solo los parámetros locales ("#paramId") de la interfaz de un FC
// viven en un objeto `localParams` efímero, uno por sitio de llamada, que se
// descarta al terminar ese scan tick (un FC no tiene memoria de instancia
// persistente — esa es justo la diferencia con un FB, fuera de alcance).
//
// La única excepción a esa falta de memoria son los timers (TON/TOF/TP) y
// los flancos P/N sobre un parámetro local: para que dos sitios de llamada
// al mismo FC mantengan cuentas de tiempo y detección de flanco
// independientes, se namespacean por la ruta de llamada completa hasta ese
// rung ("main:7>fc1:3" = rung 3 de fc1, llamado desde el rung 7 de main),
// no por su id a secas. prevLocalParams sigue exactamente el mismo patrón
// que prevTimers/prevScanMem: el llamador guarda el `localParams` devuelto y
// lo pasa como prevLocalParams en el siguiente tick.
export function computeScanTick(blocks, mem, prevTimers, prevScanMem = {}, mainBlockId = "main", prevLocalParams = {}) {
  const nextMem = { ...mem };
  const nextTimers = {};
  const nextLocalParams = {};
  // Último marco (valores IN/OUT) con el que se ejecutó cada bloque este
  // tick, indexado por blockId — cuando un FC tiene varios sitios de
  // llamada activos en el mismo ciclo, el último en ejecutarse gana (ver
  // decisión de diseño: simulador didáctico, no depurador multi-instancia).
  // Lo usa App.jsx para pintar el flujo dentro del FC que se está editando.
  const lastFrameByBlock = {};
  const blockById = new Map(blocks.map((b) => [b.id, b]));

  function runBlock(blockId, localParams, prevLocalParamsForCall, pathPrefix, depth) {
    if (depth > MAX_CALL_DEPTH) return;
    const block = blockById.get(blockId);
    if (!block) return;

    block.rungs.forEach((rung) => {
      const readMem = { ...nextMem, ...localParams };
      // prevMem para flancos P/N: memoria física previa + valores previos de
      // ESTE sitio de llamada (mismo concepto que prevScanMem, pero para los
      // #param efímeros, que de otro modo nunca detectarían una transición).
      const readPrevMem = { ...prevScanMem, ...prevLocalParamsForCall };
      const combined = evalSeries(rung.logic, readMem, readPrevMem);
      const timerKey = `${pathPrefix}:${rung.id}`;
      const write = (addr, v) => {
        if (addr.startsWith("#")) localParams[addr] = v;
        else nextMem[addr] = v;
      };

      if (rung.outType === "call") {
        if (!combined || !rung.callTarget) return; // EN=false: OUT no se tocan, quedan "congelados"
        const target = blockById.get(rung.callTarget);
        if (!target) return;
        const calleeParams = {};
        target.interface.in.forEach((p) => {
          const addr = rung.paramWiring?.[p.id];
          calleeParams[`#${p.id}`] = addr ? !!readMem[addr] : false;
        });
        target.interface.out.forEach((p) => {
          calleeParams[`#${p.id}`] = false;
        });
        const calleePrevParams = prevLocalParams[timerKey] || {};
        runBlock(rung.callTarget, calleeParams, calleePrevParams, `${pathPrefix}:${rung.id}>${rung.callTarget}`, depth + 1);
        nextLocalParams[timerKey] = calleeParams;
        lastFrameByBlock[rung.callTarget] = calleeParams;
        target.interface.out.forEach((p) => {
          const addr = rung.paramWiring?.[p.id];
          if (addr) write(addr, calleeParams[`#${p.id}`]);
        });
        return;
      }

      if (rung.outType === "coil") {
        write(rung.outAddr, combined);
      } else if (rung.outType === "set") {
        if (combined) write(rung.outAddr, true);
      } else if (rung.outType === "reset") {
        if (combined) write(rung.outAddr, false);
      } else if (rung.outType === "tof") {
        // Off-delay: la salida sigue a la entrada al activarse, pero al
        // desactivarse se queda encendida "preset" segundos más. elapsed
        // representa "tiempo desde que se cortó la corriente", así que su
        // valor de reposo (nunca se ha activado, o ya terminó de contar) es
        // rung.preset — NO 0. Si el valor por defecto fuera 0, cualquier
        // ciclo sin corriente (incluido el primero, en frío) se leería como
        // "acaba de desactivarse" y arrancaría la cuenta atrás solo — la
        // salida se activaría sin que la entrada hubiera estado nunca a 1.
        const prevElapsed = prevTimers[timerKey] ?? rung.preset;
        let elapsed;
        if (combined) {
          elapsed = 0; // energizado: listo para arrancar la cuenta en cuanto se corte
        } else if (prevElapsed >= rung.preset) {
          elapsed = rung.preset; // ya estaba en reposo (o nunca se activó): sigue así
        } else {
          elapsed = prevElapsed + SCAN_MS / 1000; // flanco de bajada o ya contando: sigue la cuenta
          if (elapsed > rung.preset) elapsed = rung.preset;
        }
        nextTimers[timerKey] = elapsed;
        write(rung.outAddr, combined || elapsed < rung.preset);
      } else if (rung.outType === "tp") {
        // Pulso: un flanco de subida en la entrada dispara "preset" segundos
        // de salida a 1, sin importar lo que haga la entrada mientras tanto,
        // y sin volver a disparar hasta que la entrada baje y vuelva a subir.
        const prevState = prevTimers[timerKey] || { elapsed: rung.preset, prevCombined: false };
        const rising = combined && !prevState.prevCombined;
        let elapsed = rising ? 0 : prevState.elapsed;
        const pulseActive = elapsed < rung.preset;
        if (pulseActive) elapsed = Math.min(elapsed + SCAN_MS / 1000, rung.preset);
        nextTimers[timerKey] = { elapsed, prevCombined: combined };
        write(rung.outAddr, pulseActive);
      } else {
        // ton
        const prevElapsed = prevTimers[timerKey] || 0;
        let elapsed = combined ? prevElapsed + SCAN_MS / 1000 : 0;
        if (elapsed > rung.preset) elapsed = rung.preset;
        nextTimers[timerKey] = elapsed;
        write(rung.outAddr, elapsed >= rung.preset);
      }
    });
  }

  runBlock(mainBlockId, {}, {}, mainBlockId, 0);

  const outputs = Object.fromEntries(OUTPUT_ADDR.map((a) => [a, !!nextMem[a]]));
  return { outputs, timers: nextTimers, mem: nextMem, localParams: nextLocalParams, lastFrameByBlock };
}
