import { describe, expect, it } from "vitest";
import { computeStates, evalNode, evalSeries } from "./evalNode";

function contact(addr, neg = false) {
  return { kind: "contact", id: `c-${addr}-${neg}`, addr, neg };
}
function edgeContact(addr, edge) {
  return { kind: "contact", id: `c-${addr}-${edge}`, addr, neg: false, edge };
}
function branch(id, nodes) {
  return { id, nodes };
}
function parallel(id, branches) {
  return { kind: "parallel", id, branches };
}
function compare(addr, op, value) {
  return { kind: "compare", id: `cmp-${addr}-${op}-${value}`, addr, op, value };
}

describe("evalNode", () => {
  it("un contacto NA vale lo mismo que el bit de memoria", () => {
    expect(evalNode(contact("I0.0"), { "I0.0": true })).toBe(true);
    expect(evalNode(contact("I0.0"), { "I0.0": false })).toBe(false);
  });

  it("un contacto NC invierte el bit de memoria", () => {
    expect(evalNode(contact("I0.0", true), { "I0.0": true })).toBe(false);
    expect(evalNode(contact("I0.0", true), { "I0.0": false })).toBe(true);
  });

  it("un contacto sin memoria asociada se trata como false", () => {
    expect(evalNode(contact("I0.5"), {})).toBe(false);
  });

  it("un contacto de flanco P solo vale true en la transición 0→1 respecto a prevMem", () => {
    const c = edgeContact("I0.0", "P");
    expect(evalNode(c, { "I0.0": true }, { "I0.0": false })).toBe(true);
    expect(evalNode(c, { "I0.0": true }, { "I0.0": true })).toBe(false);
    expect(evalNode(c, { "I0.0": false }, { "I0.0": false })).toBe(false);
  });

  it("un contacto de flanco N solo vale true en la transición 1→0 respecto a prevMem", () => {
    const c = edgeContact("I0.0", "N");
    expect(evalNode(c, { "I0.0": false }, { "I0.0": true })).toBe(true);
    expect(evalNode(c, { "I0.0": false }, { "I0.0": false })).toBe(false);
    expect(evalNode(c, { "I0.0": true }, { "I0.0": true })).toBe(false);
  });

  it("un comparador evalúa el valor numérico de mem contra una constante", () => {
    expect(evalNode(compare("IW0", ">=", 50), { IW0: 50 })).toBe(true);
    expect(evalNode(compare("IW0", ">=", 50), { IW0: 49 })).toBe(false);
    expect(evalNode(compare("IW0", "<=", 50), { IW0: 50 })).toBe(true);
    expect(evalNode(compare("IW0", "==", 10), { IW0: 10 })).toBe(true);
    expect(evalNode(compare("IW0", "<>", 10), { IW0: 10 })).toBe(false);
    expect(evalNode(compare("IW0", "<", 10), { IW0: 5 })).toBe(true);
    expect(evalNode(compare("IW0", ">", 10), { IW0: 5 })).toBe(false);
  });

  it("un comparador sin valor todavía en mem se trata como 0", () => {
    expect(evalNode(compare("IW0", "==", 0), {})).toBe(true);
    expect(evalNode(compare("IW0", ">=", 1), {})).toBe(false);
  });

  it("un nodo paralelo es true si al menos una rama pasa (OR)", () => {
    const node = parallel("p1", [
      branch("b1", [contact("I0.0")]),
      branch("b2", [contact("I0.1")]),
    ]);
    expect(evalNode(node, { "I0.0": false, "I0.1": false })).toBe(false);
    expect(evalNode(node, { "I0.0": true, "I0.1": false })).toBe(true);
    expect(evalNode(node, { "I0.0": false, "I0.1": true })).toBe(true);
  });
});

describe("evalSeries", () => {
  it("una serie vacía nunca deja pasar corriente", () => {
    expect(evalSeries([], {})).toBe(false);
  });

  it("una serie es AND de todos sus nodos", () => {
    const nodes = [contact("I0.0"), contact("I0.1")];
    expect(evalSeries(nodes, { "I0.0": true, "I0.1": true })).toBe(true);
    expect(evalSeries(nodes, { "I0.0": true, "I0.1": false })).toBe(false);
    expect(evalSeries(nodes, { "I0.0": false, "I0.1": false })).toBe(false);
  });

  it("combina serie con un bloque paralelo intermedio", () => {
    // I0.0 AND (I0.1 OR I0.2)
    const nodes = [
      contact("I0.0"),
      parallel("p1", [branch("b1", [contact("I0.1")]), branch("b2", [contact("I0.2")])]),
    ];
    expect(evalSeries(nodes, { "I0.0": true, "I0.1": false, "I0.2": true })).toBe(true);
    expect(evalSeries(nodes, { "I0.0": false, "I0.1": true, "I0.2": true })).toBe(false);
    expect(evalSeries(nodes, { "I0.0": true, "I0.1": false, "I0.2": false })).toBe(false);
  });
});

describe("computeStates", () => {
  it("propaga flowIn en cadena: si un contacto corta, los siguientes no reciben flujo", () => {
    const nodes = [contact("I0.0"), contact("I0.1")];
    const states = computeStates(nodes, { "I0.0": false, "I0.1": true }, {});
    expect(states[nodes[0].id]).toEqual({ state: false, flowIn: true });
    // El segundo contacto sí puede estar activo (state:true) pero no le llega corriente (flowIn:false)
    expect(states[nodes[1].id]).toEqual({ state: true, flowIn: false });
  });

  it("registra también el estado de las ramas dentro de un paralelo", () => {
    const node = parallel("p1", [branch("b1", [contact("I0.0")]), branch("b2", [contact("I0.1")])]);
    const states = computeStates([node], { "I0.0": true, "I0.1": false }, {});
    expect(states["p1"].state).toBe(true); // OR de las ramas
    expect(states[node.branches[0].nodes[0].id].state).toBe(true);
    expect(states[node.branches[1].nodes[0].id].state).toBe(false);
  });
});
