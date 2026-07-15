import { computeScanTick } from "./scanCycle";
import { applyWiring } from "./plcIO";

// Simulador "headless" del Modo Desafío: ejecuta un guion de pasos contra un
// proyecto (blocks + wiringMap) usando el mismo motor puro que
// useSimulation.js usa en producción (computeScanTick + applyWiring), pero
// en un bucle síncrono en vez de setInterval — no depende de React ni de
// temporizadores reales, así que es instantáneo y fácil de testear.
export function runChallenge(blocks, wiringMap, steps, mainBlockId = "main") {
  let physicalInputs = {};
  let mem = {};
  let timers = {};
  let scanMem = {};
  let localParams = {};
  const results = [];

  const tick = () => {
    const effectiveInputs = applyWiring(physicalInputs, wiringMap);
    const combinedMem = { ...effectiveInputs, ...mem };
    const { outputs, timers: nextTimers, mem: nextScanMem, localParams: nextLocalParams } = computeScanTick(
      blocks, combinedMem, timers, scanMem, mainBlockId, localParams
    );
    mem = outputs;
    timers = nextTimers;
    scanMem = nextScanMem;
    localParams = nextLocalParams;
  };

  steps.forEach((step) => {
    if (step.type === "set") {
      physicalInputs = { ...physicalInputs, [step.addr]: step.value };
    } else if (step.type === "wait") {
      for (let i = 0; i < step.scans; i++) tick();
    } else if (step.type === "assert") {
      const actual = !!mem[step.addr];
      results.push({ label: step.label, addr: step.addr, expected: step.value, actual, pass: actual === step.value });
    }
  });

  return { pass: results.every((r) => r.pass), results };
}
