let _uid = 0;
export const genId = () => `n${_uid++}`;
export const genBlockId = () => `b${_uid++}`;
export const genParamId = () => `p${_uid++}`;

export function newContactNode() {
  return { kind: "contact", id: genId(), addr: "I0.0", neg: false, edge: null };
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
    outType: "coil", // coil | set | reset | ton | tof | tp
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

// --- Drag & drop: insertar en una posición concreta / mover un nodo ---

// Inserta `node` en el índice `index` del contenedor `containerId` (root o
// una rama), reutilizando mapContainer para no duplicar el recorrido del
// árbol que ya usan addContact/addParallel.
export function insertNodeAt(nodes, containerId, index, node) {
  return mapContainer(nodes, containerId, (containerNodes) => {
    const copy = [...containerNodes];
    copy.splice(Math.max(0, Math.min(index, copy.length)), 0, node);
    return copy;
  });
}

// Busca `nodeId` en todo el árbol y lo extrae, devolviendo también en qué
// contenedor/posición estaba — moveNode lo necesita para no dejar vacía la
// rama de origen y para ajustar el índice de destino cuando el movimiento
// es dentro del mismo contenedor (al quitar el nodo, todo lo que iba
// después se desplaza un puesto).
function extractNode(nodes, nodeId, containerId) {
  const idx = nodes.findIndex((n) => n.id === nodeId);
  if (idx !== -1) {
    const rest = [...nodes.slice(0, idx), ...nodes.slice(idx + 1)];
    return { nodes: rest, found: nodes[idx], sourceContainerId: containerId, sourceIndex: idx, sourceSiblingCount: nodes.length };
  }
  let result = null;
  const next = nodes.map((n) => {
    if (result || n.kind !== "parallel") return n;
    const branches = n.branches.map((b) => {
      if (result) return b;
      const r = extractNode(b.nodes, nodeId, b.id);
      if (r.found) {
        result = r;
        return { ...b, nodes: r.nodes };
      }
      return b;
    });
    return result ? { ...n, branches } : n;
  });
  return result ? { ...result, nodes: next } : { nodes: next, found: null };
}

// ¿El bloque paralelo `node` contiene (en cualquier profundidad) la rama
// `containerId`? Evita soltar un bloque dentro de una de sus propias ramas,
// lo que lo convertiría en su propio padre y rompería el árbol.
function nodeContainsContainer(node, containerId) {
  if (node.kind !== "parallel") return false;
  return node.branches.some(
    (b) => b.id === containerId || b.nodes.some((n) => nodeContainsContainer(n, containerId))
  );
}

// Mueve el nodo `nodeId` (contacto o bloque paralelo, con todo su subárbol)
// a la posición `targetIndex` de `targetContainerId`. No hace nada (devuelve
// el árbol intacto) si el nodo no existe, si dejaría vacía su rama de
// origen, o si el destino está dentro del propio nodo que se mueve.
export function moveNode(rootNodes, nodeId, targetContainerId, targetIndex) {
  const { nodes: without, found, sourceContainerId, sourceIndex, sourceSiblingCount } = extractNode(rootNodes, nodeId, "root");
  if (!found) return rootNodes;
  if (sourceContainerId !== targetContainerId && sourceSiblingCount <= 1) return rootNodes;
  if (found.kind === "parallel" && nodeContainsContainer(found, targetContainerId)) return rootNodes;

  let adjustedIndex = targetIndex;
  if (sourceContainerId === targetContainerId && targetIndex > sourceIndex) adjustedIndex -= 1;
  return insertNodeAt(without, targetContainerId, adjustedIndex, found);
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
// Igual que bumpUidPastImportedRungs, pero recorriendo los 3 namespaces de
// id que ahora comparten el mismo contador (_uid): nodos de rung ("n"),
// bloques ("b") y parámetros de interfaz ("p"). El id "main" del bloque
// principal no matchea ninguno de los 3 patrones y se ignora sin más.
export function bumpUidPastImportedBlocks(blocks) {
  let maxNum = -1;
  const bump = (id, prefix) => {
    const m = new RegExp(`^${prefix}(\\d+)$`).exec(id);
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
  };
  blocks.forEach((b) => {
    bump(b.id, "b");
    ["in", "out"].forEach((dir) => {
      (b.interface?.[dir] || []).forEach((p) => bump(p.id, "p"));
    });
    b.rungs.forEach((r) => {
      const ids = [];
      collectAllNodeIds(r.logic, ids);
      ids.forEach((id) => bump(id, "n"));
    });
  });
  if (maxNum >= _uid) _uid = maxNum + 1;
}
