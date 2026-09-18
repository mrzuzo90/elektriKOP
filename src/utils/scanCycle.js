import { OUTPUT_ADDR, MARK_ADDR, ANALOG_OUT_ADDR, SCAN_MS, MAX_CALL_DEPTH } from "./constants";
import { evalSeries } from "./evalNode";
import { counterOperands, timerOperands } from "./counterOperands";

// Ejecuta un ciclo de scan completo: evalúa cada segmento en orden sobre la
// memoria combinada (entradas + salidas previas) y escribe su salida en esa
// misma memoria antes de pasar al siguiente segmento — así una bobina puede
// alimentar la lógica de un segmento posterior dentro del mismo ciclo, igual
// que en un PLC real. Pura (sin refs ni estado de React) para poder
// testearla de forma aislada; useSimulation la envuelve con el estado del
// hook.
export function computeScanTick(
  blocks,
  mem,
  prevTimers,
  prevScanMem = {},
  mainBlockId = "main",
  prevLocalParams = {},
  scanContext = {}
) {
  const nextMem = { ...mem };

  // Actualizar Marcas de Sistema y de Reloj (Siemens S7-1200 MB1)
  const scanCount = scanContext.scanCount ?? 0;
  const isFirstScan = scanContext.isFirstScan ?? (scanCount === 0 && Object.keys(prevScanMem).length === 0);
  const elapsedTimeMs = scanContext.elapsedTimeMs ?? (scanCount * SCAN_MS);

  nextMem["M1.0"] = !!isFirstScan;
  nextMem["M1.2"] = true;
  nextMem["M1.3"] = false;
  nextMem["M1.5"] = (elapsedTimeMs % 2000) < 1000;
  nextMem["M1.6"] = (elapsedTimeMs % 500) < 250;
  nextMem["M1.7"] = (elapsedTimeMs % 1000) < 500;

  const nextTimers = {};
  const nextLocalParams = {};
  const lastFrameByBlock = {};
  const blockById = new Map(blocks.map((b) => [b.id, b]));

  function runBlock(blockId, localParams, prevLocalParamsForCall, pathPrefix, depth) {
    if (depth > MAX_CALL_DEPTH) return;
    const block = blockById.get(blockId);
    if (!block) return;

    // CV pertenece a la instancia de llamada, nunca a la dirección de Q.
    const counterMem = Object.fromEntries(counterOperands(block.rungs).map(({ addr, id }) =>
      [addr, prevTimers[`${pathPrefix}:${id}`]?.count ?? 0]
    ));
    const timerMem = Object.fromEntries(timerOperands(block.rungs).map(({ addr, id }) => {
      const r = block.rungs.find((rg) => rg.id === id);
      if (addr.startsWith("PT:")) return [addr, r?.preset ?? 0];
      const raw = prevTimers[`${pathPrefix}:${id}`];
      let prevEl = 0;
      if (r?.outType === "ton" || r?.outType === "tonr") {
        prevEl = typeof raw === "number" ? raw : (raw?.elapsed ?? 0);
      } else if (r?.outType === "tof") {
        prevEl = typeof raw === "number" ? raw : (raw?.elapsed ?? (r?.preset ?? 0));
      } else if (r?.outType === "tp") {
        prevEl = typeof raw?.elapsed === "number" ? raw.elapsed : (r?.preset ?? 0);
      }
      return [addr, prevEl];
    }));
    block.rungs.forEach((rung) => {
      const readMem = { ...nextMem, ...localParams, ...counterMem, ...timerMem };
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
        elapsed = Math.round(elapsed * 1000) / 1000;
        nextTimers[timerKey] = elapsed;
        timerMem[`ET:${rung.id}`] = elapsed;
        timerMem[`PT:${rung.id}`] = rung.preset ?? 0;
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
        elapsed = Math.round(elapsed * 1000) / 1000;
        nextTimers[timerKey] = { elapsed, prevCombined: combined };
        timerMem[`ET:${rung.id}`] = elapsed;
        timerMem[`PT:${rung.id}`] = rung.preset ?? 0;
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
        const resetVal =
          rung.logicReset !== undefined
            ? evalSeries(rung.logicReset || [], readMem, readPrevMem)
            : (rung.resetAddr ? !!readMem[rung.resetAddr] : false);
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
        counterMem[`CV:${rung.id}`] = count;
      } else if (rung.outType === "tonr") {
        // Retentive On-delay (TONR): acumula tiempo cuando IN (combined) está a 1,
        // retiene el tiempo cuando IN pasa a 0, y solo se resetea con logicReset / resetAddr.
        const prevElapsed = prevTimers[timerKey] ?? 0;
        const resetVal =
          rung.logicReset !== undefined
            ? evalSeries(rung.logicReset || [], readMem, readPrevMem)
            : (rung.resetAddr ? !!readMem[rung.resetAddr] : false);

        let elapsed = prevElapsed;
        if (resetVal) {
          elapsed = 0;
        } else if (combined) {
          elapsed = Math.min(prevElapsed + SCAN_MS / 1000, rung.preset ?? 5);
        }
        elapsed = Math.round(elapsed * 1000) / 1000;
        nextTimers[timerKey] = elapsed;
        timerMem[`ET:${rung.id}`] = elapsed;
        timerMem[`PT:${rung.id}`] = rung.preset ?? 5;
        write(rung.outAddr, elapsed >= (rung.preset ?? 5));
      } else if (rung.outType === "move") {
        // Bloque MOVE de TIA Portal: si EN (combined) es true, transfiere IN a OUT
        if (combined) {
          let inVal = 0;
          if (rung.inAddr && rung.inAddr !== "const") {
            inVal = Number(readMem[rung.inAddr]) || 0;
          } else {
            inVal = Number(rung.inVal ?? rung.preset ?? 0);
          }
          write(rung.outAddr, inVal);
        }
      } else if (rung.outType === "add" || rung.outType === "sub") {
        // Bloques matemáticos ADD / SUB
        if (combined) {
          const v1 = (rung.in1Addr && rung.in1Addr !== "const")
            ? (Number(readMem[rung.in1Addr]) || 0)
            : Number(rung.in1Val ?? 0);
          const v2 = (rung.in2Addr && rung.in2Addr !== "const")
            ? (Number(readMem[rung.in2Addr]) || 0)
            : Number(rung.in2Val ?? 0);
          const res = rung.outType === "add" ? (v1 + v2) : (v1 - v2);
          write(rung.outAddr, res);
        }
      } else {
        // ton
        const prevElapsed = prevTimers[timerKey] || 0;
        let elapsed = combined ? prevElapsed + SCAN_MS / 1000 : 0;
        if (elapsed > rung.preset) elapsed = rung.preset;
        elapsed = Math.round(elapsed * 1000) / 1000;
        nextTimers[timerKey] = elapsed;
        timerMem[`ET:${rung.id}`] = elapsed;
        timerMem[`PT:${rung.id}`] = rung.preset ?? 0;
        write(rung.outAddr, elapsed >= rung.preset);
      }
    });
    lastFrameByBlock[blockId] = { ...localParams, ...counterMem, ...timerMem };
  }

  // Si es el primer ciclo de scan (isFirstScan) y existe un bloque Startup [OB100],
  // se ejecuta una única vez antes de OB1 (Main)
  const startupBlock = blocks.find((b) => b.kind === "startup" || b.id === "startup" || b.name === "Startup");
  if (isFirstScan && startupBlock) {
    runBlock(startupBlock.id, {}, {}, startupBlock.id, 0);
  }

  runBlock(mainBlockId, {}, {}, mainBlockId, 0);

  const outputs = Object.fromEntries(OUTPUT_ADDR.map((a) => [a, !!nextMem[a]]));
  const marks = Object.fromEntries(MARK_ADDR.map((a) => [a, !!nextMem[a]]));
  const analogOutputs = Object.fromEntries(ANALOG_OUT_ADDR.map((a) => [a, Number(nextMem[a]) || 0]));
  return { outputs, marks, analogOutputs, timers: nextTimers, mem: nextMem, localParams: nextLocalParams, lastFrameByBlock };
}
