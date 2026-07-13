import { useEffect, useState } from "react";
import { T, INPUT_ADDR, MAX_RUNGS } from "./utils/constants";
import { computeStates } from "./utils/evalNode";
import { applyWiring, collectUsedAddresses, collectOutputConflicts } from "./utils/plcIO";
import { newRung } from "./utils/ladderTree";
import { fontStyles } from "./styles/pixelStyles";
import PixelBtn from "./components/shared/PixelBtn";
import ProcessPanel from "./components/ProcessPanel/ProcessPanel";
import SymbolsPanel from "./components/SymbolsPanel";
import PauseMenu from "./components/PauseMenu/PauseMenu";
import SiemensPLC from "./components/Cabinet/SiemensPLC";
import HmiPanel from "./components/HMI/HmiPanel";
import TiaSegment from "./components/Editor/TiaSegment";
import { useSimulation } from "./hooks/useSimulation";
import { useProject } from "./hooks/useProject";

function zeroInputs() {
  return Object.fromEntries(INPUT_ADDR.map((a) => [a, false]));
}

// ---------------------------------------------------------------------------
// App Principal
// ---------------------------------------------------------------------------
export default function PlcEmulator() {
  const [inputs, setInputs] = useState(zeroInputs);
  const [showProcess, setShowProcess] = useState(true);
  const [showSymbols, setShowSymbols] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [booting, setBooting] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  // Copia ligera del último resultado de Modo Desafío, solo para el
  // distintivo flotante — el estado "de verdad" (ejercicio elegido,
  // resultado completo) sigue viviendo dentro de ChallengePanel, que se
  // queda montado (solo oculto vía CSS en PauseMenu) para no perderlo al
  // cerrar el menú.
  const [challengeBadge, setChallengeBadge] = useState(null);

  useEffect(() => {
    const id = setTimeout(() => setBooting(false), 1100);
    return () => clearTimeout(id);
  }, []);

  const project = useProject();
  const sim = useSimulation({
    inputs,
    rungs: project.rungs,
    deviceMap: project.deviceMap,
    wiringMap: project.wiringMap,
    soundOn,
  });

  const toggleInput = (addr) => {
    sim.playClickSound();
    setInputs((prev) => ({ ...prev, [addr]: !prev[addr] }));
  };
  const setInputMomentary = (addr, val) => {
    if (val) sim.playClickSound();
    setInputs((prev) => ({ ...prev, [addr]: val }));
  };

  const resetAll = () => {
    setInputs(zeroInputs());
    sim.resetSimulation();
  };

  const clearAll = () => {
    if (!window.confirm("¿Limpiar todo? Se borrarán los segmentos, las variables y el estado de la simulación.")) return;
    project.clearProject();
    setInputs(zeroInputs());
    sim.resetSimulation();
    setChallengeBadge(null);
  };

  const handleFileSelected = (file) => {
    project.importProject(file, {
      onSuccess: () => {
        setInputs(zeroInputs());
        sim.resetSimulation();
      },
    });
  };

  // Entradas ya convertidas según el cableado físico (NA/NC) de cada
  // dispositivo — esto es lo que realmente "ve" el autómata y lo que debe
  // pintarse en los LEDs del PLC y en la lógica del editor.
  const effectiveInputs = applyWiring(inputs, project.wiringMap);

  return (
    <>
      <style>{fontStyles}</style>
      <div className="dw-crt-overlay" />
      {booting && <div className="dw-crt-boot" />}
      <div style={{ display: "flex", height: "100vh", backgroundColor: T.dwDark, fontFamily: T.mono, overflow: "hidden" }}>

        {/* Left Sidebar: PLC & HMI */}
        <div style={{ width: 380, padding: 20, borderRight: `4px solid ${T.dwBlack}`, backgroundColor: T.dwGrey, overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center" }}>

          <div style={{ width: "100%", marginBottom: 20, textAlign: "center" }}>
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
                fontSize: 24,
                letterSpacing: 1,
                padding: "4px 0",
                textShadow: `2px 2px 0 ${T.dwBlack}`,
                textTransform: "uppercase",
              }}
            >
              ⏸ ElektriKOP
            </button>
            <p style={{ color: "#AAA", fontSize: 14, marginTop: 6, letterSpacing: 1 }}>v2.0 TIA & ElektriZIA Edition</p>
            <p style={{ color: "#777", fontSize: 11, marginTop: 2 }}>toca el logo para abrir el menú</p>

            {challengeBadge && (
              <button
                onClick={() => setMenuOpen(true)}
                title="Reabrir Modo Desafío"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10,
                  border: `1px solid ${challengeBadge.pass ? T.tiaLineActive : T.red}`,
                  backgroundColor: challengeBadge.pass ? "rgba(0,176,0,0.15)" : "rgba(255,51,51,0.15)",
                  color: "#FFF", fontFamily: T.mono, fontSize: 12, padding: "4px 10px", cursor: "pointer",
                }}
              >
                <span>{challengeBadge.pass ? "✅" : "❌"}</span>
                <span>🎯 {challengeBadge.title}</span>
              </button>
            )}
          </div>

          <SiemensPLC inputs={effectiveInputs} outputs={sim.outputs} running={sim.running} error={false} scanCount={sim.scanCount} />
          <HmiPanel inputs={inputs} onToggle={toggleInput} onPulse={setInputMomentary} deviceMap={project.deviceMap} running={sim.running} timers={sim.timerDisplay} scanCount={sim.scanCount} />

          <div style={{ display: "flex", gap: 12, marginTop: 30, width: "100%", justifyContent: "center", flexWrap: "wrap" }}>
             <PixelBtn active={sim.running} onClick={() => {
               if (sim.running) sim.playStopSound(); else sim.playRunSound();
               sim.setRunning(!sim.running);
             }}>{sim.running ? '⏸ STOP' : '▶ RUN'}</PixelBtn>
             <PixelBtn color="red" onClick={resetAll}>⟲ RESET</PixelBtn>
             <PixelBtn small color="dwGrey" onClick={sim.stepOnce} title="Ejecuta un único ciclo de scan y para">⏭ 1 CICLO</PixelBtn>
             <PixelBtn small color="dwGrey" active={!soundOn} onClick={() => setSoundOn((v) => !v)} title="Silenciar/activar el pitido de alarma">
               {soundOn ? "🔊 SONIDO" : "🔇 MUDO"}
             </PixelBtn>
          </div>
        </div>

        {/* Centro: TIA Portal Editor — solo los segmentos */}
        <div style={{ flex: 1, minWidth: 0, backgroundColor: "#EBEBEB", display: "flex", flexDirection: "column" }}>

          <div style={{ backgroundColor: "#F0F0F0", borderBottom: "1px solid #CCC", padding: "10px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
             <div>
                <div style={{ fontSize: 20, fontWeight: "bold", color: T.tiaText }}>Main [OB1]</div>
                <div style={{ fontSize: 14, color: "#666" }}>Program block (Ladder Logic)</div>
             </div>
             <div style={{ display: "flex", gap: 8 }}>
               <PixelBtn small color="dwGrey" onClick={project.undo} disabled={!project.canUndo} title="Deshacer (Ctrl+Z)">⟲ Deshacer</PixelBtn>
               <PixelBtn small color="dwGrey" onClick={project.redo} disabled={!project.canRedo} title="Rehacer (Ctrl+Shift+Z)">⟳ Rehacer</PixelBtn>
               <PixelBtn small color="dwGrey" disabled={project.rungs.length >= MAX_RUNGS} onClick={() => {
                  if (project.rungs.length < MAX_RUNGS) {
                    project.setRungs([...project.rungs, newRung(project.rungs.length ? Math.max(...project.rungs.map(r => r.id)) + 1 : 0)]);
                  }
               }}>+ Segmento</PixelBtn>
             </div>
          </div>

          <div style={{ flex: 1, padding: 20, overflowY: "auto" }}>
            <ProcessPanel
              addresses={collectUsedAddresses(project.rungs)}
              deviceMap={project.deviceMap}
              onChangeType={project.setDeviceType}
              wiringMap={project.wiringMap}
              onChangeWiring={project.setWiringFor}
              inputs={inputs}
              outputs={sim.outputs}
              visible={showProcess}
              onToggle={() => setShowProcess((v) => !v)}
            />
            {collectOutputConflicts(project.rungs).length > 0 && (
              <div style={{ background: "#FFF3CD", border: "1px solid #FFB300", color: "#7A5200", padding: "8px 12px", marginBottom: 16, fontSize: 13 }}>
                ⚠️ Direcciones de salida repetidas sin ser SET/RESET:{" "}
                {collectOutputConflicts(project.rungs)
                  .map(([addr, idxs]) => `${addr} (${idxs.map((i) => project.rungs[i].title).join(", ")})`)
                  .join(" · ")}
              </div>
            )}
            {project.rungs.map((rung, idx) => {
              const states = computeStates(rung.logic, { ...effectiveInputs, ...sim.outputs }, sim.prevMem);
              return (
                <TiaSegment
                  key={rung.id}
                  rung={rung}
                  canDelete={project.rungs.length > 1}
                  symbols={project.symbols}
                  onChange={(next) => project.setRungs(project.rungs.map((r, i) => (i === idx ? next : r)))}
                  onDelete={() => {
                    const removedId = project.rungs[idx].id;
                    sim.clearTimer(removedId);
                    project.setRungs(project.rungs.filter((_, i) => i !== idx));
                  }}
                  evalResult={{
                    states,
                    outputState: sim.outputs[rung.outAddr],
                    timerElapsed:
                      rung.outType === "ton" || rung.outType === "tof"
                        ? sim.timerDisplay[rung.id] ?? 0
                        : rung.outType === "tp"
                          ? sim.timerDisplay[rung.id]?.elapsed ?? 0
                          : undefined,
                  }}
                />
              );
            })}
            {project.rungs.length >= MAX_RUNGS && <div style={{ color: "red", textAlign: "center", marginTop: 10 }}>Límite de segmentos alcanzado ({MAX_RUNGS})</div>}
          </div>

        </div>

        {/* Derecha: Tabla de variables — mismo fondo que la barra izquierda
            para enmarcar el centro claro tipo TIA Portal entre los dos
            laterales oscuros DeWalt. Modo Desafío vive ahora en el menú
            de pausa (ver PauseMenu más abajo). */}
        <div style={{ width: 320, flexShrink: 0, backgroundColor: T.dwGrey, borderLeft: `4px solid ${T.dwBlack}`, padding: 20, overflowY: "auto" }}>
          <SymbolsPanel
            addresses={collectUsedAddresses(project.rungs)}
            symbols={project.symbols}
            onChangeSymbol={project.setSymbolFor}
            visible={showSymbols}
            onToggle={() => setShowSymbols((v) => !v)}
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
        onClear={clearAll}
        rungs={project.rungs}
        wiringMap={project.wiringMap}
        onChallengeResultChange={setChallengeBadge}
      />
    </>
  );
}
