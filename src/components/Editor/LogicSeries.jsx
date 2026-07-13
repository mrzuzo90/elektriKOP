import React from "react";
import { T, INPUT_ADDR, OUTPUT_ADDR } from "../../utils/constants";
import { TiaLine, TiaContact } from "./TiaGraphics";
import { TiaSelect, TiaMiniBtn } from "./TiaControls";

export function LogicSeries({ containerId, nodes, states, actions, depth, flowIn, symbols }) {
  let currentFlow = flowIn;

  return (
    <div style={{ display: "flex", alignItems: "center" }}>
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

      <div style={{ display: "flex", marginLeft: 8 }}>
        <TiaMiniBtn onClick={() => actions.addContact(containerId)} disabled={actions.totalContacts() >= 8}>+C</TiaMiniBtn>
        {depth === 0 && (
          <TiaMiniBtn onClick={() => actions.addParallel(containerId)} disabled={actions.totalContacts() >= 8}>+P</TiaMiniBtn>
        )}
      </div>
    </div>
  );
}

export function ParallelBlock({ node, states, actions, removable, depth, flowIn, symbols }) {
  return (
    <div style={{ display: "flex", alignItems: "center", position: "relative", margin: "0 4px" }}>
      <div style={{ display: "flex", flexDirection: "column", position: "relative" }}>

        {/* Left vertical rail of parallel group */}
        <div style={{ position: "absolute", left: 0, top: 15, bottom: 15, width: 2, backgroundColor: flowIn ? T.tiaLineActive : T.tiaLine }} />

        {node.branches.map((br) => {
          return (
            <div key={br.id} style={{ display: "flex", alignItems: "center", padding: "10px 0", position: "relative" }}>
              <TiaLine active={flowIn} size={12} />
              <LogicSeries containerId={br.id} nodes={br.nodes} states={states} actions={actions} depth={depth + 1} flowIn={flowIn} symbols={symbols} />
              <TiaLine active={states[br.id]?.flowOut || false} size={12} />
              {/* Note: Simplified parallel reconnect visual. True TIA Portal draws right rail perfectly, we do our best with flexbox */}

              {node.branches.length > 2 && (
                <button onClick={() => actions.removeBranch(node.id, br.id)} style={{ color: "red", background: "none", border: "none", cursor: "pointer", fontSize: 12 }}>✕</button>
              )}
            </div>
          );
        })}

        {/* Right vertical rail */}
        <div style={{ position: "absolute", right: 0, top: 15, bottom: 15, width: 2, backgroundColor: T.tiaLine }} />

        <div style={{ paddingLeft: 12 }}>
          <TiaMiniBtn onClick={() => actions.addBranch(node.id)} disabled={node.branches.length >= 4}>+Rama</TiaMiniBtn>
        </div>
      </div>
      {removable && (
         <button onClick={() => actions.removeNode(node.id)} style={{ position: "absolute", bottom: -5, left: -5, color: "red", background: "none", border: "none", cursor: "pointer", fontSize: 12 }}>✕</button>
      )}
    </div>
  );
}
