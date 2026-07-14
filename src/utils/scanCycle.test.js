import { describe, expect, it } from "vitest";
import { computeScanTick } from "./scanCycle";
import { OUTPUT_ADDR, SCAN_MS, MAX_CALL_DEPTH } from "./constants";

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

// Envuelve una lista plana de rungs en un único bloque "main" — la forma
// que espera computeScanTick ahora que opera sobre blocks[] en vez de sobre
// rungs[] a secas (motor de scan recursivo, sub-fase D).
function mainBlocks(rungs, extra = []) {
  return [{ id: "main", kind: "main", name: "Main", rungs, interface: { in: [], out: [] } }, ...extra];
}

function allOutputsFalseExcept(overrides) {
  const base = Object.fromEntries(OUTPUT_ADDR.map((a) => [a, false]));
  return { ...base, ...overrides };
}

describe("computeScanTick — bobina directa", () => {
  it("la salida sigue directamente a la condición de entrada", () => {
    const blocks = mainBlocks([contactRung("r1", "I0.0", "Q0.0", "coil")]);
    const on = computeScanTick(blocks, { "I0.0": true }, {});
    expect(on.outputs).toEqual(allOutputsFalseExcept({ "Q0.0": true }));

    const off = computeScanTick(blocks, { "I0.0": false }, {});
    expect(off.outputs).toEqual(allOutputsFalseExcept({ "Q0.0": false }));
  });

  it("una bobina posterior puede leer la salida que escribió un segmento anterior en el mismo ciclo", () => {
    const blocks = mainBlocks([
      contactRung("r1", "I0.0", "Q0.0", "coil"),
      contactRung("r2", "Q0.0", "Q0.1", "coil"),
    ]);
    const { outputs } = computeScanTick(blocks, { "I0.0": true }, {});
    expect(outputs["Q0.0"]).toBe(true);
    expect(outputs["Q0.1"]).toBe(true);
  });
});

describe("computeScanTick — SET / RESET", () => {
  it("SET enclava la salida a true y no la suelta cuando la condición deja de cumplirse", () => {
    const blocks = mainBlocks([contactRung("r1", "I0.0", "Q0.0", "set")]);
    const tick1 = computeScanTick(blocks, { "I0.0": true, "Q0.0": false }, {});
    expect(tick1.outputs["Q0.0"]).toBe(true);

    // condición ya no se cumple, pero SET no tiene "else": la salida se mantiene
    const tick2 = computeScanTick(blocks, { "I0.0": false, "Q0.0": true }, {});
    expect(tick2.outputs["Q0.0"]).toBe(true);
  });

  it("RESET pone la salida a false solo cuando su condición se cumple", () => {
    const blocks = mainBlocks([contactRung("r1", "I0.1", "Q0.0", "reset")]);
    const stillOn = computeScanTick(blocks, { "I0.1": false, "Q0.0": true }, {});
    expect(stillOn.outputs["Q0.0"]).toBe(true);

    const resetNow = computeScanTick(blocks, { "I0.1": true, "Q0.0": true }, {});
    expect(resetNow.outputs["Q0.0"]).toBe(false);
  });
});

describe("computeScanTick — temporizador TON", () => {
  it("acumula tiempo mientras la condición se cumple y activa la salida al llegar al preset", () => {
    const blocks = mainBlocks([contactRung("r1", "I0.0", "Q0.0", "ton", { preset: 0.2 })]);
    let timers = {};
    let outputs;

    // SCAN_MS/1000 segundos por ciclo; con preset=0.2s hacen falta 0.2/(SCAN_MS/1000) ciclos
    const ticksNeeded = Math.ceil(0.2 / (SCAN_MS / 1000));
    for (let i = 0; i < ticksNeeded - 1; i++) {
      ({ outputs, timers } = computeScanTick(blocks, { "I0.0": true }, timers));
      expect(outputs["Q0.0"]).toBe(false);
    }
    ({ outputs, timers } = computeScanTick(blocks, { "I0.0": true }, timers));
    expect(outputs["Q0.0"]).toBe(true);
    expect(timers["main:r1"]).toBeCloseTo(0.2, 5);
  });

  it("se reinicia a 0 en cuanto la condición deja de cumplirse", () => {
    const blocks = mainBlocks([contactRung("r1", "I0.0", "Q0.0", "ton", { preset: 0.2 })]);
    const running = computeScanTick(blocks, { "I0.0": true }, { "main:r1": 0.15 });
    expect(running.timers["main:r1"]).toBeGreaterThan(0.15);

    const cut = computeScanTick(blocks, { "I0.0": false }, running.timers);
    expect(cut.timers["main:r1"]).toBe(0);
    expect(cut.outputs["Q0.0"]).toBe(false);
  });

  it("no supera el preset aunque la condición se mantenga más ciclos de los necesarios", () => {
    const blocks = mainBlocks([contactRung("r1", "I0.0", "Q0.0", "ton", { preset: 0.1 })]);
    const { timers } = computeScanTick(blocks, { "I0.0": true }, { "main:r1": 0.1 });
    expect(timers["main:r1"]).toBe(0.1);
  });
});

