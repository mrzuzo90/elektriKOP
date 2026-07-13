import { describe, expect, it } from "vitest";
import { computeScanTick } from "./scanCycle";
import { OUTPUT_ADDR, SCAN_MS } from "./constants";

function contactRung(id, addr, outAddr, outType = "coil", extra = {}) {
  return {
    id,
    title: id,
    comment: "",
    logic: [{ kind: "contact", id: `${id}-c`, addr, neg: false }],
    outAddr,
    outType,
    preset: 2,
    ...extra,
  };
}

function allOutputsFalseExcept(overrides) {
  const base = Object.fromEntries(OUTPUT_ADDR.map((a) => [a, false]));
  return { ...base, ...overrides };
}

describe("computeScanTick — bobina directa", () => {
  it("la salida sigue directamente a la condición de entrada", () => {
    const rungs = [contactRung("r1", "I0.0", "Q0.0", "coil")];
    const on = computeScanTick(rungs, { "I0.0": true }, {});
    expect(on.outputs).toEqual(allOutputsFalseExcept({ "Q0.0": true }));

    const off = computeScanTick(rungs, { "I0.0": false }, {});
    expect(off.outputs).toEqual(allOutputsFalseExcept({ "Q0.0": false }));
  });

  it("una bobina posterior puede leer la salida que escribió un segmento anterior en el mismo ciclo", () => {
    const rungs = [
      contactRung("r1", "I0.0", "Q0.0", "coil"),
      contactRung("r2", "Q0.0", "Q0.1", "coil"),
    ];
    const { outputs } = computeScanTick(rungs, { "I0.0": true }, {});
    expect(outputs["Q0.0"]).toBe(true);
    expect(outputs["Q0.1"]).toBe(true);
  });
});

describe("computeScanTick — SET / RESET", () => {
  it("SET enclava la salida a true y no la suelta cuando la condición deja de cumplirse", () => {
    const rungs = [contactRung("r1", "I0.0", "Q0.0", "set")];
    const tick1 = computeScanTick(rungs, { "I0.0": true, "Q0.0": false }, {});
    expect(tick1.outputs["Q0.0"]).toBe(true);

    // condición ya no se cumple, pero SET no tiene "else": la salida se mantiene
    const tick2 = computeScanTick(rungs, { "I0.0": false, "Q0.0": true }, {});
    expect(tick2.outputs["Q0.0"]).toBe(true);
  });

  it("RESET pone la salida a false solo cuando su condición se cumple", () => {
    const rungs = [contactRung("r1", "I0.1", "Q0.0", "reset")];
    const stillOn = computeScanTick(rungs, { "I0.1": false, "Q0.0": true }, {});
    expect(stillOn.outputs["Q0.0"]).toBe(true);

    const resetNow = computeScanTick(rungs, { "I0.1": true, "Q0.0": true }, {});
    expect(resetNow.outputs["Q0.0"]).toBe(false);
  });
});

describe("computeScanTick — temporizador TON", () => {
  it("acumula tiempo mientras la condición se cumple y activa la salida al llegar al preset", () => {
    const rungs = [contactRung("r1", "I0.0", "Q0.0", "ton", { preset: 0.2 })];
    let timers = {};
    let outputs;

    // SCAN_MS/1000 segundos por ciclo; con preset=0.2s hacen falta 0.2/(SCAN_MS/1000) ciclos
    const ticksNeeded = Math.ceil(0.2 / (SCAN_MS / 1000));
    for (let i = 0; i < ticksNeeded - 1; i++) {
      ({ outputs, timers } = computeScanTick(rungs, { "I0.0": true }, timers));
      expect(outputs["Q0.0"]).toBe(false);
    }
    ({ outputs, timers } = computeScanTick(rungs, { "I0.0": true }, timers));
    expect(outputs["Q0.0"]).toBe(true);
    expect(timers["r1"]).toBeCloseTo(0.2, 5);
  });

  it("se reinicia a 0 en cuanto la condición deja de cumplirse", () => {
    const rungs = [contactRung("r1", "I0.0", "Q0.0", "ton", { preset: 0.2 })];
    const running = computeScanTick(rungs, { "I0.0": true }, { r1: 0.15 });
    expect(running.timers["r1"]).toBeGreaterThan(0.15);

    const cut = computeScanTick(rungs, { "I0.0": false }, running.timers);
    expect(cut.timers["r1"]).toBe(0);
    expect(cut.outputs["Q0.0"]).toBe(false);
  });

  it("no supera el preset aunque la condición se mantenga más ciclos de los necesarios", () => {
    const rungs = [contactRung("r1", "I0.0", "Q0.0", "ton", { preset: 0.1 })];
    const { timers } = computeScanTick(rungs, { "I0.0": true }, { r1: 0.1 });
    expect(timers["r1"]).toBe(0.1);
  });
});

