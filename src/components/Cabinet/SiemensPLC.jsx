import { T, INPUT_ADDR, OUTPUT_ADDR } from "../../utils/constants";

export default function SiemensPLC({ inputs, outputs, running, error }) {
  const ledSize = 10;

  const renderLedRow = (addrs, states, label) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, marginRight: 8 }}>
      <div style={{ display: "flex", gap: 6 }}>
        {addrs.map((a) => (
          <div key={a} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: 10, color: "#AAA" }}>{a.split('.')[1]}</span>
            <div style={{
              width: ledSize, height: ledSize,
              backgroundColor: states[a] ? T.sLedGreen : T.sLedOff,
              border: `2px solid ${T.dwBlack}`,
              boxShadow: states[a] ? `0 0 5px ${T.sLedGreen}` : 'inset 1px 1px 2px #000'
            }} />
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: "#CCC", textAlign: "right", marginTop: 2 }}>{label}</div>
    </div>
  );

  return (
    <div style={{
      backgroundColor: T.sBg,
      border: `4px solid ${T.dwBlack}`,
      width: 320,
      padding: 12,
      display: "flex",
      flexDirection: "column",
      gap: 10,
      boxShadow: '10px 10px 0px rgba(0,0,0,0.5)'
    }}>
      {/* Upper Terminals / Input LEDs */}
      <div style={{ display: "flex", justifyContent: "space-between", backgroundColor: T.sDark, padding: 8, border: `2px solid ${T.dwBlack}` }}>
        {renderLedRow(INPUT_ADDR.slice(0, 8), inputs, "DI a")}
        {renderLedRow(INPUT_ADDR.slice(8, 10), inputs, "DI b")}
      </div>

      {/* Center Branding & Status */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
        <div style={{ position: "absolute", top: -5, left: -12, width: "calc(100% + 24px)", height: 6, backgroundColor: T.sBlue, borderTop: `2px solid ${T.dwBlack}`, borderBottom: `2px solid ${T.dwBlack}` }} />

        <div style={{ marginTop: 15, display: "flex", gap: 10, backgroundColor: "#222", padding: "4px 8px", border: `2px solid ${T.dwBlack}` }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: running ? T.sLedGreen : T.sLedOff, border: '1px solid #000' }} />
            <span style={{ fontSize: 10, color: "#FFF" }}>RUN</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: !running ? T.dwYellow : T.sLedOff, border: '1px solid #000' }} />
            <span style={{ fontSize: 10, color: "#FFF" }}>STOP</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: error ? T.red : T.sLedOff, border: '1px solid #000' }} />
            <span style={{ fontSize: 10, color: "#FFF" }}>ERROR</span>
          </div>
        </div>

        <div style={{ marginTop: 15, textAlign: "right" }}>
          <div style={{ fontSize: 18, fontWeight: "bold", color: "#FFF", letterSpacing: 1, textShadow: "2px 2px #000" }}>SIEMENS</div>
          <div style={{ fontSize: 14, color: "#CCC" }}>SIMATIC S7-1200</div>
        </div>
      </div>

      {/* Lower Terminals / Output LEDs */}
      <div style={{ display: "flex", justifyContent: "space-between", backgroundColor: T.sDark, padding: 8, border: `2px solid ${T.dwBlack}` }}>
        {renderLedRow(OUTPUT_ADDR.slice(0, 8), outputs, "DQ a")}
        {renderLedRow(OUTPUT_ADDR.slice(8, 10), outputs, "DQ b")}
      </div>
    </div>
  );
}
