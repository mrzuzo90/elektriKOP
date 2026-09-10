import { useState } from "react";
import { T } from "../../utils/constants";

export default function TiaProjectTree({
  projectName,
  blocks = [],
  activeBlockId,
  onSelectBlock,
  hmi,
  workspaceView,
  onChangeWorkspaceView,
  onOpenMenu,
}) {
  const [openPlc, setOpenPlc] = useState(true);
  const [openBlocks, setOpenBlocks] = useState(true);
  const [openHmi, setOpenHmi] = useState(true);
  const [openBridges, setOpenBridges] = useState(true);

  const itemStyle = (isActive) => ({
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "3px 8px",
    cursor: "pointer",
    fontSize: 11,
    color: isActive ? T.dwYellow : "#EEE",
    fontWeight: isActive ? "bold" : "normal",
    backgroundColor: isActive ? "#3D3D3D" : "transparent",
    userSelect: "none",
    fontFamily: T.mono,
  });

  return (
    <div
      style={{
        width: "100%",
        backgroundColor: T.dwDark,
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        fontFamily: T.mono,
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "8px 12px",
          backgroundColor: T.dwBlack,
          borderBottom: `2px solid #222`,
          fontWeight: "bold",
          fontSize: 11,
          color: T.dwYellow,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          letterSpacing: 0.5,
        }}
      >
        <span>ÁRBOL DE PROYECTO</span>
        <span style={{ fontSize: 10, color: "#888" }}>S7-1200</span>
      </div>

      <div style={{ padding: "8px 6px", display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Root Project */}
        <div
          style={{
            fontWeight: "bold",
            fontSize: 11,
            color: T.dwYellow,
            padding: "2px 4px",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span>📁</span>
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {projectName || "Proyecto PLC"}
          </span>
        </div>

        {/* --- PLC_1 Station --- */}
        <div style={{ marginLeft: 8 }}>
          <div
            onClick={() => setOpenPlc(!openPlc)}
            style={{ ...itemStyle(false), fontWeight: "bold", color: "#FFF" }}
          >
            <span>{openPlc ? "▼" : "►"}</span>
            <span>🎛️ PLC_1 [CPU 1214C]</span>
          </div>

          {openPlc && (
            <div style={{ marginLeft: 14, display: "flex", flexDirection: "column", gap: 2 }}>
              {/* Device Configuration */}
              <div
                onClick={() => onChangeWorkspaceView("cabinet")}
                style={itemStyle(workspaceView === "cabinet")}
                title="Ver rack físico y bornes del S7-1200"
              >
                <span>⚙️</span>
                <span>Configuración bastidor</span>
              </div>

              {/* Program Blocks */}
              <div>
                <div
                  onClick={() => setOpenBlocks(!openBlocks)}
                  style={{ ...itemStyle(false), fontWeight: "bold" }}
                >
                  <span>{openBlocks ? "▼" : "►"}</span>
                  <span>📜 Bloques de programa</span>
                </div>

                {openBlocks && (
                  <div style={{ marginLeft: 14, display: "flex", flexDirection: "column", gap: 1 }}>
                    {blocks.map((b) => {
                      const isAct =
                        workspaceView === "program" && activeBlockId === b.id;
                      return (
                        <div
                          key={b.id}
                          onClick={() => {
                            onChangeWorkspaceView("program");
                            onSelectBlock(b.id);
                          }}
                          style={itemStyle(isAct)}
                          title={`${b.name} [${b.kind === "main" ? "OB1" : b.kind.toUpperCase()}]`}
                        >
                          <span>
                            {b.kind === "main" ? "🟢" : b.kind === "fb" ? "🟦" : "🟨"}
                          </span>
                          <span>
                            {b.name} [{b.kind === "main" ? "OB1" : b.kind.toUpperCase()}]
                          </span>
                        </div>
                      );
                    })}
                    <div
                      onClick={onOpenMenu}
                      style={{
                        ...itemStyle(false),
                        color: T.dwYellow,
                        fontStyle: "italic",
                      }}
                      title="Abrir diálogo para crear un nuevo bloque FC o FB"
                    >
                      <span>➕</span>
                      <span>Nuevo bloque...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* PLC Tags */}
              <div
                onClick={onOpenMenu}
                style={itemStyle(false)}
                title="Tabla de variables y símbolos PLC"
              >
                <span>🏷️</span>
                <span>Variables PLC (Símbolos)</span>
              </div>

              {/* Watch & Force Tables */}
              <div
                onClick={() => onChangeWorkspaceView("watch")}
                style={itemStyle(workspaceView === "watch")}
                title="Abrir tabla de observación y forzado de variables"
              >
                <span>👓</span>
                <span>Tablas de observación/forzado</span>
              </div>

              {/* Diagnostics Buffer */}
              <div
                onClick={() => onChangeWorkspaceView("diagnostics")}
                style={itemStyle(workspaceView === "diagnostics")}
                title="Ver buffer de diagnóstico y eventos de CPU"
              >
                <span>🩺</span>
                <span>Buffer de diagnóstico</span>
              </div>
            </div>
          )}
        </div>

        {/* --- HMI_1 Station --- */}
        <div style={{ marginLeft: 8, marginTop: 4 }}>
          <div
            onClick={() => setOpenHmi(!openHmi)}
            style={{ ...itemStyle(false), fontWeight: "bold", color: "#FFF" }}
          >
            <span>{openHmi ? "▼" : "►"}</span>
            <span>🖥️ HMI_1 [KTP-600]</span>
          </div>

          {openHmi && (
            <div style={{ marginLeft: 14, display: "flex", flexDirection: "column", gap: 1 }}>
              <div
                onClick={() => onChangeWorkspaceView("hmi")}
                style={itemStyle(workspaceView === "hmi")}
                title="Editor y Runtime de pantallas WinCC"
              >
                <span>🖼️</span>
                <span>Imágenes ({hmi?.screens?.length || 1})</span>
              </div>
            </div>
          )}
        </div>

        {/* --- External Bridges --- */}
        <div style={{ marginLeft: 8, marginTop: 4 }}>
          <div
            onClick={() => setOpenBridges(!openBridges)}
            style={{ ...itemStyle(false), fontWeight: "bold", color: "#FFF" }}
          >
            <span>{openBridges ? "▼" : "►"}</span>
            <span>🔌 Enlaces externos</span>
          </div>

          {openBridges && (
            <div style={{ marginLeft: 14, display: "flex", flexDirection: "column", gap: 1 }}>
              <div
                onClick={onOpenMenu}
                style={itemStyle(false)}
                title="Configuración de Factory I/O (Modbus TCP)"
              >
                <span>🏭</span>
                <span>Factory I/O (Modbus)</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