describe("computeScanTick — temporizador TOF (desconexión)", () => {
  it("la salida se activa al instante con la entrada, sin esperar al preset", () => {
    const rungs = [contactRung("r1", "I0.0", "Q0.0", "tof", { preset: 0.2 })];
    const { outputs, timers } = computeScanTick(rungs, { "I0.0": true }, {});
    expect(outputs["Q0.0"]).toBe(true);
    expect(timers["r1"]).toBe(0);
  });

  it("al soltar la entrada, la salida se mantiene hasta llegar al preset y luego se apaga", () => {
    const rungs = [contactRung("r1", "I0.0", "Q0.0", "tof", { preset: 0.2 })];
    let timers = {};
    let outputs;
    ({ outputs, timers } = computeScanTick(rungs, { "I0.0": true }, timers));
    expect(outputs["Q0.0"]).toBe(true);

    const ticksNeeded = Math.ceil(0.2 / (SCAN_MS / 1000));
    for (let i = 0; i < ticksNeeded - 1; i++) {
      ({ outputs, timers } = computeScanTick(rungs, { "I0.0": false }, timers));
      expect(outputs["Q0.0"]).toBe(true);
    }
    ({ outputs, timers } = computeScanTick(rungs, { "I0.0": false }, timers));
    expect(outputs["Q0.0"]).toBe(false);
  });

  it("si la entrada vuelve a activarse antes del preset, la salida no llega a apagarse", () => {
    const rungs = [contactRung("r1", "I0.0", "Q0.0", "tof", { preset: 0.2 })];
    let timers = { r1: 0.15 };
    let outputs;
    ({ outputs, timers } = computeScanTick(rungs, { "I0.0": true }, timers));
    expect(outputs["Q0.0"]).toBe(true);
    expect(timers["r1"]).toBe(0);
  });
});

