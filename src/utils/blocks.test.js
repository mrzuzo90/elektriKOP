import { describe, expect, it } from "vitest";
import {
  newBlock,
  addBlock,
  nextFcName,
  nextFbName,
  renameBlock,
  removeBlock,
  setBlockRungs,
  addParam,
  renameParam,
  removeParam,
  findBlock,
  wouldCreateCycle,
  validCallTargets,
  isBlockCalled,
  pruneOrphanWiring,
} from "./blocks";

function callRung(id, callTarget, paramWiring = {}) {
  return { id, title: `${id}`, comment: "", logic: [], outAddr: "Q0.0", outType: "call", preset: 2, callTarget, paramWiring };
}

describe("newBlock", () => {
  it("el bloque main tiene id fijo 'main', kind 'main' y sin rungs/params extra", () => {
    const b = newBlock("main");
    expect(b.id).toBe("main");
    expect(b.kind).toBe("main");
    expect(b.name).toBe("Main");
    expect(b.rungs).toHaveLength(1);
    expect(b.interface).toEqual({ in: [], out: [] });
  });

  it("dos bloques main sucesivos siguen teniendo el mismo id fijo (no se genera uno nuevo)", () => {
    expect(newBlock("main").id).toBe(newBlock("main").id);
  });

  it("un bloque fc tiene id generado y kind 'fc'", () => {
    const b = newBlock("fc", "FC1");
    expect(b.id).toMatch(/^b\d+$/);
    expect(b.kind).toBe("fc");
    expect(b.name).toBe("FC1");
  });

  it("un bloque fb tiene id generado, kind 'fb' y una tercera categoría 'static' en su interfaz", () => {
    const b = newBlock("fb", "FB1");
    expect(b.id).toMatch(/^b\d+$/);
    expect(b.kind).toBe("fb");
    expect(b.name).toBe("FB1");
    expect(b.interface).toEqual({ in: [], out: [], static: [] });
  });
});

describe("addBlock / nextFcName", () => {
  it("nombra el primer FC como FC1", () => {
    const blocks = addBlock([newBlock("main")]);
    expect(blocks.at(-1).name).toBe("FC1");
  });

  it("reutiliza el primer hueco libre tras borrar un FC intermedio", () => {
    let blocks = [newBlock("main")];
    blocks = addBlock(blocks); // FC1
    blocks = addBlock(blocks); // FC2
    blocks = addBlock(blocks); // FC3
    const fc2Id = blocks.find((b) => b.name === "FC2").id;
    blocks = removeBlock(blocks, fc2Id);
    expect(nextFcName(blocks)).toBe("FC2");
  });

  it("addBlock(blocks, 'fb') crea un FB nombrado FB1, independiente de la numeración de los FC", () => {
    let blocks = [newBlock("main")];
    blocks = addBlock(blocks); // FC1
    blocks = addBlock(blocks, "fb"); // FB1
    expect(blocks.at(-1).kind).toBe("fb");
    expect(blocks.at(-1).name).toBe("FB1");
    expect(nextFbName(blocks)).toBe("FB2");
  });
});

describe("renameBlock / removeBlock", () => {
  it("renombra solo el bloque indicado", () => {
    let blocks = addBlock([newBlock("main")]);
    const fcId = blocks.at(-1).id;
    blocks = renameBlock(blocks, fcId, "Semaforo");
    expect(findBlock(blocks, fcId).name).toBe("Semaforo");
    expect(findBlock(blocks, "main").name).toBe("Main");
  });

  it("removeBlock es no-op sobre el bloque main", () => {
    const blocks = [newBlock("main")];
    expect(removeBlock(blocks, "main")).toEqual(blocks);
  });

  it("removeBlock quita un FC normal", () => {
    let blocks = addBlock([newBlock("main")]);
    const fcId = blocks.at(-1).id;
    blocks = removeBlock(blocks, fcId);
    expect(blocks).toHaveLength(1);
  });
});

describe("setBlockRungs", () => {
  it("sustituye los rungs solo del bloque indicado", () => {
    let blocks = addBlock([newBlock("main")]);
    const fcId = blocks.at(-1).id;
    blocks = setBlockRungs(blocks, fcId, []);
    expect(findBlock(blocks, fcId).rungs).toEqual([]);
    expect(findBlock(blocks, "main").rungs).toHaveLength(1);
  });
});

