import { useEffect, useRef, useState } from "react";
import { T, INPUT_ADDR, OUTPUT_ADDR, MARK_ADDR, MAX_RUNGS } from "./utils/constants";
import { computeStates } from "./utils/evalNode";
import { applyWiring, collectUsedAddressesAcrossBlocks, collectOutputConflictsAcrossBlocks } from "./utils/plcIO";
import { newRung } from "./utils/ladderTree";
import { fontStyles } from "./styles/pixelStyles";
import PixelBtn from "./components/shared/PixelBtn";
import ProcessPanel from "./components/ProcessPanel/ProcessPanel";
import PauseMenu from "./components/PauseMenu/PauseMenu";
import SiemensPLC from "./components/Cabinet/SiemensPLC";
import HmiPanel from "./components/HMI/HmiPanel";
import TiaSegment from "./components/Editor/TiaSegment";
import { useSimulation } from "./hooks/useSimulation";
import { useProject } from "./hooks/useProject";

function zeroInputs() {
  return Object.fromEntries(INPUT_ADDR.map((a) => [a, false]));
}

// timerDisplay ahora indexa por ruta de llamada completa ("main:7" o
// "main:2>fc1:3", ver scanCycle.js), no por rung.id a secas — para pintar el
// segmento de un bloque cualquiera hay que buscar la última clave (la
// llamada más reciente este tick) cuyo tramo final sea justo
// "blockId:rungId", igual que hace clearTimer en useSimulation.js.
function timerValueFor(timerDisplay, blockId, rungId) {
  const suffix = `${blockId}:${rungId}`;
  let found;
  Object.keys(timerDisplay).forEach((key) => {
    if (key === suffix || key.endsWith(`>${suffix}`)) found = timerDisplay[key];
  });
  return found;
}

