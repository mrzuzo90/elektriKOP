import { T, INPUT_ADDR } from "../../utils/constants";
import { pixelBorderStyle } from "../../styles/pixelStyles";

export default function HmiPanel({ inputs, onToggle, onPulse, running, timers, deviceMap, scanCount }) {
  const activeTimers = Object.entries(timers || {}).filter(([_, val]) => val > 0);

  return (
    <div style={{
      backgroundColor: T.dwYellow,
      border: `4px solid ${T.dwBlack}`,
      padding: 16,
      width: 320,
      marginTop: 16,
      boxShadow: '10px 10px 0px rgba(0,0,0,0.5)',
      ...pixelBorderStyle
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: `2px solid ${T.dwBlack}`, paddingBottom: 4, marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20, color: T.dwBlack, textTransform: "uppercase", letterSpacing: 1 }}>Panel HMI</h2>
        <span style={{ fontSize: 14, color: T.dwBlack }}>FORCE IO</span>
      </div>

      {/* Pantalla LCD Retro */}
      <div className="dw-lcd-screen" style={{
        backgroundColor: "#8BA791", // Verde LCD clásico
        border: `4px solid ${T.dwGrey}`,
        padding: "8px 12px",
        marginBottom: 16,
        minHeight: 60,
        boxShadow: 'inset 3px 3px 6px rgba(0,0,0,0.5)',
        color: "#1E2B22",
        fontFamily: T.mono,
        fontSize: 16,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        textTransform: "uppercase"
      }}>
         <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
            <span>SYS: {running ? "RUNNING" : "STOPPED"}</span>
            <span style={{ animation: running ? "blink 1s infinite" : "none" }}>{running ? "▶" : "⏸"}</span>
         </div>
         <div style={{ marginTop: 2, fontSize: 13, fontWeight: "bold" }}>
           CICLO: <span key={scanCount ?? 0} className="dw-tick">{String(scanCount ?? 0).padStart(5, "0")}</span>
         </div>
         {activeTimers.length > 0 ? (
           <div style={{ marginTop: 4, fontSize: 14, color: "#111" }}>
             T. ACTIVOS: {activeTimers.length}
           </div>
         ) : (
           <div style={{ marginTop: 4, fontSize: 14, opacity: 0.7 }}>ESPERANDO PROCESO...</div>
         )}
      </div>

      <div style={{
        backgroundColor: T.dwBlack,
        color: T.dwYellow,
        padding: 12,
        border: `4px solid ${T.dwGrey}`,
        boxShadow: 'inset 4px 4px 0px rgba(0,0,0,0.8)'
      }}>
        <div style={{ fontSize: 16, textAlign: "center", borderBottom: `2px dashed ${T.dwGrey}`, paddingBottom: 4 }}>
          ESTADO ENTRADAS
        </div>
        <div style={{ fontSize: 10, color: "#888", textAlign: "center", marginBottom: 10, marginTop: 2 }} title="0→I0.0, 1→I0.1 ... 8→I1.0, 9→I1.1">
          atajo: teclado 0-9
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
          {INPUT_ADDR.map((a) => {
            const type = deviceMap?.[a];
            const isPulse = type === "pulsador";
            const isStop = type === "paro";

            if (isStop) {
              return (
                <button
                  key={a}
                  title="Seta de PARO: clic para enclavar, clic de nuevo para rearmar"
                  onClick={() => onToggle(a)}
                  style={{
                    fontFamily: T.mono,
                    fontSize: 13,
                    width: "100%",
                    aspectRatio: "1 / 1",
                    borderRadius: "50%",
                    backgroundColor: inputs[a] ? "#8B0000" : T.red,
                    color: "#FFF",
                    border: `3px solid ${T.dwYellow}`,
                    boxShadow: inputs[a]
                      ? "inset 3px 3px 6px rgba(0,0,0,0.7)"
                      : "0 3px 0 rgba(0,0,0,0.6)",
                    transform: inputs[a] ? "translateY(2px)" : "none",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  {a.replace('I', '')}
                </button>
              );
            }

            return (
              <button
                key={a}
                title={isPulse ? "Pulsador: activo solo mientras lo mantienes pulsado" : "Interruptor: clic para alternar"}
                onClick={isPulse ? undefined : () => onToggle(a)}
                onMouseDown={isPulse ? () => onPulse(a, true) : undefined}
                onMouseUp={isPulse ? () => onPulse(a, false) : undefined}
                onMouseLeave={isPulse ? () => onPulse(a, false) : undefined}
                onTouchStart={isPulse ? (e) => { e.preventDefault(); onPulse(a, true); } : undefined}
                onTouchEnd={isPulse ? (e) => { e.preventDefault(); onPulse(a, false); } : undefined}
                style={{
                  fontFamily: T.mono,
                  fontSize: 16,
                  backgroundColor: inputs[a] ? T.dwYellow : T.dwGrey,
                  color: inputs[a] ? T.dwBlack : "#888",
                  border: `2px solid ${inputs[a] ? "#FFF" : T.dwBlack}`,
                  borderRadius: isPulse ? "50%" : 0,
                  padding: "8px 0",
                  cursor: "pointer",
                  boxShadow: inputs[a] ? `0 0 8px ${T.dwYellow}` : "inset 2px 2px 0px rgba(0,0,0,0.5)",
                  userSelect: "none",
                }}
              >
                {a.replace('I', '')}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
