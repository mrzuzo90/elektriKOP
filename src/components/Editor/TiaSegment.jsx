import { T, OUTPUT_ADDR } from "../../utils/constants";
import {
  newContactNode,
  newParallelNode,
  countContacts,
  mapContainer,
  removeNodeEverywhere,
  updateContactEverywhere,
  addBranchToParallel,
  removeBranchFromParallel,
} from "../../utils/ladderTree";
import { TiaCoil, TiaSetReset, TiaTonBox } from "./TiaGraphics";
import { TiaSelect } from "./TiaControls";
import { LogicSeries } from "./LogicSeries";

export default function TiaSegment({ rung, onChange, onDelete, evalResult, canDelete, symbols }) {
  const actions = {
    totalContacts: () => countContacts(rung.logic),
    addContact: (containerId) => onChange({ ...rung, logic: mapContainer(rung.logic, containerId, (nodes) => [...nodes, newContactNode()]) }),
    addParallel: (containerId) => onChange({ ...rung, logic: mapContainer(rung.logic, containerId, (nodes) => [...nodes, newParallelNode()]) }),
    removeNode: (nodeId) => onChange({ ...rung, logic: removeNodeEverywhere(rung.logic, nodeId) }),
    updateContact: (contactId, patch) => onChange({ ...rung, logic: updateContactEverywhere(rung.logic, contactId, patch) }),
    addBranch: (parallelId) => onChange({ ...rung, logic: addBranchToParallel(rung.logic, parallelId) }),
    removeBranch: (parallelId, branchId) => onChange({ ...rung, logic: removeBranchFromParallel(rung.logic, parallelId, branchId) }),
  };

  // Determine final flow reaching the output
  let flowToOut = true;
  rung.logic.forEach(n => {
     flowToOut = flowToOut && evalResult?.states?.[n.id]?.state;
  });

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
              width: 120,
              fontWeight: "bold",
              fontSize: 16,
              color: T.tiaText,
              fontFamily: T.mono,
              outline: "none",
              padding: "2px 0",
            }}
            title="Clic para renombrar el segmento"
          />
          <span style={{ color: T.tiaText }}>:</span>
          <input
            value={rung.comment}
            onChange={(e) => onChange({...rung, comment: e.target.value})}
            className="dw-edit-field dw-edit-field-dark"
            style={{ width: 300, fontStyle: "italic", color: "#555", fontFamily: T.mono, fontSize: 16, outline: "none", padding: "2px 0" }}
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

        <LogicSeries containerId="root" nodes={rung.logic} states={evalResult?.states || {}} actions={actions} depth={0} flowIn={true} symbols={symbols} />

        {/* Main Line connecting to Output — envuelta en una caja de 30px
            para que la barra quede centrada a 15px, igual que el resto. */}
        <div style={{ flex: 1, minWidth: 40, height: 30, display: "flex", alignItems: "center" }}>
          <div style={{ width: "100%", height: 3, backgroundColor: flowToOut ? T.tiaLineActive : T.tiaLine }} />
        </div>

        {/* Output Device */}
        <div style={{ position: "relative", marginRight: 8, display: "flex", alignItems: "center" }}>
          {rung.outType === "ton" ? (
             <TiaTonBox active={evalResult?.outputState} flowIn={flowToOut} preset={rung.preset} elapsed={evalResult?.timerElapsed} />
          ) : rung.outType === "set" || rung.outType === "reset" ? (
             <TiaSetReset active={evalResult?.outputState} flowIn={flowToOut} type={rung.outType} />
          ) : (
             <TiaCoil active={evalResult?.outputState} flowIn={flowToOut} />
          )}
          <TiaSelect value={rung.outAddr} onChange={(v) => onChange({ ...rung, outAddr: v })} options={OUTPUT_ADDR} isOut={true} symbols={symbols} />
        </div>

        {/* Right Power Rail */}
        <div style={{ width: 4, backgroundColor: T.tiaLine, alignSelf: "stretch", marginLeft: 4 }} />
      </div>

      {/* Output Type Selector / Footer */}
      <div style={{ backgroundColor: "#F9F9F9", borderTop: "1px solid #EEE", padding: "4px 8px", display: "flex", gap: 12, fontSize: 14 }}>
         <label style={{ display: "flex", alignItems: "center", gap: 4, color: T.tiaText, cursor: "pointer" }}>
            <input type="radio" checked={rung.outType === "coil"} onChange={() => onChange({...rung, outType: "coil"})} />
            Bobina -( )
         </label>
         <label style={{ display: "flex", alignItems: "center", gap: 4, color: T.tiaText, cursor: "pointer" }}>
            <input type="radio" checked={rung.outType === "set"} onChange={() => onChange({...rung, outType: "set"})} />
            Set -(S)
         </label>
         <label style={{ display: "flex", alignItems: "center", gap: 4, color: T.tiaText, cursor: "pointer" }}>
            <input type="radio" checked={rung.outType === "reset"} onChange={() => onChange({...rung, outType: "reset"})} />
            Reset -(R)
         </label>
         <label style={{ display: "flex", alignItems: "center", gap: 4, color: T.tiaText, cursor: "pointer" }}>
            <input type="radio" checked={rung.outType === "ton"} onChange={() => onChange({...rung, outType: "ton"})} />
            Temp TON
         </label>
         {rung.outType === "ton" && (
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
