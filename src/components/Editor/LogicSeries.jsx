import React from "react";
import { T, INPUT_ADDR, OUTPUT_ADDR } from "../../utils/constants";
import { TiaLine, TiaContact } from "./TiaGraphics";
import { TiaSelect, TiaMiniBtn } from "./TiaControls";
import { BRANCH_H, BRANCH_GAP, STEP } from "./parallelGeometry";

// Un clic en el contacto recorre sus 4 variantes: NA → NC → flanco P
// (subida) → flanco N (bajada) → NA. neg y edge son mutuamente excluyentes.
function cycleContactMode(n) {
  if (!n.neg && !n.edge) return { neg: true, edge: null };
  if (n.neg) return { neg: false, edge: "P" };
  if (n.edge === "P") return { neg: false, edge: "N" };
  return { neg: false, edge: null };
}
function contactModeTitle(n) {
  if (n.edge === "P") return "Flanco positivo (P) — clic para pasar a flanco N";
  if (n.edge === "N") return "Flanco negativo (N) — clic para volver a NA";
  if (n.neg) return "Normalmente cerrado (NC) — clic para pasar a flanco P";
  return "Normalmente abierto (NA) — clic para pasar a NC";
}

export function LogicSeries({ containerId, nodes, states, actions, depth, flowIn, symbols }) {
  let currentFlow = flowIn;

  return (
    // flex-start: todo elemento de la escalera (contacto, TiaLine, bloque
    // paralelo) tiene su cable a 15px de su propio borde superior, así
    // que alineando arriba todo cae en la misma Y sin importar cuánto
    // crezca verticalmente un bloque paralelo con varias ramas.
    <div style={{ display: "flex", alignItems: "flex-start" }}>
      {nodes.map((n, idx) => {
        const nodeState = states[n.id];
        const prevFlow = currentFlow;
        currentFlow = currentFlow && nodeState?.state;

        return (
          <React.Fragment key={n.id}>
            {idx > 0 && <TiaLine active={prevFlow} size={16} />}
            {n.kind === "contact" ? (
              <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", margin: "0 4px" }}>
                <TiaSelect value={n.addr} onChange={(v) => actions.updateContact(n.id, { addr: v })} options={[...INPUT_ADDR, ...OUTPUT_ADDR]} symbols={symbols} />
                <div
                  onClick={() => actions.updateContact(n.id, cycleContactMode(n))}
                  style={{ cursor: "pointer" }} title={contactModeTitle(n)}
                >
                  <TiaContact neg={n.neg} edge={n.edge} stateObj={{ ...nodeState, flowIn: prevFlow }} />
                </div>
                {nodes.length > 1 && (
                  // top/right en vez de bottom: dentro de un bloque paralelo las
                  // ramas van pegadas (BRANCH_GAP=2px) — un botón "bottom:-15"
                  // se cuela en la rama de abajo y queda tapado por sus
                  // elementos. Quedándose dentro de los 30px de alto del propio
                  // contacto (y solo asomando un poco a la derecha, donde sí
                  // sobra hueco horizontal) no invade la fila vecina.
                  <button onClick={() => actions.removeNode(n.id)} title="Eliminar contacto" style={{ position: "absolute", top: 8, right: -10, fontSize: 10, lineHeight: 1, color: "red", border: "none", background: "none", cursor: "pointer", padding: 0 }}>✕</button>
                )}
              </div>
            ) : (
              <ParallelBlock node={n} states={states} actions={actions} removable={nodes.length > 1} depth={depth} flowIn={prevFlow} symbols={symbols} />
            )}
          </React.Fragment>
        );
      })}

      <div style={{ display: "flex", alignSelf: "center", marginLeft: 8 }}>
        <TiaMiniBtn onClick={() => actions.addContact(containerId)} disabled={actions.totalContacts() >= 8}>+C</TiaMiniBtn>
        {depth === 0 && (
          <TiaMiniBtn onClick={() => actions.addParallel(containerId)} disabled={actions.totalContacts() >= 8}>+P</TiaMiniBtn>
        )}
      </div>
    </div>
  );
}

export function ParallelBlock({ node, states, actions, removable, depth, flowIn, symbols }) {
  const branches = node.branches;
  // Recorrido vertical de los rieles: de la rama 0 (arriba) a la última.
  const railHeight = (branches.length - 1) * STEP;

  return (
    <div style={{ position: "relative", margin: "0 4px" }}>
      {/*
        Todo en flujo normal, sin trucos de margen: la rama 0 va primero,
        pegada arriba (su cable cae en Y=15, igual que un contacto suelto),
        y las ramas 1..N se apilan debajo cada STEP px. El ancho del bloque
        sale solo del ancho real de la rama más ancha (no solo de la rama
        0), así que nada de lo que venga después en la fila se solapa con
        una rama inferior más ancha.
      */}
      <div style={{ display: "flex", flexDirection: "column", position: "relative" }}>

        {branches.length > 1 && (
          <div style={{ position: "absolute", left: 0, top: BRANCH_H / 2, height: railHeight, width: 2, backgroundColor: flowIn ? T.tiaLineActive : T.tiaLine }} />
        )}

        {branches.map((br, i) => (
          <div key={br.id} style={{ display: "flex", alignItems: "flex-start", position: "relative", marginTop: i === 0 ? 0 : BRANCH_GAP }}>
            <TiaLine active={flowIn} size={12} />
            <LogicSeries containerId={br.id} nodes={br.nodes} states={states} actions={actions} depth={depth + 1} flowIn={flowIn} symbols={symbols} />
            <TiaLine active={states[br.id]?.flowOut || false} size={12} />
            {branches.length > 2 && (
              <button onClick={() => actions.removeBranch(node.id, br.id)} style={{ alignSelf: "center", color: "red", background: "none", border: "none", cursor: "pointer", fontSize: 12 }}>✕</button>
            )}
          </div>
        ))}

        {branches.length > 1 && (
          <div style={{ position: "absolute", right: 0, top: BRANCH_H / 2, height: railHeight, width: 2, backgroundColor: T.tiaLine }} />
        )}

        <div style={{ paddingLeft: 12, marginTop: 4 }}>
          <TiaMiniBtn onClick={() => actions.addBranch(node.id)} disabled={branches.length >= 4}>+Rama</TiaMiniBtn>
        </div>
      </div>
      {removable && (
         // top:6/left:-14 en vez de top:-6/left:-6: ese hueco de arriba es
         // justo donde cae el desplegable de dirección (top:-20) del primer
         // contacto de CUALQUIER rama, incluida la segunda (que por el
         // BRANCH_GAP tan ajustado queda casi a la misma altura que el
         // borde superior del bloque) — se solapaban. Metiéndolo dentro de
         // la fila de la rama 1 pero más a la izquierda (antes de donde
         // empieza el primer contacto) no coincide con ningún desplegable.
         <button onClick={() => actions.removeNode(node.id)} title="Eliminar bloque paralelo" style={{ position: "absolute", top: 6, left: -14, color: "red", background: "none", border: "none", cursor: "pointer", fontSize: 12, lineHeight: 1, padding: 0 }}>✕</button>
      )}
    </div>
  );
}
