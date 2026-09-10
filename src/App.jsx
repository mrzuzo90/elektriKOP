import { useEffect, useState, useCallback } from "react";
import {
  T,
  INPUT_ADDR,
  OUTPUT_ADDR,
  MARK_ADDR,
  ANALOG_ADDR,
  MAX_RUNGS,
} from "./utils/constants";
import { computeStates } from "./utils/evalNode";
import {
  applyWiring,
  collectUsedAddressesAcrossBlocks,
  collectOutputConflictsAcrossBlocks,
} from "./utils/plcIO";
import { newRung } from "./utils/ladderTree";
import { fontStyles } from "./styles/pixelStyles";
import PixelBtn from "./components/shared/PixelBtn";
import ProcessPanel from "./components/ProcessPanel/ProcessPanel";
import PauseMenu from "./components/PauseMenu/PauseMenu";
import SiemensPLC from "./components/Cabinet/SiemensPLC";
import HmiWorkspace from "./hmi/HmiWorkspace";
import { collectHmiMetrics } from "./hmi/metrics";
import { createTagAccess } from "./hmi/bindings";
import { useIOKeyboard } from "./hmi/useIOKeyboard";
import HmiPanel from "./components/HMI/HmiPanel";
import TiaSegment from "./components/Editor/TiaSegment";
import TiaTopBar from "./components/Navigation/TiaTopBar";
import TiaProjectTree from "./components/Navigation/TiaProjectTree";
import WatchForceTable from "./components/Diagnostics/WatchForceTable";
import DiagnosticBufferView from "./components/Diagnostics/DiagnosticBufferView";
import { useSimulation } from "./hooks/useSimulation";
import { useProject } from "./hooks/useProject";
import { useFactoryIO } from "./hooks/useFactoryIO";
import { useDiagnosticBuffer } from "./hooks/useDiagnosticBuffer";
import { collectCounters } from "./utils/factoryIOProtocol";

function zeroInputs() {
  return Object.fromEntries(INPUT_ADDR.map((a) => [a, false]));
}
function zeroAnalog() {
  return Object.fromEntries(ANALOG_ADDR.map((a) => [a, 0]));
}

function timerValueFor(timerDisplay, blockId, rungId) {
  const suffix = `${blockId}:${rungId}`;
  let found;
  Object.keys(timerDisplay).forEach((key) => {
    if (key === suffix || key.endsWith(`>${suffix}`)) found = timerDisplay[key];
  });
  return found;
}

