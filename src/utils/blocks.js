import { genBlockId, genParamId, newRung } from "./ladderTree";

// CRUD de bloques (Main + FCs) e interfaz de parámetros. Vive aparte de
// ladderTree.js porque ese archivo opera sobre el árbol `logic` de UN rung,
// no sobre la lista de bloques del proyecto. Mismo estilo puro/inmutable.

// El bloque "main" SIEMPRE tiene id fijo "main", nunca generado — useProject,
// App.jsx (activeBlockId), la migración v1→v2 y el motor de scan
// (mainBlockId por defecto) lo asumen así en varios sitios; si se generara
// con genBlockId() cada llamada (p.ej. clearProject) produciría un id
// distinto cada vez y rompería esas referencias.
// Un FB añade una tercera categoría de parámetro ("static") frente a un FC:
// a diferencia de IN/OUT (se recalculan en cada llamada), STATIC persiste
// entre ciclos de scan, namespaceada por sitio de llamada (ver scanCycle.js)
// — así cada llamada al mismo FB tiene su propia memoria de instancia, sin
// necesidad de gestionar un DB de instancia a mano como en TIA Portal real.
export function newBlock(kind = "fc", name) {
  return {
    id: kind === "main" ? "main" : genBlockId(),
    kind, // "main" | "fc" | "fb"
    name: name ?? (kind === "main" ? "Main" : kind === "fb" ? "FB" : "FC"),
    rungs: [newRung(0)],
    interface: kind === "fb" ? { in: [], out: [], static: [] } : { in: [], out: [] },
  };
}

function nextBlockName(blocks, prefix) {
  const used = new Set(blocks.map((b) => b.name));
  let n = 1;
  while (used.has(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
}
export function nextFcName(blocks) {
  return nextBlockName(blocks, "FC");
}
export function nextFbName(blocks) {
  return nextBlockName(blocks, "FB");
}

export function addBlock(blocks, kind = "fc") {
  return [...blocks, newBlock(kind, kind === "fb" ? nextFbName(blocks) : nextFcName(blocks))];
}

export function renameBlock(blocks, blockId, name) {
  return blocks.map((b) => (b.id === blockId ? { ...b, name } : b));
}

export function removeBlock(blocks, blockId) {
  const block = blocks.find((b) => b.id === blockId);
  if (!block || block.kind === "main") return blocks;
  return blocks.filter((b) => b.id !== blockId);
}

export function setBlockRungs(blocks, blockId, rungs) {
  return blocks.map((b) => (b.id === blockId ? { ...b, rungs } : b));
}

export function findBlock(blocks, blockId) {
  return blocks.find((b) => b.id === blockId);
}

function newParam(name) {
  return { id: genParamId(), name };
}

export function addParam(blocks, blockId, direction, name) {
  return blocks.map((b) =>
    b.id === blockId
      ? { ...b, interface: { ...b.interface, [direction]: [...b.interface[direction], newParam(name)] } }
      : b
  );
}

export function renameParam(blocks, blockId, direction, paramId, name) {
  return blocks.map((b) =>
    b.id === blockId
      ? {
          ...b,
          interface: {
            ...b.interface,
            [direction]: b.interface[direction].map((p) => (p.id === paramId ? { ...p, name } : p)),
          },
        }
      : b
  );
}

export function removeParam(blocks, blockId, direction, paramId) {
  const next = blocks.map((b) =>
    b.id === blockId
      ? { ...b, interface: { ...b.interface, [direction]: b.interface[direction].filter((p) => p.id !== paramId) } }
      : b
  );
  return pruneOrphanWiring(next);
}

// ¿Llamar desde `callerId` a `calleeId` cerraría un ciclo en el grafo de
// llamadas? Recorre, para cada rung de tipo "call" del grafo actual (más la
// arista hipotética callerId->calleeId), si desde calleeId se puede volver a
// alcanzar callerId.
export function wouldCreateCycle(blocks, callerId, calleeId) {
  if (callerId === calleeId) return true;
  const edges = new Map(); // blockId -> Set<blockId>
  blocks.forEach((b) => {
    const set = new Set();
    b.rungs.forEach((r) => {
      if (r.outType === "call") {
        if (r.callTarget) set.add(r.callTarget);
        if (Array.isArray(r.calls)) {
          r.calls.forEach((c) => {
            if (c.callTarget) set.add(c.callTarget);
          });
        }
      }
    });
    edges.set(b.id, set);
  });
  const existing = edges.get(callerId) || new Set();
  edges.set(callerId, new Set([...existing, calleeId]));

  const visited = new Set();
  const stack = [calleeId];
  while (stack.length) {
    const cur = stack.pop();
    if (cur === callerId) return true;
    if (visited.has(cur)) continue;
    visited.add(cur);
    (edges.get(cur) || new Set()).forEach((next) => stack.push(next));
  }
  return false;
}

export function validCallTargets(blocks, callerId) {
  return blocks.filter((b) => (b.kind === "fc" || b.kind === "fb") && !wouldCreateCycle(blocks, callerId, b.id));
}

export function isBlockCalled(blocks, blockId) {
  return blocks.some(
    (b) =>
      b.id !== blockId &&
      b.rungs.some((r) => {
        if (r.outType !== "call") return false;
        if (r.callTarget === blockId) return true;
        if (Array.isArray(r.calls) && r.calls.some((c) => c.callTarget === blockId)) return true;
        return false;
      })
  );
}

// Limpia entradas de paramWiring cuyo paramId ya no existe en la interfaz
// (in+out) del callTarget correspondiente — se invoca automáticamente desde
// removeParam para que quien lo use no tenga que acordarse de encadenar las
// dos operaciones.
export function pruneOrphanWiring(blocks) {
  const byId = new Map(blocks.map((b) => [b.id, b]));
  return blocks.map((b) => ({
    ...b,
    rungs: b.rungs.map((r) => {
      if (r.outType !== "call") return r;
      let nextRung = { ...r };
      if (r.paramWiring) {
        const target = byId.get(r.callTarget);
        const validIds = new Set(target ? [...target.interface.in, ...target.interface.out].map((p) => p.id) : []);
        nextRung.paramWiring = Object.fromEntries(
          Object.entries(r.paramWiring).filter(([paramId]) => validIds.has(paramId))
        );
      }
      if (Array.isArray(r.calls)) {
        nextRung.calls = r.calls.map((c) => {
          if (!c.paramWiring) return c;
          const target = byId.get(c.callTarget);
          const validIds = new Set(target ? [...target.interface.in, ...target.interface.out].map((p) => p.id) : []);
          return {
            ...c,
            paramWiring: Object.fromEntries(
              Object.entries(c.paramWiring).filter(([paramId]) => validIds.has(paramId))
            ),
          };
        });
      }
      return nextRung;
    }),
  }));
}
