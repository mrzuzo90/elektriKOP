import { T } from "../../utils/constants";
import { TiaLine } from "./TiaGraphics";
import { PinWiringSelect } from "./TiaCallBox";

// Instrucción CTU/CTD: mismo lenguaje visual de "caja" que TiaTonBox, con
// una fila extra para el pin de Reset (CTU) / Carga (CTD) — un pin cableado
// a una dirección, mismo mecanismo (y mismo control PinWiringSelect) que ya
// usan los pines IN/OUT de "Llamar a bloque". CV (el conteo actual) es un
// número interno mostrado como texto, igual que PT/ET de un temporizador —
// no es una dirección direccionable, no hace falta memoria numérica.
export default function TiaCounterBox({ rung, onChangeResetAddr, addrOptions, symbols, active, flowIn, count }) {
  const color = active && flowIn ? T.tiaLineActive : T.tiaLine;
  const label = rung.outType === "ctu" ? "CTU" : "CTD";
  const resetLabel = rung.outType === "ctu" ? "R" : "LD";
  const pulseLabel = rung.outType === "ctu" ? "CU" : "CD";

  return (
    <div style={{ display: "flex", alignItems: "flex-start" }}>
      <TiaLine active={flowIn} size={8} />
      <div
        style={{
          border: `3px solid ${color}`,
          backgroundColor: "#FFF",
          width: 96,
          padding: "2px 6px 6px",
          position: "relative",
          boxShadow: `2px 2px 0px 0px rgba(0,0,0,0.15)`,
        }}
      >
        <div style={{ fontSize: 12, lineHeight: 1.2, textAlign: "center", fontWeight: "bold", borderBottom: `1px solid ${color}`, color: T.tiaText, padding: "2px 0" }}>
          {label}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, lineHeight: 1.6, color: T.tiaText }}>
          <div>{pulseLabel}</div>
          <div>Q</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
          <span style={{ fontSize: 10, color: T.tiaText }}>{resetLabel}</span>
          <PinWiringSelect value={rung.resetAddr} onChange={onChangeResetAddr} options={addrOptions} symbols={symbols} />
        </div>
        {/* Helper text outside box — mismo patrón que TiaTonBox para PT/ET */}
        <div style={{ position: "absolute", bottom: -19, left: 0, fontSize: 12, lineHeight: 1, color: T.tiaBlue }}>PV:{rung.preset}</div>
        <div style={{ position: "absolute", bottom: -19, right: 0, fontSize: 12, lineHeight: 1, color: T.tiaText }}>CV:{count ?? 0}</div>
      </div>
      <TiaLine active={active} size={8} />
    </div>
  );
}
