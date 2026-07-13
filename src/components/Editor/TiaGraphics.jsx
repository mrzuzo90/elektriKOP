import { T } from "../../utils/constants";

export function TiaLine({ active, vertical, size = 20 }) {
  const color = active ? T.tiaLineActive : T.tiaLine;
  return (
    <div style={{
      width: vertical ? 3 : size,
      height: vertical ? size : 3,
      backgroundColor: color,
      margin: vertical ? "0 4px" : "0",
      transition: "background-color 0.1s"
    }} />
  );
}

export function TiaContact({ neg, stateObj }) {
  const active = stateObj?.flowIn && stateObj?.state;
  const color = active ? T.tiaLineActive : T.tiaLine;
  const hasFlow = stateObj?.flowIn;

  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <TiaLine active={hasFlow} size={8} />
      <svg width="24" height="30" viewBox="0 0 24 30" style={{ overflow: 'visible' }}>
        <line x1="0" y1="15" x2="8" y2="15" stroke={hasFlow ? T.tiaLineActive : T.tiaLine} strokeWidth="3" strokeLinecap="square" />
        <line x1="16" y1="15" x2="24" y2="15" stroke={active ? T.tiaLineActive : T.tiaLine} strokeWidth="3" strokeLinecap="square" />
        <line x1="8" y1="5" x2="8" y2="25" stroke={color} strokeWidth="3" strokeLinecap="square" />
        <line x1="16" y1="5" x2="16" y2="25" stroke={color} strokeWidth="3" strokeLinecap="square" />
        {neg && <line x1="6" y1="26" x2="18" y2="4" stroke={color} strokeWidth="3" strokeLinecap="square" />}
      </svg>
      <TiaLine active={active} size={8} />
    </div>
  );
}

export function TiaCoil({ active, flowIn }) {
  const color = active && flowIn ? T.tiaLineActive : T.tiaLine;
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <TiaLine active={flowIn} size={12} />
      <svg width="28" height="30" viewBox="0 0 28 30">
        <line x1="0" y1="15" x2="6" y2="15" stroke={flowIn ? T.tiaLineActive : T.tiaLine} strokeWidth="3" strokeLinecap="square" />
        <line x1="22" y1="15" x2="28" y2="15" stroke={color} strokeWidth="3" strokeLinecap="square" />
        <path d="M 10 5 A 10 10 0 0 0 10 25" fill="none" stroke={color} strokeWidth="3" />
        <path d="M 18 5 A 10 10 0 0 1 18 25" fill="none" stroke={color} strokeWidth="3" />
      </svg>
    </div>
  );
}

export function TiaSetReset({ active, flowIn, type }) {
  const color = active && flowIn ? T.tiaLineActive : T.tiaLine;
  const letter = type === "set" ? "S" : "R";
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <TiaLine active={flowIn} size={12} />
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <svg width="28" height="30" viewBox="0 0 28 30">
          <line x1="0" y1="15" x2="6" y2="15" stroke={flowIn ? T.tiaLineActive : T.tiaLine} strokeWidth="3" strokeLinecap="square" />
          <line x1="22" y1="15" x2="28" y2="15" stroke={color} strokeWidth="3" strokeLinecap="square" />
          <path d="M 10 5 A 10 10 0 0 0 10 25" fill="none" stroke={color} strokeWidth="3" />
          <path d="M 18 5 A 10 10 0 0 1 18 25" fill="none" stroke={color} strokeWidth="3" />
        </svg>
        <span style={{ position: 'absolute', fontSize: 13, fontWeight: 'bold', color: color, fontFamily: 'sans-serif', marginTop: 1 }}>{letter}</span>
      </div>
    </div>
  );
}

export function TiaTonBox({ active, flowIn, preset, elapsed }) {
  const color = active && flowIn ? T.tiaLineActive : T.tiaLine;
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <TiaLine active={flowIn} size={8} />
      <div style={{
        border: `3px solid ${color}`,
        backgroundColor: "#FFF",
        width: 60,
        height: 50,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "2px 4px",
        position: "relative",
        boxShadow: `2px 2px 0px 0px rgba(0,0,0,0.15)`,
      }}>
        <div style={{ fontSize: 12, textAlign: "center", fontWeight: "bold", borderBottom: `1px solid ${color}`, color: T.tiaText }}>TON</div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T.tiaText }}>
          <div>IN</div>
          <div>Q</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T.tiaText }}>
          <div>PT</div>
          <div>ET</div>
        </div>
        {/* Helper text outside box */}
        <div style={{ position: "absolute", bottom: -16, left: 0, fontSize: 12, color: T.tiaBlue }}>{preset}s</div>
        <div style={{ position: "absolute", bottom: -16, right: 0, fontSize: 12, color: T.tiaText }}>{(elapsed || 0).toFixed(1)}s</div>
      </div>
      <TiaLine active={color === T.tiaLineActive} size={8} />
    </div>
  );
}