describe("computeScanTick — temporizador TOF (desconexión)", () => {
  it("la salida se activa al instante con la entrada, sin esperar al preset", () => {
    const blocks = mainBlocks([contactRung("r1", "I0.0", "Q0.0", "tof", { preset: 0.2 })]);
    const { outputs, timers } = computeScanTick(blocks, { "I0.0": true }, {});
    expect(outputs["Q0.0"]).toBe(true);
    expect(timers["main:r1"]).toBe(0);
  });

  it("al soltar la entrada, la salida se mantiene hasta llegar al preset y luego se apaga", () => {
    const blocks = mainBlocks([contactRung("r1", "I0.0", "Q0.0", "tof", { preset: 0.2 })]);
    let timers = {};
    let outputs;
    ({ outputs, timers } = computeScanTick(blocks, { "I0.0": true }, timers));
    expect(outputs["Q0.0"]).toBe(true);

    const ticksNeeded = Math.ceil(0.2 / (SCAN_MS / 1000));
    for (let i = 0; i < ticksNeeded - 1; i++) {
      ({ outputs, timers } = computeScanTick(blocks, { "I0.0": false }, timers));
      expect(outputs["Q0.0"]).toBe(true);
    }
    ({ outputs, timers } = computeScanTick(blocks, { "I0.0": false }, timers));
    expect(outputs["Q0.0"]).toBe(false);
  });

  it("si la entrada vuelve a activarse antes del preset, la salida no llega a apagarse", () => {
    const blocks = mainBlocks([contactRung("r1", "I0.0", "Q0.0", "tof", { preset: 0.2 })]);
    let timers = { "main:r1": 0.15 };
    let outputs;
    ({ outputs, timers } = computeScanTick(blocks, { "I0.0": true }, timers));
    expect(outputs["Q0.0"]).toBe(true);
    expect(timers["main:r1"]).toBe(0);
  });

  it("si la entrada nunca ha estado a 1, la salida se queda a 0 aunque pasen ciclos sin corriente (no arranca la cuenta sola)", () => {
    const blocks = mainBlocks([contactRung("r1", "I0.0", "Q0.0", "tof", { preset: 0.2 })]);
    let timers = {};
    let outputs;
    for (let i = 0; i < 5; i++) {
      ({ outputs, timers } = computeScanTick(blocks, { "I0.0": false }, timers));
      expect(outputs["Q0.0"]).toBe(false);
    }
  });

  it("una vez que la cuenta atrás termina, no se reinicia sola en los ciclos siguientes sin corriente", () => {
    const blocks = mainBlocks([contactRung("r1", "I0.0", "Q0.0", "tof", { preset: 0.1 })]);
    let timers = {};
    let outputs;
    ({ outputs, timers } = computeScanTick(blocks, { "I0.0": true }, timers)); // activa
    ({ outputs, timers } = computeScanTick(blocks, { "I0.0": false }, timers)); // empieza a contar
    ({ outputs, timers } = computeScanTick(blocks, { "I0.0": false }, timers)); // preset cumplido, se apaga
    expect(outputs["Q0.0"]).toBe(false);

    for (let i = 0; i < 5; i++) {
      ({ outputs, timers } = computeScanTick(blocks, { "I0.0": false }, timers));
      expect(outputs["Q0.0"]).toBe(false);
    }
  });
});

