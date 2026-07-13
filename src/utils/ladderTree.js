let _uid = 0;
export const genId = () => `n${_uid++}`;

export function newContactNode() {
  return { kind: "contact", id: genId(), addr: "I0.0", neg: false };
}
export function newBranch() {
  return { id: genId(), nodes: [newContactNode()] };
}
export function newParallelNode() {
  return { kind: "parallel", id: genId(), branches: [newBranch(), newBranch()] };
}
export function newRung(id) {
  return {
    id,
    title: `Network ${id + 1}`,
    comment: "Comentario del segmento...",
    logic: [newContactNode()],
    outAddr: "Q0.0",
    outType: "coil", // coil | ton
    preset: 2,
  };
}

// --- Tree Utilities (Mantienen tu lógica original intacta y robusta) ---
export function countContacts(nodes) {
  return nodes.reduce(
    (sum, n) => sum + (n.kind === "contact" ? 1 : n.branches.reduce((s, b) => s + countContacts(b.nodes), 0)),
    0
  );
}
export function mapContainer(nodes, containerId, fn) {
  if (containerId === "root") return fn(nodes);
  return nodes.map((n) => {
    if (n.kind !== "parallel") return n;
    return {
      ...n,
      branches: n.branches.map((b) =>
        b.id === containerId ? { ...b, nodes: fn(b.nodes) } : { ...b, nodes: mapContainer(b.nodes, containerId, fn) }
      ),
    };
  });
}
export function removeNodeEverywhere(nodes, nodeId) {
  return nodes
    .filter((n) => n.id !== nodeId)
    .map((n) =>
      n.kind === "parallel"
        ? { ...n, branches: n.branches.map((b) => ({ ...b, nodes: removeNodeEverywhere(b.nodes, nodeId) })) }
        : n
    );
}
export function updateContactEverywhere(nodes, contactId, patch) {
  return nodes.map((n) => {
    if (n.id === contactId && n.kind === "contact") return { ...n, ...patch };
    if (n.kind === "parallel") {
      return { ...n, branches: n.branches.map((b) => ({ ...b, nodes: updateContactEverywhere(b.nodes, contactId, patch) })) };
    }
    return n;
  });
}
export function addBranchToParallel(nodes, parallelId) {
  return nodes.map((n) => {
    if (n.kind !== "parallel") return n;
    if (n.id === parallelId) {
      if (n.branches.length >= 4) return n;
      return { ...n, branches: [...n.branches, newBranch()] };
    }
    return { ...n, branches: n.branches.map((b) => ({ ...b, nodes: addBranchToParallel(b.nodes, parallelId) })) };
  });
}
export function removeBranchFromParallel(nodes, parallelId, branchId) {
  return nodes.map((n) => {
    if (n.kind !== "parallel") return n;
    if (n.id === parallelId) {
      if (n.branches.length <= 2) return n;
      return { ...n, branches: n.branches.filter((b) => b.id !== branchId) };
    }
    return {
      ...n,
      branches: n.branches.map((b) => ({ ...b, nodes: removeBranchFromParallel(b.nodes, parallelId, branchId) })),
    };
  });
}

// Tras importar un proyecto hay que evitar que el generador de ids local
// (_uid) vuelva a repartir un id que ya existe dentro del árbol importado.
function collectAllNodeIds(nodes, arr) {
  nodes.forEach((n) => {
    arr.push(n.id);
    if (n.kind === "parallel") {
      n.branches.forEach((b) => {
        arr.push(b.id);
        collectAllNodeIds(b.nodes, arr);
      });
    }
  });
}
export function bumpUidPastImportedRungs(rungs) {
  let maxNum = -1;
  rungs.forEach((r) => {
    const ids = [];
    collectAllNodeIds(r.logic, ids);
    ids.forEach((id) => {
      const m = /^n(\d+)$/.exec(id);
      if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    });
  });
  if (maxNum >= _uid) _uid = maxNum + 1;
}