describe("addParam / renameParam / removeParam", () => {
  it("añade un parámetro IN con id generado", () => {
    let blocks = addBlock([newBlock("main")]);
    const fcId = blocks.at(-1).id;
    blocks = addParam(blocks, fcId, "in", "Marcha");
    const params = findBlock(blocks, fcId).interface.in;
    expect(params).toHaveLength(1);
    expect(params[0].name).toBe("Marcha");
    expect(params[0].id).toMatch(/^p\d+$/);
  });

  it("renombra un parámetro concreto", () => {
    let blocks = addBlock([newBlock("main")]);
    const fcId = blocks.at(-1).id;
    blocks = addParam(blocks, fcId, "out", "Salida");
    const paramId = findBlock(blocks, fcId).interface.out[0].id;
    blocks = renameParam(blocks, fcId, "out", paramId, "Motor_ON");
    expect(findBlock(blocks, fcId).interface.out[0].name).toBe("Motor_ON");
  });

  it("quita un parámetro y limpia su wiring huérfano en sitios de llamada", () => {
    let blocks = addBlock([newBlock("main")]);
    const fcId = blocks.at(-1).id;
    blocks = addParam(blocks, fcId, "in", "Marcha");
    const paramId = findBlock(blocks, fcId).interface.in[0].id;
    blocks = blocks.map((b) => (b.id === "main" ? { ...b, rungs: [callRung(0, fcId, { [paramId]: "I0.0" })] } : b));

    blocks = removeParam(blocks, fcId, "in", paramId);
    expect(findBlock(blocks, fcId).interface.in).toEqual([]);
    expect(findBlock(blocks, "main").rungs[0].paramWiring).toEqual({});
  });
});

describe("wouldCreateCycle", () => {
  it("una auto-llamada siempre es un ciclo", () => {
    const blocks = [newBlock("main")];
    expect(wouldCreateCycle(blocks, "main", "main")).toBe(true);
  });

  it("detecta un ciclo A->B->A", () => {
    let blocks = [newBlock("main")];
    blocks = addBlock(blocks);
    blocks = addBlock(blocks);
    const [fc1, fc2] = blocks.filter((b) => b.kind === "fc");
    blocks = blocks.map((b) => (b.id === fc1.id ? { ...b, rungs: [callRung(0, fc2.id)] } : b));
    // ¿Llamar desde fc2 a fc1 cerraría el ciclo fc2->fc1->fc2?
    expect(wouldCreateCycle(blocks, fc2.id, fc1.id)).toBe(true);
  });

  it("una cadena sin ciclo A->B->C no se marca como ciclo", () => {
    let blocks = [newBlock("main")];
    blocks = addBlock(blocks);
    blocks = addBlock(blocks);
    const [fc1, fc2] = blocks.filter((b) => b.kind === "fc");
    expect(wouldCreateCycle(blocks, fc1.id, fc2.id)).toBe(false);
  });
});

describe("validCallTargets", () => {
  it("Main nunca aparece como destino válido", () => {
    let blocks = [newBlock("main")];
    blocks = addBlock(blocks);
    const fc1 = blocks.find((b) => b.kind === "fc");
    expect(validCallTargets(blocks, fc1.id).map((b) => b.id)).not.toContain("main");
  });

  it("excluye bloques que crearían un ciclo", () => {
    let blocks = [newBlock("main")];
    blocks = addBlock(blocks);
    blocks = addBlock(blocks);
    const [fc1, fc2] = blocks.filter((b) => b.kind === "fc");
    blocks = blocks.map((b) => (b.id === fc1.id ? { ...b, rungs: [callRung(0, fc2.id)] } : b));
    const targets = validCallTargets(blocks, fc2.id).map((b) => b.id);
    expect(targets).not.toContain(fc1.id);
  });

  it("incluye bloques FB, no solo FC, como destino válido de una llamada", () => {
    let blocks = [newBlock("main")];
    blocks = addBlock(blocks, "fb");
    const fb1 = blocks.find((b) => b.kind === "fb");
    expect(validCallTargets(blocks, "main").map((b) => b.id)).toContain(fb1.id);
  });
});

describe("isBlockCalled", () => {
  it("es false cuando ningún rung llama al bloque", () => {
    let blocks = [newBlock("main")];
    blocks = addBlock(blocks);
    const fc1 = blocks.find((b) => b.kind === "fc");
    expect(isBlockCalled(blocks, fc1.id)).toBe(false);
  });

  it("es true cuando otro bloque lo llama", () => {
    let blocks = [newBlock("main")];
    blocks = addBlock(blocks);
    const fc1 = blocks.find((b) => b.kind === "fc");
    blocks = blocks.map((b) => (b.id === "main" ? { ...b, rungs: [callRung(0, fc1.id)] } : b));
    expect(isBlockCalled(blocks, fc1.id)).toBe(true);
  });
});

describe("pruneOrphanWiring", () => {
  it("borra el wiring de un parámetro eliminado y deja el resto intacto", () => {
    let blocks = addBlock([newBlock("main")]);
    const fcId = blocks.at(-1).id;
    blocks = addParam(blocks, fcId, "in", "A");
    blocks = addParam(blocks, fcId, "in", "B");
    const [pA, pB] = findBlock(blocks, fcId).interface.in;
    blocks = blocks.map((b) =>
      b.id === "main" ? { ...b, rungs: [callRung(0, fcId, { [pA.id]: "I0.0", [pB.id]: "I0.1" })] } : b
    );
    // Simula borrar el parámetro A "a mano" (sin pasar por removeParam) para
    // probar pruneOrphanWiring de forma aislada.
    blocks = blocks.map((b) => (b.id === fcId ? { ...b, interface: { ...b.interface, in: [pB] } } : b));

    blocks = pruneOrphanWiring(blocks);
    expect(findBlock(blocks, "main").rungs[0].paramWiring).toEqual({ [pB.id]: "I0.1" });
  });
});