// ---------------------------------------------------------------------------
// App Principal
// ---------------------------------------------------------------------------
export default function PlcEmulator() {
  const [inputs, setInputs] = useState(zeroInputs);
  const [showProcess, setShowProcess] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [booting, setBooting] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  // Bloque que se está editando en el centro (Main o un FC) — vive fuera de
  // `project` porque es solo un foco de UI, no dato de proyecto.
  const [activeBlockId, setActiveBlockId] = useState("main");
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
  const mainBlock = project.blocks.find((b) => b.id === "main");
  const activeBlock = project.blocks.find((b) => b.id === activeBlockId) || mainBlock;
  const isMainActive = activeBlock.id === "main";

  // El motor de scan recorre Main y, desde ahí, cualquier llamada a FC —
  // por eso recibe todos los bloques, no solo el que se está editando.
  const sim = useSimulation({
    inputs,
    blocks: project.blocks,
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

  // Atajos de teclado del Panel HMI (idea del usuario, 2026-07-15): las
  // teclas 0-9 mapean 1:1 al orden de INPUT_ADDR (0→I0.0 ... 7→I0.7,
  // 8→I1.0, 9→I1.1), para poder operar entradas sin ratón en clase. Un
  // pulsador se mantiene activo mientras se mantiene la tecla (igual que el
  // ratón); cualquier otro tipo (interruptor, seta de PARO...) alterna con
  // cada pulsación, igual que un clic — misma distinción que ya hace
  // HmiPanel.jsx entre onToggle/onPulse. Refs para no reenganchar el
  // listener en cada render (mismo patrón que undo/redo en useProject.js).
  const deviceMapRef = useRef(project.deviceMap);
  deviceMapRef.current = project.deviceMap;
  const toggleInputRef = useRef(toggleInput);
  toggleInputRef.current = toggleInput;
  const setInputMomentaryRef = useRef(setInputMomentary);
  setInputMomentaryRef.current = setInputMomentary;

  useEffect(() => {
    const isTextTarget = (el) => el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
    const addrForKey = (key) => (/^[0-9]$/.test(key) ? INPUT_ADDR[Number(key)] : undefined);
    const onKeyDown = (e) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || isTextTarget(e.target)) return;
      const addr = addrForKey(e.key);
      if (!addr) return;
      if (deviceMapRef.current?.[addr] === "pulsador") setInputMomentaryRef.current(addr, true);
      else toggleInputRef.current(addr);
    };
    const onKeyUp = (e) => {
      if (isTextTarget(e.target)) return;
      const addr = addrForKey(e.key);
      if (!addr) return;
      if (deviceMapRef.current?.[addr] === "pulsador") setInputMomentaryRef.current(addr, false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, []);

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
    setActiveBlockId("main");
  };

  const handleFileSelected = (file) => {
    project.importProject(file, {
      onSuccess: () => {
        setInputs(zeroInputs());
        sim.resetSimulation();
        setActiveBlockId("main");
      },
    });
  };

  // Entradas ya convertidas según el cableado físico (NA/NC) de cada
  // dispositivo — esto es lo que realmente "ve" el autómata y lo que debe
  // pintarse en los LEDs del PLC y en la lógica del editor.
  const effectiveInputs = applyWiring(inputs, project.wiringMap);

  // Direccionamiento local de un FC: sus parámetros IN/OUT se referencian
  // como "#<paramId>" (opaco, no el nombre) en los desplegables de
  // contacto/salida del editor — así renombrar un parámetro no rompe el
  // cableado existente. symbolsForEditor añade el alias solo para mostrarlo.
  // Un contacto puede leer cualquier I/Q físico y cualquier parámetro propio
  // (IN u OUT); la salida de un rung (bobina/SET/RESET/temporizador) solo
  // puede escribir en Q físico o en un OUT propio — nunca en un IN (es de
  // solo lectura dentro del FC) ni en una dirección física de entrada.
  const isFc = activeBlock.kind === "fc";
  const localIn = isFc ? activeBlock.interface.in : [];
  const localOut = isFc ? activeBlock.interface.out : [];
  const localParams = [...localIn, ...localOut];
  const symbolsForEditor = {
    ...project.symbols,
    ...Object.fromEntries(localParams.map((p) => [`#${p.id}`, p.name])),
  };
  const contactAddrOptions = [...INPUT_ADDR, ...OUTPUT_ADDR, ...MARK_ADDR, ...localParams.map((p) => `#${p.id}`)];
  const outputAddrOptions = [...OUTPUT_ADDR, ...MARK_ADDR, ...localOut.map((p) => `#${p.id}`)];

  // Mismo orden que collectOutputConflictsAcrossBlocks (blocks.flatMap(b =>
  // b.rungs)), con el nombre del bloque adjunto — así el aviso de "salida
  // repetida" puede señalar en qué bloque vive cada rung en conflicto,
  // necesario ahora que el aviso cubre todo el proyecto y no solo Main.
  const flatRungsWithBlock = project.blocks.flatMap((b) => b.rungs.map((rung) => ({ rung, blockName: b.name })));
  const outputConflicts = collectOutputConflictsAcrossBlocks(project.blocks);

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

          <div style={{ backgroundColor: "#F0F0F0", borderBottom: "1px solid #CCC" }}>
            {/* Pestañas de bloque: Main + cada FC. El bloque activo es solo
                un foco de UI (activeBlockId), no cambia qué se simula. */}
            <div style={{ display: "flex", gap: 4, padding: "8px 20px 0", flexWrap: "wrap" }}>
              {project.blocks.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setActiveBlockId(b.id)}
                  title={b.kind === "main" ? "Main [OB1]" : `Función ${b.name}`}
                  style={{
                    fontFamily: T.mono, fontWeight: "bold", fontSize: 13, padding: "6px 14px", cursor: "pointer",
                    border: `2px solid ${T.dwBlack}`, borderBottom: "none",
                    backgroundColor: b.id === activeBlock.id ? T.tiaBg : "#D8D8D8",
                    color: T.tiaText,
                  }}
                >
                  {b.name}
                </button>
              ))}
            </div>
            <div style={{ padding: "10px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `2px solid ${T.dwBlack}` }}>
               <div>
                  <div style={{ fontSize: 20, fontWeight: "bold", color: T.tiaText }}>{activeBlock.name} [{isMainActive ? "OB1" : "FC"}]</div>
                  <div style={{ fontSize: 14, color: "#666" }}>Program block (Ladder Logic)</div>
               </div>
               <div style={{ display: "flex", gap: 8 }}>
                 <PixelBtn small color="dwGrey" onClick={project.undo} disabled={!project.canUndo} title="Deshacer (Ctrl+Z)">⟲ Deshacer</PixelBtn>
                 <PixelBtn small color="dwGrey" onClick={project.redo} disabled={!project.canRedo} title="Rehacer (Ctrl+Shift+Z)">⟳ Rehacer</PixelBtn>
                 <PixelBtn small color="dwGrey" disabled={activeBlock.rungs.length >= MAX_RUNGS} onClick={() => {
                    if (activeBlock.rungs.length < MAX_RUNGS) {
                      project.setBlockRungs(activeBlock.id, [...activeBlock.rungs, newRung(activeBlock.rungs.length ? Math.max(...activeBlock.rungs.map(r => r.id)) + 1 : 0)]);
                    }
                 }}>+ Segmento</PixelBtn>
               </div>
            </div>
          </div>

          <div style={{ flex: 1, padding: 20, overflowY: "auto" }}>
            {outputConflicts.length > 0 && (
              <div style={{ background: "#FFF3CD", border: "1px solid #FFB300", color: "#7A5200", padding: "8px 12px", marginBottom: 16, fontSize: 13 }}>
                ⚠️ Direcciones de salida repetidas sin ser SET/RESET (en todo el proyecto, no solo en este bloque):{" "}
                {outputConflicts
                  .map(([addr, idxs]) => `${addr} (${idxs.map((i) => `${flatRungsWithBlock[i].blockName}:${flatRungsWithBlock[i].rung.title}`).join(", ")})`)
                  .join(" · ")}
              </div>
            )}
            {activeBlock.rungs.map((rung, idx) => {
              // El motor recorre todos los bloques, así que cualquier
              // bloque que se esté editando refleja simulación real — para
              // un FC, sus #param se resuelven con el último marco
              // (lastCallFrames) con el que se ejecutó ese ciclo (decisión
              // ya confirmada: "último marco ejecutado", no multi-instancia).
              const frame = sim.lastCallFrames[activeBlock.id] || {};
              const mem = { ...effectiveInputs, ...sim.outputs, ...sim.marks, ...frame };
              const states = computeStates(rung.logic, mem, sim.prevMem);
              // Bloque SR/RS: red R1 aparte de la red S — se fusiona en el
              // mismo mapa `states` (los ids de nodo son únicos vía
              // genId(), así que no hay colisión) para que TiaSegment no
              // tenga que distinguir de dónde viene cada estado.
              if (rung.outType === "sr" || rung.outType === "rs") {
                computeStates(rung.logicR || [], mem, sim.prevMem, states);
              }
              const rawTimer = timerValueFor(sim.timerDisplay, activeBlock.id, rung.id);
              return (
                <TiaSegment
                  key={rung.id}
                  rung={rung}
                  canDelete={activeBlock.rungs.length > 1}
                  symbols={symbolsForEditor}
                  addrOptions={contactAddrOptions}
                  outputAddrOptions={outputAddrOptions}
                  blocks={project.blocks}
                  currentBlockId={activeBlock.id}
                  onChange={(next) => project.setBlockRungs(activeBlock.id, activeBlock.rungs.map((r, i) => (i === idx ? next : r)))}
                  onDelete={() => {
                    const removedId = activeBlock.rungs[idx].id;
                    sim.clearTimer(activeBlock.id, removedId);
                    project.setBlockRungs(activeBlock.id, activeBlock.rungs.filter((_, i) => i !== idx));
                  }}
                  evalResult={{
                    states,
                    outputState: rung.outAddr?.startsWith("#") ? frame[rung.outAddr] : (sim.outputs[rung.outAddr] ?? sim.marks[rung.outAddr]),
                    timerElapsed:
                      rung.outType === "ton" || rung.outType === "tof"
                        ? rawTimer ?? 0
                        : rung.outType === "tp"
                          ? rawTimer?.elapsed ?? 0
                          : undefined,
                    counterValue: rung.outType === "ctu" || rung.outType === "ctd" ? rawTimer?.count ?? 0 : undefined,
                  }}
                />
              );
            })}
            {activeBlock.rungs.length >= MAX_RUNGS && <div style={{ color: "red", textAlign: "center", marginTop: 10 }}>Límite de segmentos alcanzado ({MAX_RUNGS})</div>}
          </div>

        </div>

        {/* Derecha: Proceso simulado — mismo fondo que la barra izquierda
            para enmarcar el centro claro tipo TIA Portal entre los dos
            laterales oscuros DeWalt. Con scroll propio, independiente del
            centro: se queda visible mientras navegas por los segmentos,
            en vez de perderse de vista al hacer scroll como pasaba cuando
            vivía arriba del todo en el centro. Tabla de Variables y Modo
            Desafío viven ahora en el menú de pausa (ver PauseMenu). */}
        <div style={{ width: 320, flexShrink: 0, backgroundColor: T.dwGrey, borderLeft: `4px solid ${T.dwBlack}`, padding: 20, overflowY: "auto" }}>
          <ProcessPanel
            addresses={collectUsedAddressesAcrossBlocks(project.blocks).filter((a) => !a.startsWith("M"))}
            deviceMap={project.deviceMap}
            onChangeType={project.setDeviceType}
            wiringMap={project.wiringMap}
            onChangeWiring={project.setWiringFor}
            inputs={inputs}
            outputs={sim.outputs}
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
      />
    </>
  );
}
