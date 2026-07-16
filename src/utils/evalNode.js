// --- Evaluación Lógica ---
// prevMem es la memoria tal cual estaba al empezar el ciclo de scan actual
// (antes de que ningún segmento la modificara) — la usan los contactos de
// flanco (P/N) para detectar la transición 0→1 o 1→0 entre un ciclo y el
// siguiente. Por defecto {} para no romper las llamadas existentes que no
// usan flancos.
// Comparador numérico (CMP): a diferencia de un contacto, no lee un bit
// sino el valor de una entrada analógica (IW) y lo compara contra una
// constante — Number(...) || 0 porque antes del primer scan (o si la
// dirección aún no está en mem) no hay valor físico todavía, y "sin señal"
// debe leerse como 0, no como NaN propagándose por toda la comparación.
function evalCompare(node, mem) {
  const raw = Number(mem[node.addr]) || 0;
  switch (node.op) {
    case ">=": return raw >= node.value;
    case "<=": return raw <= node.value;
    case "==": return raw === node.value;
    case "<>": return raw !== node.value;
    case "<": return raw < node.value;
    case ">": return raw > node.value;
    default: return false;
  }
}
export function evalNode(node, mem, prevMem = {}) {
  if (node.kind === "contact") {
    const raw = !!mem[node.addr];
    if (node.edge === "P") return raw && !prevMem[node.addr];
    if (node.edge === "N") return !raw && !!prevMem[node.addr];
    return node.neg ? !raw : raw;
  }
  if (node.kind === "compare") return evalCompare(node, mem);
  return node.branches.some((b) => evalSeries(b.nodes, mem, prevMem));
}
export function evalSeries(nodes, mem, prevMem = {}) {
  if (nodes.length === 0) return false;
  return nodes.every((n) => evalNode(n, mem, prevMem));
}
export function computeStates(nodes, mem, prevMem = {}, out = {}) {
  let accFlow = true; // Para pintar líneas verdes hasta donde llegue la corriente
  nodes.forEach((n) => {
    const nodeState = evalNode(n, mem, prevMem);
    out[n.id] = { state: nodeState, flowIn: accFlow };
    accFlow = accFlow && nodeState;
    if (n.kind === "parallel") {
      n.branches.forEach((b) => computeStates(b.nodes, mem, prevMem, out));
    }
  });
  return out;
}