describe("computeScanTick — temporizador TP (pulso)", () => {
  // preset=0.2s con SCAN_MS=100ms: el pulso dura exactamente 2 ciclos.
  it("un flanco de subida dispara un pulso de 'preset' segundos aunque la entrada baje antes", () => {
    const blocks = mainBlocks([contactRung("r1", "I0.0", "Q0.0", "tp", { preset: 0.2 })]);
    let timers = {};
    let outputs;

    ({ outputs, timers } = computeScanTick(blocks, { "I0.0": true }, timers));
    expect(outputs["Q0.0"]).toBe(true); // ciclo del flanco: pulso arranca

    // la entrada baja enseguida, pero el pulso ya disparado sigue su curso
    ({ outputs, timers } = computeScanTick(blocks, { "I0.0": false }, timers));
    expect(outputs["Q0.0"]).toBe(true);

    ({ outputs, timers } = computeScanTick(blocks, { "I0.0": false }, timers));
    expect(outputs["Q0.0"]).toBe(false); // preset cumplido, pulso termina
  });

  // preset=0.1s: el pulso dura un único ciclo.
  it("no vuelve a disparar mientras la entrada siga activa tras completar el pulso", () => {
    const blocks = mainBlocks([contactRung("r1", "I0.0", "Q0.0", "tp", { preset: 0.1 })]);
    let timers = {};
    let outputs;

    ({ outputs, timers } = computeScanTick(blocks, { "I0.0": true }, timers));
    expect(outputs["Q0.0"]).toBe(true); // ciclo del flanco

    ({ outputs, timers } = computeScanTick(blocks, { "I0.0": true }, timers));
    expect(outputs["Q0.0"]).toBe(false); // pulso ya terminado

    ({ outputs, timers } = computeScanTick(blocks, { "I0.0": true }, timers));
    expect(outputs["Q0.0"]).toBe(false); // sigue sin disparar, no hay flanco nuevo
  });

  it("un segundo flanco (tras soltar y volver a pulsar) dispara un nuevo pulso", () => {
    const blocks = mainBlocks([contactRung("r1", "I0.0", "Q0.0", "tp", { preset: 0.1 })]);
    let timers = {};
    let outputs;

    ({ outputs, timers } = computeScanTick(blocks, { "I0.0": true }, timers)); // pulso 1 arranca
    ({ outputs, timers } = computeScanTick(blocks, { "I0.0": true }, timers)); // pulso 1 termina
    ({ outputs, timers } = computeScanTick(blocks, { "I0.0": false }, timers));
    expect(outputs["Q0.0"]).toBe(false);

    ({ outputs, timers } = computeScanTick(blocks, { "I0.0": true }, timers)); // nuevo flanco
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
    const blocks = mainBlocks([edgeContactRung("r1", "I0.0", "Q0.0", "P")]);
    let timers = {};
    let mem = {};
    let outputs;
    ({ outputs, timers, mem } = computeScanTick(blocks, { "I0.0": false }, timers, mem));
    expect(outputs["Q0.0"]).toBe(false);

    ({ outputs, timers, mem } = computeScanTick(blocks, { "I0.0": true }, timers, mem));
    expect(outputs["Q0.0"]).toBe(true);

    // el ciclo siguiente, aunque la entrada se mantenga a 1, ya no es flanco
    ({ outputs, timers, mem } = computeScanTick(blocks, { "I0.0": true }, timers, mem));
    expect(outputs["Q0.0"]).toBe(false);
  });

  it("un contacto de flanco N solo deja pasar corriente en el ciclo del 1→0", () => {
    const blocks = mainBlocks([edgeContactRung("r1", "I0.0", "Q0.0", "N")]);
    let timers = {};
    let mem = {};
    let outputs;
    ({ outputs, timers, mem } = computeScanTick(blocks, { "I0.0": true }, timers, mem));
    expect(outputs["Q0.0"]).toBe(false);

    ({ outputs, timers, mem } = computeScanTick(blocks, { "I0.0": false }, timers, mem));
    expect(outputs["Q0.0"]).toBe(true);

    ({ outputs, timers, mem } = computeScanTick(blocks, { "I0.0": false }, timers, mem));
    expect(outputs["Q0.0"]).toBe(false);
  });

  it("sin prevScanMem (primer ciclo, valor por defecto {}), toda dirección se asume que venía a 0", () => {
    const blocks = mainBlocks([edgeContactRung("r1", "I0.0", "Q0.0", "P")]);
    const { outputs } = computeScanTick(blocks, { "I0.0": true }, {});
    expect(outputs["Q0.0"]).toBe(true);
  });
});

