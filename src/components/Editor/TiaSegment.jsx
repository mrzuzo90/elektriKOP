import { useRef, useState } from "react";
import { T } from "../../utils/constants";
import {
  newContactNode,
  newCompareNode,
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
import { TiaCoil, TiaSetReset, TiaTonBox, TiaSrBox } from "./TiaGraphics";
import { TiaSelect, TiaInstructionBtn } from "./TiaControls";
import { LogicSeries } from "./LogicSeries";
import TiaCallBox from "./TiaCallBox";
import TiaCounterBox from "./TiaCounterBox";
import { findBlock, validCallTargets } from "../../utils/blocks";

const OUT_TYPES = [
  { value: "coil", label: "Bobina", sub: "-( )-" },
  { value: "set", label: "Set", sub: "-(S)-" },
  { value: "reset", label: "Reset", sub: "-(R)-" },
  { value: "sr", label: "SR", sub: "S / R1" },
  { value: "ton", label: "Temp", sub: "TON" },
  { value: "tof", label: "Temp", sub: "TOF" },
  { value: "tp", label: "Temp", sub: "TP" },
  { value: "ctu", label: "Cont.", sub: "CTU" },
  { value: "ctd", label: "Cont.", sub: "CTD" },
  { value: "call", label: "Llamar", sub: "CALL" },
];

const isSrFamily = (outType) => outType === "sr" || outType === "rs";

// Fábrica de acciones de edición del árbol lógico, parametrizada por el
// campo del rung sobre el que operan ("logic" para la red normal / la
// entrada S del bloque SR, "logicR" para la entrada R1) — los helpers de
// ladderTree.js ya son puros sobre un array de nodos, así que no hace
// falta duplicarlos, solo indicar a cuál de los dos escribir.
function makeActions(rung, onChange, field) {
  return {
    totalContacts: () => countContacts(rung[field]),
    addContact: (containerId) => onChange({ ...rung, [field]: mapContainer(rung[field], containerId, (nodes) => [...nodes, newContactNode()]) }),
    addCompare: (containerId) => onChange({ ...rung, [field]: mapContainer(rung[field], containerId, (nodes) => [...nodes, newCompareNode()]) }),
    addParallel: (containerId) => onChange({ ...rung, [field]: mapContainer(rung[field], containerId, (nodes) => [...nodes, newParallelNode()]) }),
    insertContact: (containerId, index) => onChange({ ...rung, [field]: insertNodeAt(rung[field], containerId, index, newContactNode()) }),
    insertCompare: (containerId, index) => onChange({ ...rung, [field]: insertNodeAt(rung[field], containerId, index, newCompareNode()) }),
    insertParallel: (containerId, index) => onChange({ ...rung, [field]: insertNodeAt(rung[field], containerId, index, newParallelNode()) }),
    moveNode: (nodeId, containerId, index) => onChange({ ...rung, [field]: moveNode(rung[field], nodeId, containerId, index) }),
    removeNode: (nodeId) => onChange({ ...rung, [field]: removeNodeEverywhere(rung[field], nodeId) }),
    updateContact: (contactId, patch) => onChange({ ...rung, [field]: updateContactEverywhere(rung[field], contactId, patch) }),
    addBranch: (parallelId) => onChange({ ...rung, [field]: addBranchToParallel(rung[field], parallelId) }),
    removeBranch: (parallelId, branchId) => onChange({ ...rung, [field]: removeBranchFromParallel(rung[field], parallelId, branchId) }),
  };
}

// Drag&drop nativo HTML5 de UNA red de contactos (mover nodo existente /
// insertar contacto o paralelo nuevo). Se instancia una vez por red —
// TiaSegment siempre crea dos (S y R1) para poder tener hooks
// incondicionales, aunque solo un bloque SR/RS use la segunda.
// kind ("contact" | "compare" | "parallel") -> { dragKind, insertAction } —
// única fuente de verdad para qué botón/drag corresponde a qué acción de
// inserción, así que añadir un tipo nuevo de nodo arrastrable (como
// "compare") no obliga a tocar cada rama de active/startNewDrag/dropAt.
const NEW_NODE_KINDS = {
  contact: { dragKind: "new-contact", insert: "insertContact" },
  compare: { dragKind: "new-compare", insert: "insertCompare" },
  parallel: { dragKind: "new-parallel", insert: "insertParallel" },
};

function useLogicDnd(actions) {
  const [dragKind, setDragKind] = useState(null); // null | 'move' | 'new-contact' | 'new-compare' | 'new-parallel'
  const payloadRef = useRef(null);
  return {
    active: dragKind !== null,
    startNodeDrag: (nodeId) => (e) => {
      payloadRef.current = { type: "move", nodeId };
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", nodeId);
      setDragKind("move");
    },
    startNewDrag: (kind) => (e) => {
      const { dragKind: dk } = NEW_NODE_KINDS[kind];
      payloadRef.current = { type: dk };
      e.dataTransfer.effectAllowed = "copy";
      e.dataTransfer.setData("text/plain", kind);
      setDragKind(dk);
    },
    endDrag: () => {
      payloadRef.current = null;
      setDragKind(null);
    },
    dropAt: (containerId, index) => {
      const payload = payloadRef.current;
      const newKind = Object.values(NEW_NODE_KINDS).find((k) => k.dragKind === payload?.type);
      if (payload?.type === "move") actions.moveNode(payload.nodeId, containerId, index);
      else if (newKind && actions.totalContacts() < 8) actions[newKind.insert](containerId, index);
      payloadRef.current = null;
      setDragKind(null);
    },
  };
}

export default function TiaSegment({ rung, onChange, onDelete, evalResult, canDelete, symbols, addrOptions, analogAddrOptions, outputAddrOptions, blocks = [], currentBlockId }) {
  const actionsS = makeActions(rung, onChange, "logic");
  const actionsR = makeActions(rung, onChange, "logicR");
  const dndS = useLogicDnd(actionsS);
  const dndR = useLogicDnd(actionsR);

  // Cambia la instrucción de salida del rung. Al entrar en la familia
  // SR/RS por primera vez inicializa logicR (red de R1, vacía hasta
  // entonces porque el resto de instrucciones no la usan) — y si ya se
  // estaba en esa familia (p.ej. en "rs"), un clic repetido en el botón
  // "SR" de la paleta no debe resetear la prioridad elegida: eso solo lo
  // hace el toggle de la propia caja (ver TiaSrBox.onToggle más abajo).
  const changeOutType = (newType) => {
    if (newType === "sr" && isSrFamily(rung.outType)) return;
    const patch = { ...rung, outType: newType };
    if (newType === "sr" && !rung.logicR) patch.logicR = [newContactNode()];
    onChange(patch);
  };

  // Estado de arrastre del "tipo de salida" (Bobina/SET/RESET/SR/TON...),
  // independiente del arrastre de contactos dentro de cada red — activa
  // solo la zona de aterrizaje de la salida, no el esquema lógico.
  const [outTypeDragActive, setOutTypeDragActive] = useState(false);
  const outTypePayloadRef = useRef(null);
  const [outputOver, setOutputOver] = useState(false);

  const outTypeDnd = {
    startDrag: (type) => (e) => {
      outTypePayloadRef.current = type;
      e.dataTransfer.effectAllowed = "copy";
      e.dataTransfer.setData("text/plain", type);
      setOutTypeDragActive(true);
    },
    endDrag: () => {
      outTypePayloadRef.current = null;
      setOutTypeDragActive(false);
      setOutputOver(false);
    },
    drop: () => {
      const payload = outTypePayloadRef.current;
      if (payload) changeOutType(payload);
      outTypePayloadRef.current = null;
      setOutTypeDragActive(false);
      setOutputOver(false);
    },
  };

  // Flujo de corriente que llega a la salida (o, en un bloque SR, a cada
  // uno de sus dos pines de entrada).
  let flowToOut = true;
  rung.logic.forEach(n => {
     flowToOut = flowToOut && evalResult?.states?.[n.id]?.state;
  });
  let flowR = true;
  (rung.logicR || []).forEach(n => {
     flowR = flowR && evalResult?.states?.[n.id]?.state;
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
      {isSrFamily(rung.outType) ? (
        /* Bloque SR/RS combinado: a diferencia de cualquier otra
           instrucción (una sola red de entrada → una salida), este tiene
           DOS redes independientes (S y R1) confluyendo en la misma caja
           — así que en vez de una fila, son dos apiladas, cada una con su
           propio riel+lógica+línea de entrada, y la caja SR centrada a la
           derecha abarcando ambas. */
        <div style={{ padding: "20px 10px", display: "flex", alignItems: "center", overflowX: "auto" }}>
          <div style={{ width: 4, backgroundColor: T.tiaLine, alignSelf: "stretch", marginRight: 4 }} />

          <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
            {/* Fila S */}
            <div style={{ display: "flex", alignItems: "flex-start" }}>
              <LogicSeries containerId="root" nodes={rung.logic} states={evalResult?.states || {}} actions={actionsS} depth={0} flowIn={true} symbols={symbols} addrOptions={addrOptions} analogAddrOptions={analogAddrOptions} dnd={dndS} />
              <div style={{ flex: 1, minWidth: 20, height: 30, display: "flex", alignItems: "center" }}>
                <div style={{ width: "100%", height: 3, backgroundColor: flowToOut ? T.tiaLineActive : T.tiaLine }} />
              </div>
            </div>
            {/* Fila R1 */}
            <div style={{ display: "flex", alignItems: "flex-start" }}>
              <LogicSeries containerId="root" nodes={rung.logicR || []} states={evalResult?.states || {}} actions={actionsR} depth={0} flowIn={true} symbols={symbols} addrOptions={addrOptions} analogAddrOptions={analogAddrOptions} dnd={dndR} />
              <div style={{ flex: 1, minWidth: 20, height: 30, display: "flex", alignItems: "center" }}>
                <div style={{ width: "100%", height: 3, backgroundColor: flowR ? T.tiaLineActive : T.tiaLine }} />
              </div>
            </div>
          </div>

          {/* Caja SR + salida, misma zona de aterrizaje para arrastrar un
              tipo de salida distinto (ver outTypeDnd.drop). */}
          <div
            style={{ position: "relative", display: "flex", alignItems: "center", marginRight: 8 }}
            onDragOver={outTypeDragActive ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; setOutputOver(true); } : undefined}
            onDragLeave={outTypeDragActive ? () => setOutputOver(false) : undefined}
            onDrop={outTypeDragActive ? (e) => { e.preventDefault(); outTypeDnd.drop(); } : undefined}
          >
            {outTypeDragActive && (
              <div
                style={{
                  position: "absolute", inset: "-6px -4px", zIndex: 2, pointerEvents: "none",
                  border: `2px dashed ${outputOver ? T.tiaLineActive : T.dwGrey}`,
                  backgroundColor: outputOver ? "rgba(0,176,80,0.12)" : "rgba(0,0,0,0.03)",
                }}
              />
            )}
            <TiaSrBox
              sFlow={flowToOut}
              rFlow={flowR}
              active={evalResult?.outputState}
              priority={rung.outType}
              onToggle={() => onChange({ ...rung, outType: rung.outType === "sr" ? "rs" : "sr" })}
            />
            <TiaSelect value={rung.outAddr} onChange={(v) => onChange({ ...rung, outAddr: v })} options={outputAddrOptions} isOut={true} symbols={symbols} />
          </div>

          <div style={{ width: 4, backgroundColor: T.tiaLine, alignSelf: "stretch", marginLeft: 4 }} />
        </div>
      ) : (
      <div style={{ padding: "30px 10px", display: "flex", alignItems: "flex-start", overflowX: "auto" }}>

        {/* Left Power Rail */}
        <div style={{ width: 4, backgroundColor: T.tiaLine, alignSelf: "stretch", marginRight: 4 }} />

        <LogicSeries containerId="root" nodes={rung.logic} states={evalResult?.states || {}} actions={actionsS} depth={0} flowIn={true} symbols={symbols} addrOptions={addrOptions} analogAddrOptions={analogAddrOptions} dnd={dndS} />

        {/* Main Line + Output Device, agrupados en una única zona de
            aterrizaje: soltar aquí un tipo de salida arrastrado desde la
            barra inferior (Bobina/SET/RESET/TON...) equivale a hacer clic
            en su botón — ver outTypeDnd.drop.
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
          onDrop={outTypeDragActive ? (e) => { e.preventDefault(); outTypeDnd.drop(); } : undefined}
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
            ) : rung.outType === "ctu" || rung.outType === "ctd" ? (
               <TiaCounterBox
                 rung={rung}
                 onChangeResetAddr={(v) => onChange({ ...rung, resetAddr: v })}
                 addrOptions={addrOptions}
                 symbols={symbols}
                 active={evalResult?.outputState}
                 flowIn={flowToOut}
                 count={evalResult?.counterValue}
               />
            ) : rung.outType === "set" || rung.outType === "reset" ? (
               <TiaSetReset
                 active={evalResult?.outputState}
                 flowIn={flowToOut}
                 type={rung.outType}
                 onToggle={() => onChange({ ...rung, outType: rung.outType === "set" ? "reset" : "set" })}
               />
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
      )}

      {/* Output Type Selector / Footer — botones tipo botonera de cassette:
          clic para elegir, o arrastrar cualquiera hasta la zona de salida
          del segmento (misma zona resaltada arriba, outTypeDnd.drop). */}
      <div style={{ backgroundColor: "#F9F9F9", borderTop: "1px solid #EEE", padding: "8px", display: "flex", gap: 8, fontSize: 14, flexWrap: "wrap", alignItems: "center" }}>
         {OUT_TYPES.map((t) => (
            <TiaInstructionBtn
               key={t.value}
               active={t.value === "sr" ? isSrFamily(rung.outType) : rung.outType === t.value}
               onClick={() => changeOutType(t.value)}
               draggable
               onDragStart={outTypeDnd.startDrag(t.value)}
               onDragEnd={outTypeDnd.endDrag}
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
         {(rung.outType === "ctu" || rung.outType === "ctd") && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
               <span style={{color: T.tiaText}}>PV (cuenta):</span>
               <input
                  type="number" min={1} max={999} value={rung.preset}
                  onChange={(e) => onChange({...rung, preset: Number(e.target.value) || 1})}
                  style={{ width: 50, fontFamily: T.mono, fontSize: 14, textAlign: "center" }}
               />
            </div>
         )}
      </div>
    </div>
  );
}
