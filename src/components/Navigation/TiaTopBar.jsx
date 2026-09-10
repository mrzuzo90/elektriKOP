import { T } from "../../utils/constants";

export default function TiaTopBar({
  projectName,
  onRenameProject,
  running,
  onToggleRun,
  onStepOnce,
  onReset,
  scanCycleTimeMs,
  workspaceView,
  onChangeWorkspaceView,
  factoryIO,
  onOpenMenu,
  soundOn,
  onToggleSound,
}) {
  return (
    <header
      style={{
        backgroundColor: T.dwBlack,
        borderBottom: `3px solid ${T.dwYellow}`,
        color: "#FFFFFF",
        fontFamily: T.mono,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 14px",
        height: 48,
        flexShrink: 0,
        zIndex: 100,
        boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
      }}
    >
      {/* Left: Arcade Brandmark & Project Name */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span
            style={{
              fontWeight: "bold",
              fontSize: 18,
              letterSpacing: 1.5,
              color: T.dwYellow,
              textShadow: "2px 2px 0 #000",
              cursor: "pointer",
            }}
            onClick={onOpenMenu}
            title="Abrir menú principal"
          >
            ⚡ ELEKTRIKOP
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: "bold",
              color: "#FFF",
              letterSpacing: 0.5,
            }}
          >
            TIA Portal <span style={{ color: T.dwYellow, fontSize: 10 }}>V19</span>
          </span>
        </div>

        <div
          style={{
            height: 20,
            width: 2,
            backgroundColor: "#444",
          }}
        />

        {/* Project Name input */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13, opacity: 0.8 }}>📁</span>
          <input
            value={projectName}
            onChange={(e) => onRenameProject(e.target.value)}
            title="Nombre del proyecto (haz clic para editar)"
            style={{
              backgroundColor: "transparent",
              border: "none",
              borderBottom: `1px dashed ${T.dwYellow}`,
              color: "#FFFFFF",
              fontSize: 12,
              fontWeight: "bold",
              fontFamily: T.mono,
              padding: "2px 4px",
              width: 170,
              outline: "none",
            }}
          />
        </div>
      </div>

      {/* Center: Real-Time S7-1200 CPU Control Ribbon */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          backgroundColor: "#1A1A1A",
          padding: "4px 10px",
          border: `2px solid ${T.dwBlack}`,
          boxShadow:
            "inset -2px -2px 0px 0px rgba(0,0,0,0.6), inset 2px 2px 0px 0px rgba(255,255,255,0.1)",
        }}
      >
        {/* CPU Label & Status LED */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: running ? T.sLedGreen : T.dwYellow,
              boxShadow: running ? `0 0 8px ${T.sLedGreen}` : "none",
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: "bold",
              letterSpacing: 0.5,
              color: running ? "#8AFF8A" : "#FFE066",
            }}
          >
            CPU 1214C: {running ? "RUN" : "STOP"}
          </span>
          <span style={{ fontSize: 10, color: "#AAA", marginLeft: 4 }}>
            ⚡ {scanCycleTimeMs} ms
          </span>
        </div>

        <div
          style={{
            height: 16,
            width: 2,
            backgroundColor: "#333",
          }}
        />

        {/* Quick Action Buttons */}
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={onToggleRun}
            title={running ? "Pausar PLC (STOP)" : "Arrancar PLC (RUN)"}
            style={{
              backgroundColor: running ? "#D9381E" : "#00B050",
              color: "#FFFFFF",
              border: `2px solid ${T.dwBlack}`,
              padding: "3px 10px",
              fontSize: 11,
              fontWeight: "bold",
              cursor: "pointer",
              fontFamily: T.mono,
              display: "flex",
              alignItems: "center",
              gap: 4,
              boxShadow: "2px 2px 0px 0px rgba(0,0,0,0.5)",
            }}
          >
            {running ? "⏹ STOP" : "▶ RUN"}
          </button>

          <button
            onClick={onStepOnce}
            title="Ejecuta 1 ciclo de scan y para"
            style={{
              backgroundColor: T.dwGrey,
              color: "#FFF",
              border: `2px solid ${T.dwBlack}`,
              padding: "3px 8px",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: T.mono,
              boxShadow: "2px 2px 0px 0px rgba(0,0,0,0.5)",
            }}
          >
            ⏭ 1 Ciclo
          </button>

          <button
            onClick={onReset}
            title="Reiniciar simulación a reposo (MRES)"
            style={{
              backgroundColor: "#444",
              color: "#FFF",
              border: `2px solid ${T.dwBlack}`,
              padding: "3px 8px",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: T.mono,
              boxShadow: "2px 2px 0px 0px rgba(0,0,0,0.5)",
            }}
          >
            ⟲ Reset
          </button>

          <button
            onClick={onToggleSound}
            title={soundOn ? "Silenciar alarmas" : "Activar sonido"}
            style={{
              backgroundColor: "transparent",
              color: soundOn ? "#FFF" : "#888",
              border: "none",
              padding: "3px 6px",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {soundOn ? "🔊" : "🔇"}
          </button>
        </div>
      </div>

      {/* Right: Workspace Switcher, Factory I/O & Settings */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Workspace Switcher */}
        <div
          style={{
            display: "flex",
            backgroundColor: "#111",
            padding: 2,
            border: "2px solid #222",
          }}
        >
          {[
            { id: "program", label: "Bloques (KOP)", icon: "💻" },
            { id: "hmi", label: "WinCC HMI", icon: "🖥️" },
            { id: "watch", label: "Observación", icon: "👓" },
            { id: "diagnostics", label: "Diagnóstico", icon: "🩺" },
          ].map((tab) => {
            const active = workspaceView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onChangeWorkspaceView(tab.id)}
                style={{
                  backgroundColor: active ? T.dwYellow : "transparent",
                  color: active ? T.dwBlack : "rgba(255,255,255,0.8)",
                  border: active ? `1px solid ${T.dwBlack}` : "none",
                  padding: "4px 8px",
                  fontSize: 11,
                  fontWeight: active ? "bold" : "normal",
                  cursor: "pointer",
                  fontFamily: T.mono,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  transition: "background-color 0.1s",
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Factory I/O Telemetry Badge */}
        <button
          onClick={onOpenMenu}
          title={
            factoryIO.status === "connected"
              ? `Factory I/O conectado (RTT: ${factoryIO.rttMs || "—"} ms). Clic para ver configuración.`
              : "Conectar con Factory I/O vía WebSocket"
          }
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            backgroundColor:
              factoryIO.status === "connected"
                ? "rgba(0, 176, 80, 0.25)"
                : "rgba(0,0,0,0.4)",
            border: `1px solid ${
              factoryIO.status === "connected"
                ? T.sLedGreen
                : factoryIO.status === "error"
                  ? T.red
                  : "#555"
            }`,
            padding: "4px 8px",
            color: "#FFF",
            fontSize: 11,
            cursor: "pointer",
            fontFamily: T.mono,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor:
                factoryIO.status === "connected"
                  ? T.sLedGreen
                  : factoryIO.status === "connecting"
                    ? T.dwYellow
                    : factoryIO.status === "error"
                      ? T.red
                      : "#888",
              boxShadow:
                factoryIO.status === "connected"
                  ? `0 0 6px ${T.sLedGreen}`
                  : "none",
            }}
          />
          <span>
            {factoryIO.status === "connected"
              ? `3D: ${factoryIO.rttMs ? `${factoryIO.rttMs}ms` : "OK"}`
              : "Factory I/O"}
          </span>
        </button>

        {/* Menu / Pause Button */}
        <button
          onClick={onOpenMenu}
          title="Abrir menú de proyecto, variables y desafíos"
          style={{
            backgroundColor: T.dwGrey,
            color: T.dwYellow,
            border: `2px solid ${T.dwBlack}`,
            padding: "4px 8px",
            fontSize: 13,
            cursor: "pointer",
            fontFamily: T.mono,
            boxShadow: "2px 2px 0px 0px rgba(0,0,0,0.5)",
          }}
        >
          ⚙️
        </button>
      </div>
    </header>
  );
}
