import { useRef, useState } from "react";
import { T } from "../../utils/constants";
import {
  newContactNode,
  newParallelNode,
  countContacts,
  mapContainer,
  removeNodeEverywhere,
  updateContactEverywhere,
  addBranchToParallel,
  removeBranchFromParallel,
  insertNodeAt,
  moveNode,
} from "../../utils/ladderTree";
import { TiaCoil, TiaSetReset, TiaTonBox } from "./TiaGraphics";
import { TiaSelect, TiaInstructionBtn } from "./TiaControls";
import { LogicSeries } from "./LogicSeries";
import TiaCallBox from "./TiaCallBox";
import { findBlock, validCallTargets } from "../../utils/blocks";

const OUT_TYPES = [
  { value: "coil", label: "Bobina", sub: "-( )-" },
  { value: "set", label: "Set", sub: "-(S)-" },
  { value: "reset", label: "Reset", sub: "-(R)-" },
  { value: "ton", label: "Temp", sub: "TON" },
  { value: "tof", label: "Temp", sub: "TOF" },
  { value: "tp", label: "Temp", sub: "TP" },
  { value: "call", label: "Llamar", sub: "CALL" },
];

export default function TiaSegment({ rung, onChange, onDelete, evalResult, canDelete, symbols, addrOptions, outputAddrOptions, blocks = [], currentBlockId }) {
  const actions = {
    totalContacts: () => countContacts(rung.logic),
    addContact: (containerId) => onChange({ ...rung, logic: mapContainer(rung.logic, containerId, (nodes) => [...nodes, newContactNode()]) }),
    addParallel: (containerId) => onChange({ ...rung, logic: mapContainer(rung.logic, containerId, (nodes) => [...nodes, newParallelNode()]) }),
    insertContact: (containerId, index) => onChange({ ...rung, logic: insertNodeAt(rung.logic, containerId, index, newContactNode()) }),
    insertParallel: (containerId, index) => onChange({ ...rung, logic: insertNodeAt(rung.logic, containerId, index, newParallelNode()) }),
    moveNode: (nodeId, containerId, index) => onChange({ ...rung, logic: moveNode(rung.logic, nodeId, containerId, index) }),
    removeNode: (nodeId) => onChange({ ...rung, logic: removeNodeEverywhere(rung.logic, nodeId) }),
    updateContact: (contactId, patch) => onChange({ ...rung, logic: updateContactEverywhere(rung.logic, contactId, patch) }),
    addBranch: (parallelId) => onChange({ ...rung, logic: addBranchToParallel(rung.logic, parallelId) }),
    removeBranch: (parallelId, branchId) => onChange({ ...rung, logic: removeBranchFromParallel(rung.logic, parallelId, branchId) }),
  };

  // Estado de arrastre del segmento (drag&drop nativo HTML5, dentro del
  // lienzo de ESTE segmento solamente). dragKind distingue el tipo de
  // payload para saber qué zonas de aterrizaje deben resaltarse: mover un
  // nodo existente o insertar uno nuevo activan las zonas del esquema
  // lógico; arrastrar un tipo de salida activa solo la zona de la bobina.
  const [dragKind, setDragKind] = useState(null); // null | 'move' | 'new-contact' | 'new-parallel' | 'outtype'
  const payloadRef = useRef(null);
  const [outputOver, setOutputOver] = useState(false);

  const dnd = {
    active: dragKind === "move" || dragKind === "new-contact" || dragKind === "new-parallel",
    startNodeDrag: (nodeId) => (e) => {
      payloadRef.current = { type: "move", nodeId };
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", nodeId);
      setDragKind("move");
    },
    startNewDrag: (kind) => (e) => {
      payloadRef.current = { type: kind === "contact" ? "new-contact" : "new-parallel" };
      e.dataTransfer.effectAllowed = "copy";
      e.dataTransfer.setData("text/plain", kind);
      setDragKind(kind === "contact" ? "new-contact" : "new-parallel");
    },
    startOutTypeDrag: (type) => (e) => {
      payloadRef.current = { type: "outtype", value: type };
      e.dataTransfer.effectAllowed = "copy";
      e.dataTransfer.setData("text/plain", type);
      setDragKind("outtype");
    },
    endDrag: () => {
      payloadRef.current = null;
      setDragKind(null);
      setOutputOver(false);
    },
    dropAt: (containerId, index) => {
      const payload = payloadRef.current;
      if (payload?.type === "move") actions.moveNode(payload.nodeId, containerId, index);
      else if (payload?.type === "new-contact" && actions.totalContacts() < 8) actions.insertContact(containerId, index);
      else if (payload?.type === "new-parallel" && actions.totalContacts() < 8) actions.insertParallel(containerId, index);
      payloadRef.current = null;
      setDragKind(null);
    },
    dropOutType: () => {
      const payload = payloadRef.current;
      if (payload?.type === "outtype") onChange({ ...rung, outType: payload.value });
      payloadRef.current = null;
      setDragKind(null);
      setOutputOver(false);
    },
  };
  const outTypeDragActive = dragKind === "outtype";

  // Determine final flow reaching the output
  let flowToOut = true;
  rung.logic.forEach(n => {
     flowToOut = flowToOut && evalResult?.states?.[n.id]?.state;
  });

  const availableCallTargets = validCallTargets(blocks, currentBlockId);
  const callTargetBlock = rung.outType === "call" ? findBlock(blocks, rung.callTarget) : undefined;

  return (
    <div style={{ backgroundColor: T.tiaBg, border: `2px solid ${T.dwBlack}`, boxShadow: "4px 4px 0px 0px rgba(0,0,0,0.25)", marginBottom: 20 }}>
      {/* Header TIA Portal */}
      <div style={{ backgroundColor: T.tiaHeader, padding: "4px 8px", borderBottom: `2px solid ${T.dwBlack}`, display: "flex", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            value={rung.title}
            onChange={(e) => onChange({ ...rung, title: e.target.value })}
            className="dw-edit-field dw-edit-field-dark"
            style={{
              width: 160,
              fontWeight: "bold",
              fontSize: 16,
              color: T.tiaText,
              fontFamily: T.mono,
              outline: "none",
              padding: "2px 0",
            }}
            title={rung.title || "Clic para renombrar el segmento"}
          />
          <span style={{ color: T.tiaText }}>:</span>
          <input
            value={rung.comment}
            onChange={(e) => onChange({...rung, comment: e.target.value})}
            className="dw-edit-field dw-edit-field-dark"
            style={{ width: 380, fontStyle: "italic", color: "#555", fontFamily: T.mono, fontSize: 16, outline: "none", padding: "2px 0" }}
            title={rung.comment}
          />
        </div>
        <div>
          {canDelete && <button onClick={onDelete} style={{ color: "red", cursor: "pointer", border: "none", background: "none", fontSize: 16 }}>🗑️</button>}
        </div>
      </div>

      {/* Rung Logic Area: flex-start, igual que LogicSeries — así la fila
          crece de forma natural para acomodar un bloque paralelo alto, sin
          necesidad de reservar espacio a mano. */}
      <div style={{ padding: "30px 10px", display: "flex", alignItems: "flex-start", overflowX: "auto" }}>

        {/* Left Power Rail */}
        <div style={{ width: 4, backgroundColor: T.tiaLine, alignSelf: "stretch", marginRight: 4 }} />

        <LogicSeries containerId="root" nodes={rung.logic} states={evalResult?.states || {}} actions={actions} depth={0} flowIn={true} symbols={symbols} addrOptions={addrOptions} dnd={dnd} />

        {/* Main Line + Output Device, agrupados en una única zona de
            aterrizaje: soltar aquí un tipo de salida arrastrado desde la
            barra inferior (Bobina/SET/RESET/TON...) equivale a hacer clic
            en su botón — ver dnd.dropOutType.
            alignItems:"flex-start", NUNCA "center": misma convención que el
            resto de la escalera (LogicSeries, ParallelBlock) — el cable de
            cada elemento vive a 15px de SU PROPIO borde superior, así que
            alineando arriba todo cae en la misma Y sin importar cuánto
            crezca hacia abajo una caja TON/TOF/TP (66px) frente a la línea
            simple (30px). Con "center" la línea principal quedaba
            centrada en la altura total de la fila (66px con un temporizador
            de salida) en vez de a 15px fijos, desalineándose ~18px del
            conector de entrada real de la caja. */}
        <div
          style={{ flex: 1, display: "flex", alignItems: "flex-start", position: "relative" }}
          onDragOver={outTypeDragActive ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; setOutputOver(true); } : undefined}
          onDragLeave={outTypeDragActive ? () => setOutputOver(false) : undefined}
          onDrop={outTypeDragActive ? (e) => { e.preventDefault(); dnd.dropOutType(); } : undefined}
        >
          {outTypeDragActive && (
            <div
              style={{
                position: "absolute", inset: "2px 4px", zIndex: 2, pointerEvents: "none",
                border: `2px dashed ${outputOver ? T.tiaLineActive : T.dwGrey}`,
                backgroundColor: outputOver ? "rgba(0,176,80,0.12)" : "rgba(0,0,0,0.03)",
              }}
            />
          )}

          {/* Main Line connecting to Output — envuelta en una caja de 30px
              para que la barra quede centrada a 15px, igual que el resto. */}
          <div style={{ flex: 1, minWidth: 40, height: 30, display: "flex", alignItems: "center" }}>
            <div style={{ width: "100%", height: 3, backgroundColor: flowToOut ? T.tiaLineActive : T.tiaLine }} />
          </div>

          {/* Output Device */}
          <div style={{ position: "relative", marginRight: 8, display: "flex", alignItems: "center" }}>
            {rung.outType === "call" ? (
              <TiaCallBox
                rung={rung}
                targetBlock={callTargetBlock}
                availableTargets={availableCallTargets}
                onChangeTarget={(blockId) => onChange({ ...rung, callTarget: blockId, paramWiring: {} })}
                onChangeWiring={(paramId, addr) => onChange({ ...rung, paramWiring: { ...(rung.paramWiring || {}), [paramId]: addr } })}
                addrOptions={addrOptions}
                symbols={symbols}
                flowIn={flowToOut}
              />
            ) : rung.outType === "ton" || rung.outType === "tof" || rung.outType === "tp" ? (
               <TiaTonBox active={evalResult?.outputState} flowIn={flowToOut} preset={rung.preset} elapsed={evalResult?.timerElapsed} label={rung.outType.toUpperCase()} />
            ) : rung.outType === "set" || rung.outType === "reset" ? (
               <TiaSetReset active={evalResult?.outputState} flowIn={flowToOut} type={rung.outType} />
            ) : (
               <TiaCoil active={evalResult?.outputState} flowIn={flowToOut} />
            )}
            {rung.outType !== "call" && (
              <TiaSelect value={rung.outAddr} onChange={(v) => onChange({ ...rung, outAddr: v })} options={outputAddrOptions} isOut={true} symbols={symbols} />
            )}
          </div>
        </div>

        {/* Right Power Rail */}
        <div style={{ width: 4, backgroundColor: T.tiaLine, alignSelf: "stretch", marginLeft: 4 }} />
      </div>

      {/* Output Type Selector / Footer — botones tipo botonera de cassette:
          clic para elegir, o arrastrar cualquiera hasta la zona de salida
          del segmento (misma zona resaltada arriba, dnd.dropOutType). */}
      <div style={{ backgroundColor: "#F9F9F9", borderTop: "1px solid #EEE", padding: "8px", display: "flex", gap: 8, fontSize: 14, flexWrap: "wrap", alignItems: "center" }}>
         {OUT_TYPES.map((t) => (
            <TiaInstructionBtn
               key={t.value}
               active={rung.outType === t.value}
               onClick={() => onChange({ ...rung, outType: t.value })}
               draggable
               onDragStart={dnd.startOutTypeDrag(t.value)}
               onDragEnd={dnd.endDrag}
               label={t.label}
               sub={t.sub}
               title={`${t.label} ${t.sub} — clic para elegir, o arrastrar hasta la salida del segmento`}
            />
         ))}
         {(rung.outType === "ton" || rung.outType === "tof" || rung.outType === "tp") && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
               <span style={{color: T.tiaText}}>PT (segs):</span>
               <input
                  type="number" min={1} max={30} value={rung.preset}
                  onChange={(e) => onChange({...rung, preset: Number(e.target.value) || 1})}
                  style={{ width: 50, fontFamily: T.mono, fontSize: 14, textAlign: "center" }}
               />
            </div>
         )}
      </div>
    </div>
  );
}
