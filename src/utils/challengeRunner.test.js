import { describe, expect, it } from "vitest";
import { runChallenge } from "./challengeRunner";
import { CHALLENGES } from "../challenges/challenges";
import solucion01 from "../../docs/ejercicios/01-marcha-paro-enclavamiento/solucion.json";
import solucion02 from "../../docs/ejercicios/02-semaforo-temporizadores/solucion.json";
import solucion03 from "../../docs/ejercicios/03-puerta-automatica-finales-carrera/solucion.json";
import solucion04 from "../../docs/ejercicios/04-cintas-transportadoras-fc/solucion.json";
import solucion05 from "../../docs/ejercicios/05-contador-piezas-marca/solucion.json";
import solucion06 from "../../docs/ejercicios/06-tanque-nivel-comparador/solucion.json";
import solucion07 from "../../docs/ejercicios/07-alternador-fb-static/solucion.json";

const SOLUCIONES = {
  "01-marcha-paro-enclavamiento": solucion01,
  "02-semaforo-temporizadores": solucion02,
  "03-puerta-automatica-finales-carrera": solucion03,
  "04-cintas-transportadoras-fc": solucion04,
  "05-contador-piezas-marca": solucion05,
  "06-tanque-nivel-comparador": solucion06,
  "07-alternador-fb-static": solucion07,
};

// Los 3 primeros solucion.json de docs/ejercicios/ siguen en formato v1
// (rungs a secas) — runChallenge ahora opera sobre blocks[], así que los
// envolvemos igual que hace migrateProjectData al importar un proyecto v1
// real. El ejercicio 4 ya está en v2 (blocks[] con un FC) y se usa tal cual.
function mainBlocks(rungs) {
  return [{ id: "main", kind: "main", name: "Main", rungs, interface: { in: [], out: [] } }];
}
function blocksFor(solucion) {
  return solucion.blocks ?? mainBlocks(solucion.rungs);
}

