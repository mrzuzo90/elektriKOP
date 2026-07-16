import { describe, expect, it } from "vitest";
import { collectUsedAddresses, collectOutputConflicts } from "./plcIO";

function contactRung(id, addr, outAddr, outType = "coil", extra = {}) {
  return {
    id,
    title: `${id}`,
    comment: "",
    logic: [{ kind: "contact", id: `${id}-c`, addr, neg: false }],
    outAddr,
    outType,
    preset: 2,
    ...extra,
  };
}

describe("collectUsedAddresses con rungs 'call'", () => {
  it("no marca como usado el outAddr heredado de un rung 'call', pero sí el contacto de su condición EN", () => {
    const rungs = [contactRung(0, "I0.0", "Q0.0", "call", { callTarget: "b1", paramWiring: {} })];
    const used = collectUsedAddresses(rungs);
    expect(used).toContain("I0.0");
    expect(used).not.toContain("Q0.0");
  });
});

describe("collectUsedAddresses con marcas (M)", () => {
  it("incluye una marca usada como contacto o como salida", () => {
    const rungs = [
      contactRung(0, "M0.0", "Q0.0", "coil"),
      contactRung(1, "I0.0", "M1.1", "set"),
    ];
    const used = collectUsedAddresses(rungs);
    expect(used).toContain("M0.0");
    expect(used).toContain("M1.1");
  });

  it("incluye el pin de Reset/Carga de un CTU/CTD aunque no forme parte de la lógica en serie", () => {
    const rungs = [contactRung(0, "I0.0", "Q0.0", "ctu", { resetAddr: "M0.2" })];
    expect(collectUsedAddresses(rungs)).toContain("M0.2");
  });

  it("incluye los contactos de la rama R1 de un bloque SR/RS, no solo los de la rama S", () => {
    const rungs = [
      contactRung(0, "I0.0", "Q0.0", "sr", {
        logicR: [{ kind: "contact", id: "0-r", addr: "I0.1", neg: false }],
      }),
    ];
    const used = collectUsedAddresses(rungs);
    expect(used).toContain("I0.0");
    expect(used).toContain("I0.1");
  });

  it("incluye la dirección analógica (IW) leída por un comparador", () => {
    const rungs = [
      {
        id: 0,
        title: "0",
        comment: "",
        logic: [{ kind: "compare", id: "0-cmp", addr: "IW0", op: ">=", value: 50 }],
        outAddr: "Q0.0",
        outType: "coil",
        preset: 2,
      },
    ];
    expect(collectUsedAddresses(rungs)).toContain("IW0");
  });
});

describe("collectOutputConflicts con rungs 'call'", () => {
  it("un rung 'call' con outAddr heredado no genera un aviso de salida duplicada fantasma", () => {
    const rungs = [
      contactRung(0, "I0.0", "Q0.0", "coil"),
      contactRung(1, "I0.1", "Q0.0", "call", { callTarget: "b1", paramWiring: {} }),
    ];
    expect(collectOutputConflicts(rungs)).toEqual([]);
  });

  it("dos rungs 'call' con el mismo outAddr heredado tampoco generan conflicto", () => {
    const rungs = [
      contactRung(0, "I0.0", "Q0.0", "call", { callTarget: "b1", paramWiring: {} }),
      contactRung(1, "I0.1", "Q0.0", "call", { callTarget: "b2", paramWiring: {} }),
    ];
    expect(collectOutputConflicts(rungs)).toEqual([]);
  });
});
