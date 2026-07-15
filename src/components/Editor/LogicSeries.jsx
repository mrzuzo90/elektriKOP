import React, { useState } from "react";
import { T } from "../../utils/constants";
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

// Zona de aterrizaje entre dos posiciones de un contenedor (o al principio
// de uno). Dibuja SIEMPRE el cable que le corresponde (activo/inactivo
// según currentFlow) para que la línea nunca se interrumpa; el marco
// discontinuo solo aparece mientras hay un arrastre en curso, y se resalta
// en verde justo encima de la zona sobre la que está el puntero.
function DropSlot({ dnd, containerId, index, energized, idleSize = 16 }) {
  const [over, setOver] = useState(false);
  if (!dnd.active) {
    return <TiaLine active={energized} size={idleSize} />;
  }
  const width = Math.max(idleSize, 18);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); dnd.dropAt(containerId, index); }}
      style={{ position: "relative", display: "flex", alignItems: "center", height: 30, width, transition: "width 0.1s" }}
    >
      <TiaLine active={energized} size={width} />
      <div
        style={{
          position: "absolute", inset: "4px 1px",
          border: `2px dashed ${over ? T.tiaLineActive : T.dwGrey}`,
          backgroundColor: over ? "rgba(0,176,80,0.15)" : "rgba(0,0,0,0.03)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

// Cola de un contenedor: botones +C/+P (arrastrables como origen de un
// "insertar nuevo") + zona de aterrizaje para "insertar al final". Dibuja
// el cable a todo lo ancho de su propio hueco SIEMPRE (arreglo del bug
// visual: antes esta franja se quedaba sin cable, rompiendo la línea
// continua del segmento en cuanto había sitio para +C/+P).
function TailSlot({ containerId, nodes, depth, actions, dnd, energized }) {
  const [over, setOver] = useState(false);
  const atLimit = actions.totalContacts() >= 8;

  return (
    <div
      onDragOver={dnd.active ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setOver(true); } : undefined}
      onDragLeave={dnd.active ? () => setOver(false) : undefined}
      onDrop={dnd.active ? (e) => { e.preventDefault(); setOver(false); dnd.dropAt(containerId, nodes.length); } : undefined}
      style={{
        position: "relative", display: "flex", alignItems: "center", marginLeft: 4,
        minHeight: 30, minWidth: dnd.active ? 36 : 0, transition: "min-width 0.1s",
      }}
    >
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center" }}>
        <div style={{ width: "100%", height: 3, backgroundColor: energized ? T.tiaLineActive : T.tiaLine, transition: "background-color 0.1s" }} />
      </div>
      {dnd.active && (
        <div
          style={{
            position: "absolute", inset: "4px 1px",
            border: `2px dashed ${over ? T.tiaLineActive : T.dwGrey}`,
            backgroundColor: over ? "rgba(0,176,80,0.15)" : "rgba(0,0,0,0.03)",
            pointerEvents: "none",
          }}
        />
      )}
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 4, zIndex: 1, padding: "0 2px" }}>
        <TiaMiniBtn
          onClick={() => actions.addContact(containerId)} disabled={atLimit}
          draggable={!atLimit} onDragStart={dnd.startNewDrag("contact")} onDragEnd={dnd.endDrag}
          title="Añadir contacto (o arrastrar hasta cualquier posición del esquema)"
        >+C</TiaMiniBtn>
        {depth === 0 && (
          <TiaMiniBtn
            onClick={() => actions.addParallel(containerId)} disabled={atLimit}
            draggable={!atLimit} onDragStart={dnd.startNewDrag("parallel")} onDragEnd={dnd.endDrag}
            title="Añadir bloque paralelo (o arrastrar hasta cualquier posición del esquema)"
          >+P</TiaMiniBtn>
        )}
      </div>
    </div>
  );
}

