import { computeScanTick } from "./scanCycle";
import { applyWiring } from "./plcIO";

// Simulador "headless" del Modo Desafío: ejecuta un guion de pasos contra un
// proyecto (blocks + wiringMap) usando el mismo motor puro que
// useSimulation.js usa en producción (computeScanTick + applyWiring), pero
// en un bucle síncrono en vez de setInterval — no depende de React ni de
// temporizadores reales, así que es instantáneo y fácil de testear.
export function runChallenge(blocks, wiringMap, steps, mainBlockId = "main") {
  let physicalInputs = {};
  // Entradas analógicas (IW): aparte de physicalInputs porque applyWiring
  // solo sabe convertir bits I/Q según NA/NC — un valor numérico de sensor
  // no tiene cableado NA/NC que aplicar, pasa tal cual a la memoria del scan.
  let analogInputs = {};
  let mem = {};
  let timers = {};
  let scanMem = {};
  let localParams = {};
  const results = [];

  const tick = () => {
    const effectiveInputs = applyWiring(physicalInputs, wiringMap);
    const combinedMem = { ...effectiveInputs, ...analogInputs, ...mem };
    const { outputs, marks, timers: nextTimers, mem: nextScanMem, localParams: nextLocalParams } = computeScanTick(
      blocks, combinedMem, timers, scanMem, mainBlockId, localParams
    );
    mem = { ...outputs, ...marks };
    timers = nextTimers;
    scanMem = nextScanMem;
    localParams = nextLocalParams;
  };

  steps.forEach((step) => {
    if (step.type === "set") {
      if (step.addr.startsWith("IW")) analogInputs = { ...analogInputs, [step.addr]: step.value };
      else physicalInputs = { ...physicalInputs, [step.addr]: step.value };
    } else if (step.type === "wait") {
      for (let i = 0; i < step.scans; i++) tick();
    } else if (step.type === "assert") {
      // El valor esperado decide cómo leer la memoria: un número compara
      // contra el valor numérico crudo (útil para depurar un ejercicio con
      // CMP), un booleano contra el bit de siempre.
      const actual = typeof step.value === "number" ? Number(mem[step.addr]) || 0 : !!mem[step.addr];
      results.push({ label: step.label, addr: step.addr, expected: step.value, actual, pass: actual === step.value });
    }
  });

  return { pass: results.every((r) => r.pass), results };
}
