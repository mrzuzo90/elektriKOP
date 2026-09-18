// --- Evaluación Lógica ---
// prevMem es la memoria tal cual estaba al empezar el ciclo de scan actual
// (antes de que ningún segmento la modificara) — la usan los contactos de
// flanco (P/N) para detectar la transición 0→1 o 1→0 entre un ciclo y el
// siguiente. Por defecto {} para no romper las llamadas existentes que no
// usan flancos.
// Comparador numérico (CMP): a diferencia de un contacto, no lee un bit
// sino el valor de una entrada analógica (IW/QW), de un contador (CV) o de un
// temporizador (ET/PT) contra una constante — Number(...) || 0 porque antes del
// primer scan (o si la dirección aún no está en mem) no hay valor físico
// todavía, y "sin señal" debe leerse como 0, no como NaN propagándose por toda la
// comparación.
function evalCompare(node, mem) {
  // Un contador o temporizador borrado o convertido a otra instrucción no equivale a 0.
  const isDynamic =
    node.addr?.startsWith("CV:") ||
    node.addr?.startsWith("ET:") ||
    node.addr?.startsWith("PT:");
  if (isDynamic && !Number.isFinite(mem[node.addr])) return false;
  const raw = Number(mem[node.addr]) || 0;
  const EPS = 1e-4;
  switch (node.op) {
    case ">=": return raw >= node.value || Math.abs(raw - node.value) < EPS;
    case "<=": return raw <= node.value || Math.abs(raw - node.value) < EPS;
    case "==": return Math.abs(raw - node.value) < EPS;
    case "<>": return Math.abs(raw - node.value) >= EPS;
    case "<": return raw < node.value && Math.abs(raw - node.value) >= EPS;
    case ">": return raw > node.value && Math.abs(raw - node.value) >= EPS;
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
  if (node.kind === "not") return true;
  if (node.kind === "parallel" && Array.isArray(node.branches)) {
    return node.branches.some((b) => evalSeries(b.nodes, mem, prevMem));
  }
  return false;
}
export function evalSeries(nodes, mem, prevMem = {}) {
  if (nodes.length === 0) return false;
  let rlo = true;
  for (const n of nodes) {
    if (n.kind === "not") {
      rlo = !rlo;
    } else {
      rlo = rlo && evalNode(n, mem, prevMem);
    }
  }
  return rlo;
}
export function computeStates(nodes, mem, prevMem = {}, out = {}) {
  let accFlow = true; // Para pintar líneas verdes hasta donde llegue la corriente
  nodes.forEach((n) => {
    if (n.kind === "not") {
      const nextFlow = !accFlow;
      out[n.id] = { state: true, flowIn: accFlow, flowOut: nextFlow };
      accFlow = nextFlow;
    } else {
      const nodeState = evalNode(n, mem, prevMem);
      out[n.id] = { state: nodeState, flowIn: accFlow };
      accFlow = accFlow && nodeState;
      if (n.kind === "parallel" && Array.isArray(n.branches)) {
        n.branches.forEach((b) => {
          computeStates(b.nodes, mem, prevMem, out);
          out[b.id] = { flowOut: accFlow && evalSeries(b.nodes, mem, prevMem) };
        });
      }
    }
  });
  return out;
}