export function LogicSeries({ containerId, nodes, states, actions, depth, flowIn, symbols, addrOptions, dnd }) {
  let currentFlow = flowIn;

  return (
    // flex-start: todo elemento de la escalera (contacto, TiaLine, bloque
    // paralelo) tiene su cable a 15px de su propio borde superior, así
    // que alineando arriba todo cae en la misma Y sin importar cuánto
    // crezca verticalmente un bloque paralelo con varias ramas.
    <div style={{ display: "flex", alignItems: "flex-start" }}>
      <DropSlot dnd={dnd} containerId={containerId} index={0} energized={flowIn} idleSize={0} />
      {nodes.map((n, idx) => {
        const nodeState = states[n.id];
        const prevFlow = currentFlow;
        currentFlow = currentFlow && nodeState?.state;

        return (
          <React.Fragment key={n.id}>
            {idx > 0 && <DropSlot dnd={dnd} containerId={containerId} index={idx} energized={prevFlow} idleSize={16} />}
            {n.kind === "contact" ? (
              <div
                draggable
                onDragStart={dnd.startNodeDrag(n.id)}
                onDragEnd={dnd.endDrag}
                style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", margin: "0 4px", cursor: "grab" }}
              >
                <span
                  style={{ position: "absolute", top: 8, left: -11, fontSize: 11, lineHeight: 1, color: "#AAA", userSelect: "none" }}
                  title="Arrastrar para mover este contacto"
                >⠿</span>
                <TiaSelect value={n.addr} onChange={(v) => actions.updateContact(n.id, { addr: v })} options={addrOptions} symbols={symbols} />
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
              <ParallelBlock node={n} states={states} actions={actions} removable={nodes.length > 1} depth={depth} flowIn={prevFlow} symbols={symbols} addrOptions={addrOptions} dnd={dnd} />
            )}
          </React.Fragment>
        );
      })}

      <TailSlot containerId={containerId} nodes={nodes} depth={depth} actions={actions} dnd={dnd} energized={currentFlow} />
    </div>
  );
}

export function ParallelBlock({ node, states, actions, removable, depth, flowIn, symbols, addrOptions, dnd }) {
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
            <LogicSeries containerId={br.id} nodes={br.nodes} states={states} actions={actions} depth={depth + 1} flowIn={flowIn} symbols={symbols} addrOptions={addrOptions} dnd={dnd} />
            <TiaLine active={states[br.id]?.flowOut || false} size={12} />
            {branches.length > 2 && (
              <button onClick={() => actions.removeBranch(node.id, br.id)} style={{ alignSelf: "center", color: "red", background: "none", border: "none", cursor: "pointer", fontSize: 12 }}>✕</button>
            )}
          </div>
        ))}

        {branches.length > 1 && (
          <div style={{ position: "absolute", right: 0, top: BRANCH_H / 2, height: railHeight, width: 2, backgroundColor: T.tiaLine }} />
        )}

        <div style={{ paddingLeft: 12, marginTop: 4, display: "flex", alignItems: "center", gap: 10 }}>
          <TiaMiniBtn onClick={() => actions.addBranch(node.id)} disabled={branches.length >= 4}>+Rama</TiaMiniBtn>
          <span
            draggable
            onDragStart={dnd.startNodeDrag(node.id)}
            onDragEnd={dnd.endDrag}
            title="Arrastrar para mover todo el bloque paralelo"
            style={{ cursor: "grab", fontSize: 12, color: "#999", userSelect: "none" }}
          >⠿ mover bloque</span>
        </div>
      </div>
      {removable && (
         // top:6/left:-8 en vez de top:-6/left:-6: ese hueco de arriba es
         // justo donde cae el desplegable de dirección (top:-20) del primer
         // contacto de CUALQUIER rama, incluida la segunda (que por el
         // BRANCH_GAP tan ajustado queda casi a la misma altura que el
         // borde superior del bloque) — se solapaban. Metiéndolo dentro de
         // la fila de la rama 1 pero más a la izquierda (antes de donde
         // empieza el primer contacto) no coincide con ningún desplegable.
         // left ajustado de -14 a -8 (2026-07-15): cuando un contacto suelto
         // precede al bloque paralelo, su propio "✕" (right:-10 dentro de
         // los 4px de margen del contacto) tocaba este botón sin dejar hueco
         // (0px de separación medido con Playwright) — con -8 queda
         // separado, y -8 sigue estando a la izquierda de donde empieza el
         // contenido de cualquier rama, así que el desplegable de dirección
         // sigue sin verse afectado.
         <button onClick={() => actions.removeNode(node.id)} title="Eliminar bloque paralelo" style={{ position: "absolute", top: 6, left: -8, color: "red", background: "none", border: "none", cursor: "pointer", fontSize: 12, lineHeight: 1, padding: 0 }}>✕</button>
      )}
    </div>
  );
}
