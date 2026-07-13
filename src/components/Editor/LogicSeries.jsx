import React from "react";
import { T, INPUT_ADDR, OUTPUT_ADDR } from "../../utils/constants";
import { TiaLine, TiaContact } from "./TiaGraphics";
import { TiaSelect, TiaMiniBtn } from "./TiaControls";
import { BRANCH_H, BRANCH_GAP, STEP } from "./parallelGeometry";

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
                  onClick={() => actions.updateContact(n.id, { neg: !n.neg })}
                  style={{ cursor: "pointer" }} title="Click para alternar NA/NC"
                >
                  <TiaContact neg={n.neg} stateObj={{ ...nodeState, flowIn: prevFlow }} />
                </div>
                {nodes.length > 1 && (
                  <button onClick={() => actions.removeNode(n.id)} style={{ position: "absolute", bottom: -15, fontSize: 10, color: "red", border: "none", background: "none", cursor: "pointer" }}>✕</button>
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
         <button onClick={() => actions.removeNode(node.id)} style={{ position: "absolute", top: -6, left: -6, color: "red", background: "none", border: "none", cursor: "pointer", fontSize: 12 }}>✕</button>
      )}
    </div>
  );
}