describe("runChallenge", () => {
  it("marca todos los pasos correctos contra la solución de referencia de cada ejercicio", () => {
    CHALLENGES.forEach((challenge) => {
      const solucion = SOLUCIONES[challenge.id];
      const { pass, results } = runChallenge(blocksFor(solucion), solucion.wiringMap, challenge.steps);
      const failed = results.filter((r) => !r.pass).map((r) => r.label);
      expect(failed, `${challenge.title}: pasos fallidos`).toEqual([]);
      expect(pass).toBe(true);
    });
  });

  it("detecta un fallo real: sin el contacto NC de Paro, el ejercicio 1 no debe pasar", () => {
    const rungsRotos = [
      {
        ...solucion01.rungs[0],
        // Se quita el último contacto (el NC de Paro) del segmento: el motor
        // ya no debería poder pararse nunca.
        logic: solucion01.rungs[0].logic.slice(0, -1),
      },
    ];
    const { pass } = runChallenge(mainBlocks(rungsRotos), solucion01.wiringMap, CHALLENGES[0].steps);
    expect(pass).toBe(false);
  });

  it("detecta un fallo real: si el TON interno del FC del ejercicio 4 no lee su propio parámetro, no debe pasar", () => {
    const fc1Roto = {
      ...solucion04.blocks[1],
      rungs: [
        {
          ...solucion04.blocks[1].rungs[0],
          // Se cablea el temporizador a una dirección física fija en vez de
          // al parámetro #pMarcha: las dos llamadas dejarían de ser
          // independientes entre sí (comparten memoria de timer con esa
          // dirección física en vez de tener la suya propia).
          logic: [{ kind: "contact", id: "n2", addr: "I0.1", neg: false }],
        },
      ],
    };
    const blocksRotos = [solucion04.blocks[0], fc1Roto];
    const { pass } = runChallenge(blocksRotos, solucion04.wiringMap, CHALLENGES.find((c) => c.id === "04-cintas-transportadoras-fc").steps);
    expect(pass).toBe(false);
  });

  it("detecta un fallo real: si el contacto de la marca en MOTOR_CINTA queda en NA en vez de NC, el interbloqueo se invierte y no debe pasar", () => {
    const mainRoto = {
      ...solucion05.blocks[0],
      rungs: solucion05.blocks[0].rungs.map((rung) =>
        // Contacto NA en vez de NC: el motor arrancaría justo al revés
        // (parado en reposo, en marcha con el lote completo).
        rung.title === "MOTOR_CINTA" ? { ...rung, logic: [{ ...rung.logic[0], neg: false }] } : rung
      ),
    };
    const { pass } = runChallenge([mainRoto], solucion05.wiringMap, CHALLENGES.find((c) => c.id === "05-contador-piezas-marca").steps);
    expect(pass).toBe(false);
  });

  it("detecta un fallo real: si la alarma del ejercicio 6 queda en serie con Sistema_Activo, no debe pasar (debe seguir sonando con el sistema parado)", () => {
    const mainRoto = {
      ...solucion06.blocks[0],
      rungs: solucion06.blocks[0].rungs.map((rung) =>
        rung.title === "ALARMA_NIVEL_ALTO"
          ? { ...rung, logic: [{ kind: "contact", id: "n-extra", addr: "M0.0", neg: false }, ...rung.logic] }
          : rung
      ),
    };
    const { pass } = runChallenge([mainRoto], solucion06.wiringMap, CHALLENGES.find((c) => c.id === "06-tanque-nivel-comparador").steps);
    expect(pass).toBe(false);
  });

  it("detecta un fallo real: si el comparador de la bomba usa '<=' en vez de '<', no debe pasar (la bomba no se pararía justo al 30%)", () => {
    const mainRoto = {
      ...solucion06.blocks[0],
      rungs: solucion06.blocks[0].rungs.map((rung) =>
        rung.title === "BOMBA_LLENADO"
          ? { ...rung, logic: rung.logic.map((n) => (n.kind === "compare" ? { ...n, op: "<=" } : n)) }
          : rung
      ),
    };
    const { pass } = runChallenge([mainRoto], solucion06.wiringMap, CHALLENGES.find((c) => c.id === "06-tanque-nivel-comparador").steps);
    expect(pass).toBe(false);
  });

  it("detecta un fallo real: si el toggle del ejercicio 7 se monta con SET+RESET separados (no un único SR) tiene una condición de carrera y no debe pasar", () => {
    const fb1Roto = {
      ...solucion07.blocks[1],
      rungs: [
        {
          id: 0, title: "SET_ESTADO", comment: "",
          logic: [
            { kind: "contact", id: "n3", addr: "#pIn", neg: false, edge: "P" },
            { kind: "contact", id: "n4", addr: "#pEstado", neg: true },
          ],
          outAddr: "#pEstado", outType: "set", preset: 2,
        },
        {
          id: 1, title: "RESET_ESTADO", comment: "",
          logic: [
            { kind: "contact", id: "n5", addr: "#pIn", neg: false, edge: "P" },
            { kind: "contact", id: "n6", addr: "#pEstado", neg: false },
          ],
          outAddr: "#pEstado", outType: "reset", preset: 2,
        },
        solucion07.blocks[1].rungs[1],
      ],
    };
    const blocksRotos = [solucion07.blocks[0], fb1Roto];
    const { pass } = runChallenge(blocksRotos, solucion07.wiringMap, CHALLENGES.find((c) => c.id === "07-alternador-fb-static").steps);
    expect(pass).toBe(false);
  });

  it("una llamada a FC dentro de Main también se ejecuta (motor de scan recursivo)", () => {
    const fc1 = {
      id: "fc1",
      kind: "fc",
      name: "FC1",
      rungs: [
        {
          id: 0,
          title: "N1",
          comment: "",
          logic: [{ kind: "contact", id: "c1", addr: "#pIn", neg: false }],
          outAddr: "#pOut",
          outType: "coil",
          preset: 2,
        },
      ],
      interface: { in: [{ id: "pIn", name: "Marcha" }], out: [{ id: "pOut", name: "Motor" }] },
    };
    const blocks = [
      {
        id: "main",
        kind: "main",
        name: "Main",
        rungs: [
          {
            id: 0,
            title: "N1",
            comment: "",
            logic: [{ kind: "contact", id: "c0", addr: "I0.0", neg: false }],
            outAddr: "Q0.0",
            outType: "call",
            preset: 2,
            callTarget: "fc1",
            paramWiring: { pIn: "I0.1", pOut: "Q0.5" },
          },
        ],
        interface: { in: [], out: [] },
      },
      fc1,
    ];
    const { pass, results } = runChallenge(blocks, {}, [
      { type: "set", addr: "I0.0", value: true },
      { type: "set", addr: "I0.1", value: true },
      { type: "wait", scans: 1 },
      { type: "assert", label: "Q0.5 se activa a través de la llamada", addr: "Q0.5", value: true },
    ]);
    expect(results.map((r) => r.pass)).toEqual([true]);
    expect(pass).toBe(true);
  });
});
