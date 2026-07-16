import { describe, it, expect } from "vitest";
import { insertNodeAt, moveNode, countContacts, updateContactEverywhere, genId, genBlockId, genParamId, bumpUidPastImportedBlocks } from "./ladderTree";

function contact(id, addr = "I0.0") {
  return { kind: "contact", id, addr, neg: false, edge: null };
}
function compareNode(id, addr = "IW0") {
  return { kind: "compare", id, addr, op: ">=", value: 50 };
}
function parallel(id, branches) {
  return { kind: "parallel", id, branches };
}
function branch(id, nodes) {
  return { id, nodes };
}

describe("countContacts con nodos 'compare'", () => {
  it("cuenta un comparador como un nodo hoja, igual que un contacto", () => {
    expect(countContacts([contact("a"), compareNode("b")])).toBe(2);
    expect(countContacts([parallel("p1", [branch("b1", [compareNode("x")]), branch("b2", [contact("y")])])])).toBe(2);
  });
});

describe("updateContactEverywhere con nodos 'compare'", () => {
  it("actualiza un comparador por id, no solo un contacto", () => {
    const tree = [compareNode("cmp1")];
    const result = updateContactEverywhere(tree, "cmp1", { op: "==", value: 10 });
    expect(result[0]).toMatchObject({ op: "==", value: 10 });
  });
});

describe("insertNodeAt", () => {
  it("inserta en el índice dado dentro de root", () => {
    const tree = [contact("a"), contact("c")];
    const result = insertNodeAt(tree, "root", 1, contact("b"));
    expect(result.map((n) => n.id)).toEqual(["a", "b", "c"]);
  });

  it("inserta dentro de una rama de un bloque paralelo", () => {
    const tree = [parallel("p1", [branch("b1", [contact("x")]), branch("b2", [contact("y")])])];
    const result = insertNodeAt(tree, "b1", 1, contact("z"));
    expect(result[0].branches[0].nodes.map((n) => n.id)).toEqual(["x", "z"]);
    expect(result[0].branches[1].nodes.map((n) => n.id)).toEqual(["y"]);
  });

  it("clampa el índice si se pasa del final", () => {
    const tree = [contact("a")];
    const result = insertNodeAt(tree, "root", 99, contact("b"));
    expect(result.map((n) => n.id)).toEqual(["a", "b"]);
  });
});

describe("moveNode", () => {
  it("mueve un contacto de root a una rama de un paralelo", () => {
    const tree = [
      contact("a"),
      contact("b"),
      parallel("p1", [branch("b1", [contact("x")]), branch("b2", [contact("y")])]),
    ];
    const result = moveNode(tree, "b", "b1", 1);
    const root = result.filter((n) => n.kind !== "parallel").map((n) => n.id);
    expect(root).toEqual(["a"]);
    const p1 = result.find((n) => n.id === "p1");
    expect(p1.branches[0].nodes.map((n) => n.id)).toEqual(["x", "b"]);
  });

  it("reordena dentro del mismo contenedor ajustando el índice tras extraer", () => {
    const tree = [contact("a"), contact("b"), contact("c")];
    // targetIndex se interpreta sobre la lista ORIGINAL (la que ve el
    // usuario mientras arrastra, con "a" todavía presente): índice 2 cae
    // justo antes de "c", es decir, entre "b" y "c".
    const result = moveNode(tree, "a", "root", 2);
    expect(result.map((n) => n.id)).toEqual(["b", "a", "c"]);
  });

  it("reordena al final cuando se suelta tras el último elemento", () => {
    const tree = [contact("a"), contact("b"), contact("c")];
    const result = moveNode(tree, "a", "root", 3);
    expect(result.map((n) => n.id)).toEqual(["b", "c", "a"]);
  });

  it("no deja una rama vacía: rechaza mover el único nodo de una rama a otro sitio", () => {
    const tree = [
      contact("a"),
      parallel("p1", [branch("b1", [contact("x")]), branch("b2", [contact("y")])]),
    ];
    const result = moveNode(tree, "x", "root", 0);
    expect(result).toBe(tree);
  });

  it("no permite soltar un bloque paralelo dentro de una de sus propias ramas", () => {
    const tree = [
      contact("a"),
      contact("b"),
      parallel("p1", [branch("b1", [contact("x")]), branch("b2", [contact("y")])]),
    ];
    const result = moveNode(tree, "p1", "b1", 0);
    expect(result).toBe(tree);
  });

  it("devuelve el árbol intacto si el nodo no existe", () => {
    const tree = [contact("a")];
    const result = moveNode(tree, "no-existe", "root", 0);
    expect(result).toBe(tree);
  });

  it("mover un bloque paralelo completo conserva sus contactos internos", () => {
    const tree = [
      contact("a"),
      contact("b"),
      parallel("p1", [branch("b1", [contact("x")]), branch("b2", [contact("y")])]),
    ];
    const result = moveNode(tree, "p1", "root", 0);
    expect(result[0].id).toBe("p1");
    expect(countContacts(result)).toBe(countContacts(tree));
  });
});

describe("genBlockId / genParamId", () => {
  it("no colisionan entre sí ni con genId(), y comparten el mismo contador creciente", () => {
    const ids = [genId(), genBlockId(), genParamId(), genId(), genBlockId()];
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toMatch(/^n\d+$/);
    expect(ids[1]).toMatch(/^b\d+$/);
    expect(ids[2]).toMatch(/^p\d+$/);
  });
});

describe("bumpUidPastImportedBlocks", () => {
  function rungWith(id, nodeIds) {
    return {
      id,
      title: `${id}`,
      comment: "",
      logic: nodeIds.map((nid) => contact(nid)),
      outAddr: "Q0.0",
      outType: "coil",
      preset: 2,
    };
  }

  it("adelanta el contador tras importar ids en los 3 namespaces (n, b, p)", () => {
    const blocks = [
      { id: "main", kind: "main", name: "Main", rungs: [rungWith(0, ["n5"])], interface: { in: [], out: [] } },
      {
        id: "b3",
        kind: "fc",
        name: "FC1",
        rungs: [rungWith(0, ["n1"])],
        interface: { in: [{ id: "p2", name: "X" }], out: [] },
      },
    ];
    bumpUidPastImportedBlocks(blocks);
    // El próximo id generado debe ser estrictamente posterior al mayor
    // número visto en cualquiera de los 3 namespaces (n5, b3, p2 -> max 5).
    const nextIds = [genId(), genBlockId(), genParamId()];
    nextIds.forEach((id) => {
      const n = parseInt(id.slice(1), 10);
      expect(n).toBeGreaterThan(5);
    });
  });

  it("ignora el id 'main' del bloque principal sin romperse", () => {
    const blocks = [{ id: "main", kind: "main", name: "Main", rungs: [rungWith(0, [])], interface: { in: [], out: [] } }];
    expect(() => bumpUidPastImportedBlocks(blocks)).not.toThrow();
  });
});