describe("computeScanTick — temporizador TP (pulso)", () => {
  // preset=0.2s con SCAN_MS=100ms: el pulso dura exactamente 2 ciclos.
  it("un flanco de subida dispara un pulso de 'preset' segundos aunque la entrada baje antes", () => {
    const rungs = [contactRung("r1", "I0.0", "Q0.0", "tp", { preset: 0.2 })];
    let timers = {};
    let outputs;

    ({ outputs, timers } = computeScanTick(rungs, { "I0.0": true }, timers));
    expect(outputs["Q0.0"]).toBe(true); // ciclo del flanco: pulso arranca

    // la entrada baja enseguida, pero el pulso ya disparado sigue su curso
    ({ outputs, timers } = computeScanTick(rungs, { "I0.0": false }, timers));
    expect(outputs["Q0.0"]).toBe(true);

    ({ outputs, timers } = computeScanTick(rungs, { "I0.0": false }, timers));
    expect(outputs["Q0.0"]).toBe(false); // preset cumplido, pulso termina
  });

  // preset=0.1s: el pulso dura un único ciclo.
  it("no vuelve a disparar mientras la entrada siga activa tras completar el pulso", () => {
    const rungs = [contactRung("r1", "I0.0", "Q0.0", "tp", { preset: 0.1 })];
    let timers = {};
    let outputs;

    ({ outputs, timers } = computeScanTick(rungs, { "I0.0": true }, timers));
    expect(outputs["Q0.0"]).toBe(true); // ciclo del flanco

    ({ outputs, timers } = computeScanTick(rungs, { "I0.0": true }, timers));
    expect(outputs["Q0.0"]).toBe(false); // pulso ya terminado

    ({ outputs, timers } = computeScanTick(rungs, { "I0.0": true }, timers));
    expect(outputs["Q0.0"]).toBe(false); // sigue sin disparar, no hay flanco nuevo
  });

  it("un segundo flanco (tras soltar y volver a pulsar) dispara un nuevo pulso", () => {
    const rungs = [contactRung("r1", "I0.0", "Q0.0", "tp", { preset: 0.1 })];
    let timers = {};
    let outputs;

    ({ outputs, timers } = computeScanTick(rungs, { "I0.0": true }, timers)); // pulso 1 arranca
    ({ outputs, timers } = computeScanTick(rungs, { "I0.0": true }, timers)); // pulso 1 termina
    ({ outputs, timers } = computeScanTick(rungs, { "I0.0": false }, timers));
    expect(outputs["Q0.0"]).toBe(false);

    ({ outputs, timers } = computeScanTick(rungs, { "I0.0": true }, timers)); // nuevo flanco
    expect(outputs["Q0.0"]).toBe(true);
  });
});

describe("computeScanTick — contactos de flanco P/N", () => {
  function edgeContactRung(id, addr, outAddr, edge) {
    return {
      id,
      title: id,
      comment: "",
      logic: [{ kind: "contact", id: `${id}-c`, addr, neg: false, edge }],
      outAddr,
      outType: "coil",
      preset: 2,
    };
  }

  it("un contacto de flanco P solo deja pasar corriente en el ciclo del 0→1", () => {
    const rungs = [edgeContactRung("r1", "I0.0", "Q0.0", "P")];
    let timers = {};
    let mem = {};
    let outputs;
    ({ outputs, timers, mem } = computeScanTick(rungs, { "I0.0": false }, timers, mem));
    expect(outputs["Q0.0"]).toBe(false);

    ({ outputs, timers, mem } = computeScanTick(rungs, { "I0.0": true }, timers, mem));
    expect(outputs["Q0.0"]).toBe(true);

    // el ciclo siguiente, aunque la entrada se mantenga a 1, ya no es flanco
    ({ outputs, timers, mem } = computeScanTick(rungs, { "I0.0": true }, timers, mem));
    expect(outputs["Q0.0"]).toBe(false);
  });

  it("un contacto de flanco N solo deja pasar corriente en el ciclo del 1→0", () => {
    const rungs = [edgeContactRung("r1", "I0.0", "Q0.0", "N")];
    let timers = {};
    let mem = {};
    let outputs;
    ({ outputs, timers, mem } = computeScanTick(rungs, { "I0.0": true }, timers, mem));
    expect(outputs["Q0.0"]).toBe(false);

    ({ outputs, timers, mem } = computeScanTick(rungs, { "I0.0": false }, timers, mem));
    expect(outputs["Q0.0"]).toBe(true);

    ({ outputs, timers, mem } = computeScanTick(rungs, { "I0.0": false }, timers, mem));
    expect(outputs["Q0.0"]).toBe(false);
  });

  it("sin prevScanMem (primer ciclo, valor por defecto {}), toda dirección se asume que venía a 0", () => {
    const rungs = [edgeContactRung("r1", "I0.0", "Q0.0", "P")];
    const { outputs } = computeScanTick(rungs, { "I0.0": true }, {});
    expect(outputs["Q0.0"]).toBe(true);
  });
});
