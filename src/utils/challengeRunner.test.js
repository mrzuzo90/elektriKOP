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

describe("runChallenge", () => {
  it("marca todos los pasos correctos contra la solución de referencia de cada ejercicio", () => {
    CHALLENGES.forEach((challenge) => {
      const solucion = SOLUCIONES[challenge.id];
      const { pass, results } = runChallenge(solucion.rungs, solucion.wiringMap, challenge.steps);
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
    const { pass } = runChallenge(rungsRotos, solucion01.wiringMap, CHALLENGES[0].steps);
    expect(pass).toBe(false);
  });
});