// ---------------------------------------------------------------------------
// App Principal: ElektriKOP — Retro Arcade TIA Portal S7-1200 Simulation
// ---------------------------------------------------------------------------
export default function PlcEmulator() {
  const [workspaceView, setWorkspaceView] = useState("program"); // "program" | "hmi" | "watch" | "diagnostics" | "cabinet"
  const [sidebarTab, setSidebarTab] = useState("tree"); // "tree" | "hardware"
  const [forces, setForces] = useState({});
  const [hmiSession, setHmiSession] = useState(0);
  const [inputs, setInputs] = useState(zeroInputs);
  const [analogInputs, setAnalogInputs] = useState(zeroAnalog);
  const [showProcess, setShowProcess] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [booting, setBooting] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState("main");
  const [challengeBadge, setChallengeBadge] = useState(null);

  const diagnosticBuffer = useDiagnosticBuffer();

  useEffect(() => {
    const id = setTimeout(() => setBooting(false), 800);
    return () => clearTimeout(id);
  }, []);

  const project = useProject();
  const mainBlock = project.blocks.find((b) => b.id === "main");
  const activeBlock =
    project.blocks.find((b) => b.id === activeBlockId) || mainBlock;
  const isMainActive = activeBlock.id === "main";

  const sim = useSimulation({
    inputs,
    analogInputs,
    blocks: project.blocks,
    deviceMap: project.deviceMap,
    wiringMap: project.wiringMap,
    soundOn,
    forces,
    onLogEvent: diagnosticBuffer.logEvent,
  });

  const handleFactoryIOInputs = useCallback((newInputs, newAnalog) => {
    if (newInputs) {
      setInputs((prev) => ({ ...prev, ...newInputs }));
    }
    if (newAnalog) {
      setAnalogInputs((prev) => ({ ...prev, ...newAnalog }));
    }
  }, []);

  const handlePulseInput = useCallback((addr, durationMs = 150) => {
    if (!addr) return;
    setInputs((prev) => ({ ...prev, [addr]: true }));
    setTimeout(() => {
      setInputs((prev) => ({ ...prev, [addr]: false }));
    }, durationMs);
  }, []);

  const handleSetInput = useCallback((addr, val) => {
    if (!addr) return;
    setInputs((prev) => ({ ...prev, [addr]: Boolean(val) }));
  }, []);

  const counters = collectCounters(project.blocks, sim.timerDisplay);

  const factoryIO = useFactoryIO({
    onInputsReceived: handleFactoryIOInputs,
    onPulseInput: handlePulseInput,
    onSetInput: handleSetInput,
    inputs,
    outputs: sim.outputs,
    marks: sim.marks,
    counters,
    analogOutputs: sim.analogOutputs,
  });

  const toggleInput = (addr) => {
    sim.playClickSound();
    setInputs((prev) => ({ ...prev, [addr]: !prev[addr] }));
  };

  const setInputMomentary = (addr, val) => {
    if (val) sim.playClickSound();
    setInputs((prev) => ({ ...prev, [addr]: val }));
  };

  const setAnalogInput = (addr, value) =>
    setAnalogInputs((prev) => ({ ...prev, [addr]: value }));

  useIOKeyboard(project.deviceMap, toggleInput, setInputMomentary);

  const hmiTags = createTagAccess({
    inputs,
    analogInputs,
    analogOutputs: sim.analogOutputs,
    outputs: sim.outputs,
    marks: sim.marks,
    wiringMap: project.wiringMap,
    symbols: project.symbols,
    metrics: collectHmiMetrics(project.blocks, sim.timerDisplay),
    setInput: handleSetInput,
    setAnalog: setAnalogInput,
    setAnalogOutput: sim.setAnalogOutput,
    writeMemory: sim.writeMemory,
  });

  const resetAll = () => {
    setHmiSession((n) => n + 1);
    setInputs(zeroInputs());
    setAnalogInputs(zeroAnalog());
    sim.resetSimulation();
  };

  const clearAll = () => {
    if (
      !window.confirm(
        "¿Limpiar todo? Se borrarán los segmentos, las variables y el estado de la simulación."
      )
    )
      return;
    setHmiSession((n) => n + 1);
    project.clearProject();
    setInputs(zeroInputs());
    setAnalogInputs(zeroAnalog());
    sim.resetSimulation();
    setChallengeBadge(null);
    setActiveBlockId("main");
    setForces({});
  };

  const handleFileSelected = (file) => {
    project.importProject(file, {
      onSuccess: () => {
        setHmiSession((n) => n + 1);
        setInputs(zeroInputs());
        setAnalogInputs(zeroAnalog());
        sim.resetSimulation();
        setActiveBlockId("main");
        setForces({});
      },
    });
  };

  const handleSetForce = useCallback(
    (addr, val) => {
      setForces((prev) => {
        if (val === undefined || val === null) {
          const next = { ...prev };
          delete next[addr];
          return next;
        }
        return { ...prev, [addr]: val };
      });
      diagnosticBuffer.logEvent(
        "16# 02:4003",
        `Variable forzada permanentemente: ${addr} = ${val}`,
        "warning",
        "Forzado permanente activo en Tabla de Observación"
      );
    },
    [diagnosticBuffer]
  );

  const handleClearAllForces = useCallback(() => {
    setForces({});
    diagnosticBuffer.logEvent(
      "16# 02:4004",
      "Todos los forzados permanentes desactivados.",
      "info",
      "Valores de proceso restaurados al ciclo de scan normal"
    );
  }, [diagnosticBuffer]);

  const effectiveInputs = applyWiring(inputs, project.wiringMap);

  const isFc = activeBlock.kind === "fc";
  const isFb = activeBlock.kind === "fb";
  const isCallableBlock = isFc || isFb;
  const localIn = isCallableBlock ? activeBlock.interface.in : [];
  const localOut = isCallableBlock ? activeBlock.interface.out : [];
  const localStatic = isFb ? activeBlock.interface.static || [] : [];
  const localParams = [...localIn, ...localOut, ...localStatic];
  const symbolsForEditor = {
    ...project.symbols,
    ...Object.fromEntries(localParams.map((p) => [`#${p.id}`, p.name])),
  };
  const contactAddrOptions = [
    ...INPUT_ADDR,
    ...OUTPUT_ADDR,
    ...MARK_ADDR,
    ...localParams.map((p) => `#${p.id}`),
  ];
  const outputAddrOptions = [
    ...OUTPUT_ADDR,
    ...MARK_ADDR,
    ...localOut.map((p) => `#${p.id}`),
    ...localStatic.map((p) => `#${p.id}`),
  ];

  const flatRungsWithBlock = project.blocks.flatMap((b) =>
    b.rungs.map((rung) => ({ rung, blockName: b.name }))
  );
  const outputConflicts = collectOutputConflictsAcrossBlocks(project.blocks);

  return (
    <>
      <style>{fontStyles}</style>
      <div className="dw-crt-overlay" />
      {booting && <div className="dw-crt-boot" />}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          backgroundColor: T.dwDark,
          fontFamily: T.mono,
          overflow: "hidden",
        }}
      >
        {/* Retro Arcade Top Bar */}
        <TiaTopBar
          projectName={project.projectName}
          onRenameProject={project.setProjectName}
          running={sim.running}
          onToggleRun={() => {
            if (sim.running) sim.playStopSound();
            else sim.playRunSound();
            sim.setRunning(!sim.running);
          }}
          onStepOnce={sim.stepOnce}
          onReset={resetAll}
          scanCycleTimeMs={sim.scanCycleTimeMs}
          workspaceView={workspaceView}
          onChangeWorkspaceView={setWorkspaceView}
          factoryIO={factoryIO}
          onOpenMenu={() => setMenuOpen(true)}
          soundOn={soundOn}
          onToggleSound={() => setSoundOn((v) => !v)}
        />

        {/* Main Body: Left Sidebar + Center Workspace + Right Process Panel */}
        <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
          {/* Left Sidebar: Switch between TIA Project Tree and Hardware Rack */}
          <div
            style={{
              width: sidebarTab === "tree" ? 260 : 380,
              borderRight: `4px solid ${T.dwBlack}`,
              backgroundColor: T.dwGrey,
              display: "flex",
              flexDirection: "column",
              flexShrink: 0,
              transition: "width 0.15s ease",
              overflow: "hidden",
            }}
          >
            {/* Sidebar Tab Switcher */}
            <div
              style={{
                display: "flex",
                borderBottom: `3px solid ${T.dwBlack}`,
                backgroundColor: T.dwDark,
                flexShrink: 0,
              }}
            >
              <button
                onClick={() => setSidebarTab("tree")}
                style={{
                  flex: 1,
                  padding: "8px 6px",
                  fontFamily: T.mono,
                  fontSize: 11,
                  fontWeight: sidebarTab === "tree" ? "bold" : "normal",
                  color: sidebarTab === "tree" ? T.dwYellow : "#AAA",
                  backgroundColor:
                    sidebarTab === "tree" ? T.dwGrey : "transparent",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
                title="Vista árbol de proyecto TIA Portal"
              >
                <span>📁</span>
                <span>Árbol TIA</span>
              </button>
              <button
                onClick={() => setSidebarTab("hardware")}
                style={{
                  flex: 1,
                  padding: "8px 6px",
                  fontFamily: T.mono,
                  fontSize: 11,
                  fontWeight: sidebarTab === "hardware" ? "bold" : "normal",
                  color: sidebarTab === "hardware" ? T.dwYellow : "#AAA",
                  backgroundColor:
                    sidebarTab === "hardware" ? T.dwGrey : "transparent",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
                title="Ver bastidor físico S7-1200, LEDs y pulsadores"
              >
                <span>🎛️</span>
                <span>Rack PLC & HMI</span>
              </button>
            </div>

            {/* Sidebar Body */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {sidebarTab === "tree" ? (
                <TiaProjectTree
                  projectName={project.projectName}
                  blocks={project.blocks}
                  activeBlockId={activeBlockId}
                  onSelectBlock={setActiveBlockId}
                  hmi={project.hmi}
                  workspaceView={workspaceView}
                  onChangeWorkspaceView={setWorkspaceView}
                  onOpenMenu={() => setMenuOpen(true)}
                />
              ) : (
                <div
                  style={{
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <div style={{ width: "100%", marginBottom: 14, textAlign: "center" }}>
                    <button
                      onClick={() => setMenuOpen(true)}
                      className="dw-neon-text"
                      title="Abrir el menú (proyecto, exportar/importar, Modo Desafío)"
                      style={{
                        width: "100%",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: T.dwYellow,
                        fontFamily: T.mono,
                        fontWeight: "bold",
                        fontSize: 22,
                        letterSpacing: 1,
                        padding: "4px 0",
                        textShadow: `2px 2px 0 ${T.dwBlack}`,
                        textTransform: "uppercase",
                      }}
                    >
                      ⏸ ElektriKOP
                    </button>
                    <p
                      style={{
                        color: "#AAA",
                        fontSize: 12,
                        marginTop: 4,
                        letterSpacing: 0.5,
                      }}
                    >
                      SIMATIC S7-1200 CPU 1214C
                    </p>

                    {challengeBadge && (
                      <button
                        onClick={() => setMenuOpen(true)}
                        title="Reabrir Modo Desafío"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          marginTop: 8,
                          border: `1px solid ${
                            challengeBadge.pass ? T.tiaLineActive : T.red
                          }`,
                          backgroundColor: challengeBadge.pass
                            ? "rgba(0,176,0,0.15)"
                            : "rgba(255,51,51,0.15)",
                          color: "#FFF",
                          fontFamily: T.mono,
                          fontSize: 11,
                          padding: "4px 10px",
                          cursor: "pointer",
                        }}
                      >
                        <span>{challengeBadge.pass ? "✅" : "❌"}</span>
                        <span>🎯 {challengeBadge.title}</span>
                      </button>
                    )}
                  </div>

                  <SiemensPLC
                    inputs={effectiveInputs}
                    outputs={sim.outputs}
                    running={sim.running}
                    error={false}
                    scanCount={sim.scanCount}
                  />
                  <HmiPanel
                    inputs={inputs}
                    onToggle={toggleInput}
                    onPulse={setInputMomentary}
                    deviceMap={project.deviceMap}
                    running={sim.running}
                    timers={sim.timerDisplay}
                    scanCount={sim.scanCount}
                  />

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginTop: 20,
                      width: "100%",
                      justifyContent: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <PixelBtn
                      active={sim.running}
                      onClick={() => {
                        if (sim.running) sim.playStopSound();
                        else sim.playRunSound();
                        sim.setRunning(!sim.running);
                      }}
                    >
                      {sim.running ? "⏸ STOP" : "▶ RUN"}
                    </PixelBtn>
                    <PixelBtn color="red" onClick={resetAll}>
                      ⟲ RESET
                    </PixelBtn>
                    <PixelBtn
                      small
                      color="dwGrey"
                      onClick={sim.stepOnce}
                      title="Ejecuta un único ciclo de scan y para"
                    >
                      ⏭ 1 CICLO
                    </PixelBtn>
                    <PixelBtn
                      small
                      color="dwGrey"
                      active={!soundOn}
                      onClick={() => setSoundOn((v) => !v)}
                      title="Silenciar/activar el pitido de alarma"
                    >
                      {soundOn ? "🔊 SONIDO" : "🔇 MUDO"}
                    </PixelBtn>
                  </div>

                  <div
                    style={{
                      marginTop: 16,
                      width: "100%",
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    <button
                      onClick={() => {
                        if (
                          factoryIO.status !== "connected" &&
                          factoryIO.status !== "connecting"
                        ) {
                          factoryIO.connect();
                        } else {
                          setMenuOpen(true);
                        }
                      }}
                      title={
                        factoryIO.status === "connected"
                          ? "Abrir configuración y estado de Factory I/O"
                          : "Conectar al puente WebSocket"
                      }
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 12px",
                        backgroundColor:
                          factoryIO.status === "connected"
                            ? "rgba(0,176,0,0.15)"
                            : factoryIO.status === "connecting"
                              ? "rgba(255,200,0,0.15)"
                              : "rgba(0,0,0,0.25)",
                        border: `1px solid ${
                          factoryIO.status === "connected"
                            ? T.sLedGreen
                            : factoryIO.status === "error"
                              ? T.red
                              : "#555"
                        }`,
                        color: "#EEE",
                        fontFamily: T.mono,
                        fontSize: 11,
                        cursor: "pointer",
                        letterSpacing: 0.5,
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
                                  : "#666",
                          boxShadow:
                            factoryIO.status === "connected"
                              ? `0 0 6px ${T.sLedGreen}`
                              : "none",
                        }}
                      />
                      <span>
                        🔌 FACTORY I/O:{" "}
                        {factoryIO.status === "connected"
                          ? factoryIO.bridgeInfo?.isMock
                            ? "MOCK"
                            : "CONECTADO"
                          : factoryIO.status === "connecting"
                            ? "CONECTANDO..."
                            : "OFF"}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center: Dynamic Workspace Routing */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              backgroundColor: "#EBEBEB",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {workspaceView === "hmi" && (
              <HmiWorkspace
                key={hmiSession}
                hmi={project.hmi}
                onChange={project.setHmi}
                tags={hmiTags}
                symbols={project.symbols}
                undo={project.undo}
                redo={project.redo}
                canUndo={project.canUndo}
                canRedo={project.canRedo}
                running={sim.running}
                onToggleRun={() => sim.setRunning((r) => !r)}
              />
            )}

            {workspaceView === "watch" && (
              <WatchForceTable
                inputs={effectiveInputs}
                outputs={sim.outputs}
                marks={sim.marks}
                analogInputs={analogInputs}
                analogOutputs={sim.analogOutputs}
                symbols={project.symbols}
                forces={forces}
                onSetForce={handleSetForce}
                onClearAllForces={handleClearAllForces}
              />
            )}

            {workspaceView === "diagnostics" && (
              <DiagnosticBufferView
                events={diagnosticBuffer.events}
                onClear={diagnosticBuffer.clearEvents}
                onExport={diagnosticBuffer.exportLog}
                scanCycleTimeMs={sim.scanCycleTimeMs}
                scanCount={sim.scanCount}
                running={sim.running}
              />
            )}

            {workspaceView === "cabinet" && (
              <div
                style={{
                  flex: 1,
                  padding: 30,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  backgroundColor: T.dwDark,
                }}
              >
                <div
                  style={{
                    maxWidth: 750,
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 20,
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      padding: "12px 18px",
                      backgroundColor: T.dwBlack,
                      border: `2px solid ${T.dwYellow}`,
                      color: T.dwYellow,
                      fontWeight: "bold",
                      fontSize: 14,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>🎛️ BASTIDOR SIMATIC S7-1200 CPU 1214C</span>
                    <span style={{ fontSize: 12, color: "#FFF" }}>
                      {sim.running ? "🟢 RUN" : "🟡 STOP"} · Scan:{" "}
                      {sim.scanCycleTimeMs} ms
                    </span>
                  </div>
                  <SiemensPLC
                    inputs={effectiveInputs}
                    outputs={sim.outputs}
                    running={sim.running}
                    error={false}
                    scanCount={sim.scanCount}
                  />
                  <HmiPanel
                    inputs={inputs}
                    onToggle={toggleInput}
                    onPulse={setInputMomentary}
                    deviceMap={project.deviceMap}
                    running={sim.running}
                    timers={sim.timerDisplay}
                    scanCount={sim.scanCount}
                  />
                </div>
              </div>
            )}

            {workspaceView === "program" && (
              <>
                <div
                  style={{
                    backgroundColor: "#F0F0F0",
                    borderBottom: "1px solid #CCC",
                  }}
                >
                  {/* Block Tabs: Main [OB1] + FCs + FBs */}
                  <div
                    style={{
                      display: "flex",
                      gap: 4,
                      padding: "8px 20px 0",
                      flexWrap: "wrap",
                    }}
                  >
                    {project.blocks.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => setActiveBlockId(b.id)}
                        title={
                          b.kind === "main"
                            ? "Main [OB1]"
                            : b.kind === "fb"
                              ? `Bloque de función (FB) ${b.name}`
                              : `Función ${b.name}`
                        }
                        style={{
                          fontFamily: T.mono,
                          fontWeight: "bold",
                          fontSize: 12,
                          padding: "6px 14px",
                          cursor: "pointer",
                          border: `2px solid ${T.dwBlack}`,
                          borderBottom: "none",
                          backgroundColor:
                            b.id === activeBlock.id ? T.tiaBg : "#D8D8D8",
                          color: T.tiaText,
                        }}
                      >
                        {b.name}{" "}
                        [{b.kind === "main" ? "OB1" : b.kind.toUpperCase()}]
                      </button>
                    ))}
                  </div>

                  <div
                    style={{
                      padding: "10px 20px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderTop: `2px solid ${T.dwBlack}`,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: "bold",
                          color: T.tiaText,
                        }}
                      >
                        {activeBlock.name} [
                        {isMainActive
                          ? "OB1"
                          : activeBlock.kind === "fb"
                            ? "FB"
                            : "FC"}
                        ]
                      </div>
                      <div style={{ fontSize: 12, color: "#666" }}>
                        Program block (Ladder Logic · LAD / KOP)
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <PixelBtn
                        small
                        color="dwGrey"
                        onClick={project.undo}
                        disabled={!project.canUndo}
                        title="Deshacer (Ctrl+Z)"
                      >
                        ⟲ Deshacer
                      </PixelBtn>
                      <PixelBtn
                        small
                        color="dwGrey"
                        onClick={project.redo}
                        disabled={!project.canRedo}
                        title="Rehacer (Ctrl+Shift+Z)"
                      >
                        ⟳ Rehacer
                      </PixelBtn>
                      <PixelBtn
                        small
                        color="dwGrey"
                        disabled={activeBlock.rungs.length >= MAX_RUNGS}
                        onClick={() => {
                          if (activeBlock.rungs.length < MAX_RUNGS) {
                            project.setBlockRungs(activeBlock.id, [
                              ...activeBlock.rungs,
                              newRung(
                                activeBlock.rungs.length
                                  ? Math.max(
                                      ...activeBlock.rungs.map((r) => r.id)
                                    ) + 1
                                  : 0
                              ),
                            ]);
                          }
                        }}
                      >
                        + Segmento
                      </PixelBtn>
                    </div>
                  </div>
                </div>

                <div style={{ flex: 1, padding: 20, overflowY: "auto" }}>
                  {outputConflicts.length > 0 && (
                    <div
                      style={{
                        background: "#FFF3CD",
                        border: "1px solid #FFB300",
                        color: "#7A5200",
                        padding: "8px 12px",
                        marginBottom: 16,
                        fontSize: 12,
                      }}
                    >
                      ⚠️ Direcciones de salida repetidas sin ser SET/RESET (en
                      todo el proyecto, no solo en este bloque):{" "}
                      {outputConflicts
                        .map(
                          ([addr, idxs]) =>
                            `${addr} (${idxs
                              .map(
                                (i) =>
                                  `${flatRungsWithBlock[i].blockName}:${flatRungsWithBlock[i].rung.title}`
                              )
                              .join(", ")})`
                        )
                        .join(" · ")}
                    </div>
                  )}

                  {activeBlock.rungs.map((rung, idx) => {
                    const frame = sim.lastCallFrames[activeBlock.id] || {};
                    const mem = {
                      ...effectiveInputs,
                      ...analogInputs,
                      ...sim.outputs,
                      ...sim.marks,
                      ...sim.analogOutputs,
                      ...frame,
                    };
                    const states = computeStates(rung.logic, mem, sim.prevMem);
                    if (rung.outType === "sr" || rung.outType === "rs") {
                      computeStates(rung.logicR || [], mem, sim.prevMem, states);
                    }
                    const rawTimer = timerValueFor(
                      sim.timerDisplay,
                      activeBlock.id,
                      rung.id
                    );
                    return (
                      <TiaSegment
                        key={rung.id}
                        rung={rung}
                        canDelete={activeBlock.rungs.length > 1}
                        symbols={symbolsForEditor}
                        addrOptions={contactAddrOptions}
                        analogAddrOptions={ANALOG_ADDR}
                        outputAddrOptions={outputAddrOptions}
                        blocks={project.blocks}
                        currentBlockId={activeBlock.id}
                        onChange={(next) =>
                          project.setBlockRungs(
                            activeBlock.id,
                            activeBlock.rungs.map((r, i) =>
                              i === idx ? next : r
                            )
                          )
                        }
                        onDelete={() => {
                          const removedId = activeBlock.rungs[idx].id;
                          sim.clearTimer(activeBlock.id, removedId);
                          project.setBlockRungs(
                            activeBlock.id,
                            activeBlock.rungs.filter((_, i) => i !== idx)
                          );
                        }}
                        evalResult={{
                          states,
                          outputState: rung.outAddr?.startsWith("#")
                            ? frame[rung.outAddr]
                            : sim.outputs[rung.outAddr] ??
                              sim.marks[rung.outAddr],
                          timerElapsed:
                            rung.outType === "ton" || rung.outType === "tof"
                              ? rawTimer ?? 0
                              : rung.outType === "tp"
                                ? rawTimer?.elapsed ?? 0
                                : undefined,
                          counterValue:
                            rung.outType === "ctu" ||
                            rung.outType === "ctd" ||
                            rung.outType === "ctud"
                              ? rawTimer?.count ?? 0
                              : undefined,
                          quState:
                            rung.outType === "ctud"
                              ? (rawTimer?.qu ??
                                (rawTimer?.count ?? 0) >= rung.preset)
                              : undefined,
                          qdState:
                            rung.outType === "ctud"
                              ? (rawTimer?.qd ?? (rawTimer?.count ?? 0) <= 0)
                              : undefined,
                          mem,
                        }}
                      />
                    );
                  })}
                  {activeBlock.rungs.length >= MAX_RUNGS && (
                    <div
                      style={{
                        color: "red",
                        textAlign: "center",
                        marginTop: 10,
                      }}
                    >
                      Límite de segmentos alcanzado ({MAX_RUNGS})
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right: Simulated Process Panel */}
          <div
            style={{
              width: 320,
              flexShrink: 0,
              backgroundColor: T.dwGrey,
              borderLeft: `4px solid ${T.dwBlack}`,
              padding: 16,
              overflowY: "auto",
            }}
          >
            <ProcessPanel
              addresses={collectUsedAddressesAcrossBlocks(
                project.blocks
              ).filter((a) => !a.startsWith("M"))}
              deviceMap={project.deviceMap}
              onChangeType={project.setDeviceType}
              wiringMap={project.wiringMap}
              onChangeWiring={project.setWiringFor}
              inputs={inputs}
              outputs={sim.outputs}
              analogInputs={analogInputs}
              onChangeAnalog={setAnalogInput}
              visible={showProcess}
              onToggle={() => setShowProcess((v) => !v)}
            />
          </div>
        </div>

        <PauseMenu
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          projectName={project.projectName}
          onRenameProject={project.setProjectName}
          onExport={project.exportProject}
          onImportClick={() => project.fileInputRef.current?.click()}
          fileInputRef={project.fileInputRef}
          onFileSelected={handleFileSelected}
          importError={project.importError}
          restoredFromAutosave={project.restoredFromAutosave}
          onDismissRestoredNotice={project.dismissRestoredNotice}
          onShare={project.copyShareLink}
          loadedFromShareLink={project.loadedFromShareLink}
          onDismissShareLinkNotice={project.dismissShareLinkNotice}
          onClear={clearAll}
          blocks={project.blocks}
          wiringMap={project.wiringMap}
          onChallengeResultChange={setChallengeBadge}
          usedAddresses={collectUsedAddressesAcrossBlocks(project.blocks)}
          symbols={project.symbols}
          onChangeSymbol={project.setSymbolFor}
          marks={sim.marks}
          simRunning={sim.running}
          onAddBlock={project.addBlock}
          onRenameBlock={project.renameBlock}
          onRemoveBlock={project.removeBlock}
          onAddParam={project.addParam}
          onRenameParam={project.renameParam}
          onRemoveParam={project.removeParam}
          factoryIO={factoryIO}
        />
      </div>
    </>
  );
}
