import { OUTPUT_ADDR, MARK_ADDR, SCAN_MS, MAX_CALL_DEPTH } from "./constants";
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
      const combined =
        !rung.logic || rung.logic.length === 0
          ? true
          : evalSeries(rung.logic, readMem, readPrevMem);
      const timerKey = `${pathPrefix}:${rung.id}`;
      const write = (addr, v) => {
        if (addr.startsWith("#")) localParams[addr] = v;
        else nextMem[addr] = v;
      };

      if (rung.outType === "call") {
        const callsToRun =
          Array.isArray(rung.calls) && rung.calls.length > 0
            ? rung.calls
            : rung.callTarget
              ? [{ id: "c0", callTarget: rung.callTarget, paramWiring: rung.paramWiring }]
              : [];

        callsToRun.forEach((callItem, callIdx) => {
          if (!callItem.callTarget) return;
          const target = blockById.get(callItem.callTarget);
          if (!target) return;

          const callKey =
            callsToRun.length > 1
              ? `${pathPrefix}:${rung.id}:call${callItem.id || callIdx}`
              : timerKey;
          const calleePrevParams = prevLocalParams[callKey] || {};

          // IN se muestrea SIEMPRE, haya o no EN
          const calleeIn = {};
          target.interface.in.forEach((p) => {
            const addr = callItem.paramWiring?.[p.id];
            calleeIn[`#${p.id}`] = addr ? !!readMem[addr] : false;
          });

          if (!combined) {
            nextLocalParams[callKey] = { ...calleePrevParams, ...calleeIn };
            return;
          }
          const calleeParams = { ...calleeIn };
          target.interface.out.forEach((p) => {
            calleeParams[`#${p.id}`] = false;
          });
          (target.interface.static || []).forEach((p) => {
            calleeParams[`#${p.id}`] = calleePrevParams[`#${p.id}`] ?? false;
          });

          const subPath =
            callsToRun.length > 1
              ? `${pathPrefix}:${rung.id}>${callItem.callTarget}:${callItem.id || callIdx}`
              : `${pathPrefix}:${rung.id}>${callItem.callTarget}`;

          runBlock(callItem.callTarget, calleeParams, calleePrevParams, subPath, depth + 1);
          nextLocalParams[callKey] = calleeParams;
          lastFrameByBlock[callItem.callTarget] = calleeParams;
          target.interface.out.forEach((p) => {
            const addr = callItem.paramWiring?.[p.id];
            if (addr) write(addr, calleeParams[`#${p.id}`]);
          });
        });
        return;
      }

      if (rung.outType === "coil") {
        write(rung.outAddr, combined);
      } else if (rung.outType === "set") {
        if (combined) write(rung.outAddr, true);
      } else if (rung.outType === "reset") {
        if (combined) write(rung.outAddr, false);
      } else if (rung.outType === "sr" || rung.outType === "rs") {
        // Bloque SR/RS combinado (bistable de TIA Portal): `combined` (rail
        // principal) hace de entrada S, `rung.logicR` es la red de la
        // entrada R1 — se evalúa igual que cualquier red de contactos, con
        // su propio prevMem para que los flancos P/N de R1 también
        // funcionen. No hace falta estado propio en nextTimers: el bit
        // persiste solo porque nextMem parte de una copia de mem y aquí
        // solo se escribe cuando S o R1 están realmente a 1 — igual que
        // una bobina, pero condicional en dos señales con prioridad.
        // "sr" = Reset domina (se evalúa Set y LUEGO Reset, que gana si
        // ambas entradas están a 1 a la vez — el orden real del bloque SR
        // de TIA). "rs" = Set domina (mismo bloque, orden invertido).
        const resetVal = evalSeries(rung.logicR || [], readMem, readPrevMem);
        if (rung.outType === "sr") {
          if (combined) write(rung.outAddr, true);
          if (resetVal) write(rung.outAddr, false);
        } else {
          if (resetVal) write(rung.outAddr, false);
          if (combined) write(rung.outAddr, true);
        }
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
      } else if (rung.outType === "ctu" || rung.outType === "ctd" || rung.outType === "ctud") {
        // Contadores: CTU (cuenta arriba), CTD (cuenta abajo) y CTUD (bidireccional).
        // El rail principal (`combined`) es el pulso de cuenta CU (o CD en CTD) — se
        // detecta el flanco de subida igual que en TP para no seguir contando mientras
        // la señal se mantenga en 1.
        // En CTUD:
        // - CU: rail principal (`combined`), flanco de subida incrementa CV.
        // - CD: pin cableado (`rung.cdAddr`), flanco de subida decrementa CV.
        // - R: pin de reset (`rung.resetAddr`), pone CV a 0 (máxima prioridad).
        // - LD: pin de carga (`rung.loadAddr`), carga PV en CV (prioridad sobre pulsos).
        // - QU: salida CV >= PV, escrita en rung.outAddr.
        // - QD: salida CV <= 0, escrita en rung.qdAddr (si está cableada).
        const prevState = prevTimers[timerKey] || { count: 0, prevPulse: false, prevCd: false };
        const resetVal = rung.resetAddr ? !!readMem[rung.resetAddr] : false;
        let count = prevState.count;

        if (rung.outType === "ctu") {
          const rising = combined && !prevState.prevPulse;
          if (resetVal) count = 0;
          else if (rising) count = Math.min(count + 1, rung.preset);
          const reached = count >= rung.preset;
          nextTimers[timerKey] = {
            count,
            cu: combined,
            cd: false,
            r: resetVal,
            ld: false,
            qu: reached,
            qd: count <= 0,
            prevPulse: combined,
          };
          write(rung.outAddr, reached);
        } else if (rung.outType === "ctd") {
          const rising = combined && !prevState.prevPulse;
          if (resetVal) count = rung.preset;
          else if (rising) count = Math.max(count - 1, 0);
          const reached = count <= 0;
          nextTimers[timerKey] = {
            count,
            cu: false,
            cd: combined,
            r: false,
            ld: resetVal,
            qu: count >= rung.preset,
            qd: reached,
            prevPulse: combined,
          };
          write(rung.outAddr, reached);
        } else {
          // ctud
          const cdVal = rung.cdAddr ? !!readMem[rung.cdAddr] : false;
          const loadVal = rung.loadAddr ? !!readMem[rung.loadAddr] : false;
          const risingCu = combined && !prevState.prevPulse;
          const risingCd = cdVal && !prevState.prevCd;

          if (resetVal) {
            count = 0;
          } else if (loadVal) {
            count = rung.preset;
          } else {
            if (risingCu && !risingCd) {
              count = Math.min(count + 1, 999);
            } else if (risingCd && !risingCu) {
              count = Math.max(count - 1, 0);
            }
          }

          const qu = count >= rung.preset;
          const qd = count <= 0;

          nextTimers[timerKey] = {
            count,
            cu: combined,
            cd: cdVal,
            r: resetVal,
            ld: loadVal,
            qu,
            qd,
            prevPulse: combined,
            prevCd: cdVal,
          };

          write(rung.outAddr, qu);
          if (rung.qdAddr) {
            write(rung.qdAddr, qd);
          }
        }
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
  // Marcas (M): igual que las salidas Q, necesitan persistir de un scan al
  // siguiente — se devuelven aparte (no mezcladas en `outputs`) para no
  // arriesgar a los consumidores que asumen que `outputs` tiene exactamente
  // las 10 claves de OUTPUT_ADDR (HMI, ProcessPanel, detección de conflictos).
  const marks = Object.fromEntries(MARK_ADDR.map((a) => [a, !!nextMem[a]]));
  return { outputs, marks, timers: nextTimers, mem: nextMem, localParams: nextLocalParams, lastFrameByBlock };
}
