import { describe, expect, it } from "vitest";
import { runChallenge } from "./challengeRunner";
import { CHALLENGES } from "../challenges/challenges";
import solucion01 from "../../docs/ejercicios/01-marcha-paro-enclavamiento/solucion.json";
import solucion02 from "../../docs/ejercicios/02-semaforo-temporizadores/solucion.json";
import solucion03 from "../../docs/ejercicios/03-puerta-automatica-finales-carrera/solucion.json";

const SOLUCIONES = {
  "01-marcha-paro-enclavamiento": solucion01,
  "02-semaforo-temporizadores": solucion02,
  "03-puerta-automatica-finales-carrera": solucion03,
};

// Los 3 solucion.json de docs/ejercicios/ siguen en formato v1 (rungs a
// secas) — runChallenge ahora opera sobre blocks[], así que los envolvemos
// igual que hace migrateProjectData al importar un proyecto v1 real.
function mainBlocks(rungs) {
  return [{ id: "main", kind: "main", name: "Main", rungs, interface: { in: [], out: [] } }];
}

describe("runChallenge", () => {
  it("marca todos los pasos correctos contra la solución de referencia de cada ejercicio", () => {
    CHALLENGES.forEach((challenge) => {
      const solucion = SOLUCIONES[challenge.id];
      const { pass, results } = runChallenge(mainBlocks(solucion.rungs), solucion.wiringMap, challenge.steps);
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