// --- Sub-fase D: motor de scan recursivo (instrucción "Llamar a bloque") ---

function fcBlock(id, name, { in: ins = [], out: outs = [] } = {}, rungs = []) {
  return { id, kind: "fc", name, rungs, interface: { in: ins, out: outs } };
}
function callRung(id, callTarget, paramWiring = {}, extra = {}) {
  return {
    id,
    title: id,
    comment: "",
    logic: [{ kind: "contact", id: `${id}-en`, addr: "I0.0", neg: false }],
    outAddr: "Q0.0",
    outType: "call",
    preset: 2,
    callTarget,
    paramWiring,
    ...extra,
  };
}
function paramContactRung(id, paramAddr, outAddr) {
  return {
    id,
    title: id,
    comment: "",
    logic: [{ kind: "contact", id: `${id}-c`, addr: paramAddr, neg: false }],
    outAddr,
    outType: "coil",
    preset: 2,
  };
}

describe("computeScanTick — instrucción 'Llamar a bloque'", () => {
  it("EN=false no actualiza el OUT del callee en la dirección cableada (queda 'congelado')", () => {
    const inParam = { id: "pIn", name: "Marcha" };
    const outParam = { id: "pOut", name: "Motor" };
    const fc1 = fcBlock("fc1", "FC1", { in: [inParam], out: [outParam] }, [paramContactRung("r0", "#pIn", "#pOut")]);
    const blocks = mainBlocks(
      [callRung("r1", "fc1", { [inParam.id]: "I0.1", [outParam.id]: "Q0.5" })],
      [fc1]
    );

    // EN=false (I0.0 en false) pero I0.1 (IN del FC) sí está a true.
    const { outputs } = computeScanTick(blocks, { "I0.0": false, "I0.1": true, "Q0.5": false }, {});
    expect(outputs["Q0.5"]).toBe(false);

    // Q0.5 ya estaba en true de un ciclo anterior: con EN=false debe quedar
    // "congelado" tal cual estaba, no recalcularse.
    const frozen = computeScanTick(blocks, { "I0.0": false, "I0.1": true, "Q0.5": true }, {});
    expect(frozen.outputs["Q0.5"]).toBe(true);
  });

  it("EN=true propaga IN→callee y OUT-callee→dirección cableada correctamente", () => {
    const inParam = { id: "pIn", name: "Marcha" };
    const outParam = { id: "pOut", name: "Motor" };
    const fc1 = fcBlock("fc1", "FC1", { in: [inParam], out: [outParam] }, [paramContactRung("r0", "#pIn", "#pOut")]);
    const blocks = mainBlocks(
      [callRung("r1", "fc1", { [inParam.id]: "I0.1", [outParam.id]: "Q0.5" })],
      [fc1]
    );

    const { outputs } = computeScanTick(blocks, { "I0.0": true, "I0.1": true }, {});
    expect(outputs["Q0.5"]).toBe(true);

    const { outputs: outputs2 } = computeScanTick(blocks, { "I0.0": true, "I0.1": false }, {});
    expect(outputs2["Q0.5"]).toBe(false);
  });

  it("dos sitios de llamada al mismo FC con un TON interno mantienen timers independientes, namespaceados por ruta de llamada", () => {
    const inParam = { id: "pIn", name: "Marcha" };
    const fc1 = fcBlock("fc1", "FC1", { in: [inParam], out: [] }, [
      { id: "t1", title: "t1", comment: "", logic: [{ kind: "contact", id: "t1-c", addr: "#pIn", neg: false }], outAddr: "Q0.0", outType: "ton", preset: 0.2 },
    ]);
    const blocks = mainBlocks(
      [
        callRung("r1", "fc1", { [inParam.id]: "I0.1" }, { logic: [{ kind: "contact", id: "r1-en", addr: "I0.0", neg: false }] }),
        callRung("r2", "fc1", { [inParam.id]: "I0.2" }, { logic: [{ kind: "contact", id: "r2-en", addr: "I0.0", neg: false }] }),
      ],
      [fc1]
    );

    // Ambas llamadas activas (EN=I0.0=true), pero solo el sitio r1 tiene su
    // IN (I0.1) a true — r2 (I0.2=false) no debería acumular tiempo.
    let timers = {};
    ({ timers } = computeScanTick(blocks, { "I0.0": true, "I0.1": true, "I0.2": false }, timers));
    expect(timers["main:r1>fc1:t1"]).toBeGreaterThan(0);
    expect(timers["main:r2>fc1:t1"]).toBe(0);

    // El formato de la clave es exactamente el documentado en el diseño.
    expect(Object.keys(timers).sort()).toEqual(["main:r1>fc1:t1", "main:r2>fc1:t1"]);
  });

  it("una llamada anidada (fc1 llama a fc2) genera un timerKey de 3 niveles y funciona", () => {
    const fc2 = fcBlock("fc2", "FC2", { in: [], out: [] }, [
      { id: "t2", title: "t2", comment: "", logic: [{ kind: "contact", id: "t2-c", addr: "I0.0", neg: false }], outAddr: "Q0.0", outType: "ton", preset: 0.1 },
    ]);
    const fc1 = fcBlock("fc1", "FC1", { in: [], out: [] }, [callRung("c1", "fc2", {})]);
    const blocks = mainBlocks([callRung("r1", "fc1", {})], [fc1, fc2]);

    const { timers } = computeScanTick(blocks, { "I0.0": true }, {});
    expect(timers["main:r1>fc1:c1>fc2:t2"]).toBeGreaterThan(0);
  });

  it("MAX_CALL_DEPTH corta un grafo de llamadas cíclico (importado a mano) sin colgarse", () => {
    // fc1 <-> fc2 llamándose mutuamente — la UI nunca permitiría construir
    // esto (wouldCreateCycle), pero un JSON importado a mano sí podría.
    const fc1 = fcBlock("fc1", "FC1", { in: [], out: [] }, [callRung("a", "fc2", {})]);
    const fc2 = fcBlock("fc2", "FC2", { in: [], out: [] }, [callRung("b", "fc1", {})]);
    const blocks = mainBlocks([callRung("r1", "fc1", {})], [fc1, fc2]);

    let result;
    expect(() => {
      result = computeScanTick(blocks, { "I0.0": true }, {});
    }).not.toThrow();
    // Cada "call" ejecutado dentro del límite deja una entrada en
    // localParams (namespaceada por ruta, igual que un timer) — si el
    // grafo cíclico se recorriera sin límite, esto crecería sin parar; con
    // MAX_CALL_DEPTH acotado se queda en un puñado de niveles.
    const entries = Object.keys(result.localParams);
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.length).toBeLessThanOrEqual(MAX_CALL_DEPTH + 2);
  });

  it("un contacto de flanco P sobre un #Param de IN detecta la transición a través de 2+ ticks", () => {
    const inParam = { id: "pIn", name: "Marcha" };
    const fc1 = fcBlock("fc1", "FC1", { in: [inParam], out: [] }, [
      { id: "e1", title: "e1", comment: "", logic: [{ kind: "contact", id: "e1-c", addr: "#pIn", neg: false, edge: "P" }], outAddr: "Q0.5", outType: "coil", preset: 2 },
    ]);
    const blocks = mainBlocks([callRung("r1", "fc1", { [inParam.id]: "I0.1" })], [fc1]);

    let timers = {};
    let scanMem = {};
    let localParams = {};
    let outputs;

    ({ outputs, timers, mem: scanMem, localParams } = computeScanTick(blocks, { "I0.0": true, "I0.1": false }, timers, scanMem, "main", localParams));
    expect(outputs["Q0.5"]).toBe(false);

    ({ outputs, timers, mem: scanMem, localParams } = computeScanTick(blocks, { "I0.0": true, "I0.1": true }, timers, scanMem, "main", localParams));
    expect(outputs["Q0.5"]).toBe(true); // flanco 0->1 detectado

    ({ outputs, timers, mem: scanMem, localParams } = computeScanTick(blocks, { "I0.0": true, "I0.1": true }, timers, scanMem, "main", localParams));
    expect(outputs["Q0.5"]).toBe(false); // ya no es flanco, aunque I0.1 se mantenga a true
  });
});
