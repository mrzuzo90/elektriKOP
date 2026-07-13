// --- Evaluación Lógica ---
export function evalNode(node, mem) {
  if (node.kind === "contact") {
    const raw = !!mem[node.addr];
    return node.neg ? !raw : raw;
  }
  return node.branches.some((b) => evalSeries(b.nodes, mem));
}
export function evalSeries(nodes, mem) {
  if (nodes.length === 0) return false;
  return nodes.every((n) => evalNode(n, mem));
}
export function computeStates(nodes, mem, out) {
  let accFlow = true; // Para pintar líneas verdes hasta donde llegue la corriente
  nodes.forEach((n) => {
    const nodeState = evalNode(n, mem);
    out[n.id] = { state: nodeState, flowIn: accFlow };
    accFlow = accFlow && nodeState;
    if (n.kind === "parallel") {
      n.branches.forEach((b) => computeStates(b.nodes, mem, out));
    }
  });
  return out;
}
