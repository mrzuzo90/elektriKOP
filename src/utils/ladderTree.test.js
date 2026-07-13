import { describe, it, expect } from "vitest";
import { insertNodeAt, moveNode, countContacts } from "./ladderTree";

function contact(id, addr = "I0.0") {
  return { kind: "contact", id, addr, neg: false, edge: null };
}
function parallel(id, branches) {
  return { kind: "parallel", id, branches };
}
function branch(id, nodes) {
  return { id, nodes };
}

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
