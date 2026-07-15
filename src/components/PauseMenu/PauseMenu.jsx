import { useEffect } from "react";
import { T } from "../../utils/constants";
import { pixelBorderStyle } from "../../styles/pixelStyles";
import PixelBtn from "../shared/PixelBtn";
import ChallengePanel from "../Challenge/ChallengePanel";
import SymbolsPanel from "../SymbolsPanel";
import BlocksPanel from "./BlocksPanel";

// Una sección con el mismo lenguaje visual de card que ya usan
// SymbolsPanel/ChallengePanel (header gris + cuerpo blanco tipo TIA
// Portal) — pero sin colapsable propio: el menú entero ya cumple ese
// papel, así que aquí siempre va expandida.
function Section({ icon, title, children }) {
  return (
    <div style={{ backgroundColor: T.tiaBg, border: `2px solid ${T.dwBlack}`, boxShadow: "4px 4px 0px 0px rgba(0,0,0,0.25)" }}>
      <div style={{ backgroundColor: T.tiaHeader, padding: "6px 12px", borderBottom: `2px solid ${T.dwBlack}`, fontWeight: "bold", color: T.tiaText }}>
        {icon} {title}
      </div>
      <div style={{ padding: 14 }}>{children}</div>
    </div>
  );
}

// Menú de pausa estilo videojuego: se abre pulsando el logo "ElektriKOP"
// de la barra izquierda. Agrupa las acciones "de partida" (renombrar,
// exportar/importar/limpiar) y el Modo Desafío — todo lo que no es la
// interacción constante del editor (eso se queda fuera: RUN/RESET/1
// CICLO/SONIDO y Deshacer/Rehacer/+Segmento no son "pausa").
export default function PauseMenu({
  open,
  onClose,
  projectName,
  onRenameProject,
  onExport,
  onImportClick,
  fileInputRef,
  onFileSelected,
  importError,
  restoredFromAutosave,
  onDismissRestoredNotice,
  onClear,
  wiringMap,
  onChallengeResultChange,
  usedAddresses,
  symbols,
  onChangeSymbol,
  marks,
  simRunning,
  blocks,
  onAddBlock,
  onRenameBlock,
  onRemoveBlock,
  onAddParam,
  onRenameParam,
  onRemoveParam,
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <div
      style={{
        display: open ? "flex" : "none",
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.75)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          ...pixelBorderStyle,
          backgroundColor: T.dwGrey,
          width: 460,
          maxWidth: "90vw",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: `2px solid ${T.dwBlack}` }}>
          <span className="dw-neon-text" style={{ color: T.dwYellow, fontWeight: "bold", fontSize: 20, letterSpacing: 1 }}>⏸ MENÚ</span>
          <button
            onClick={onClose}
            title="Cerrar (Esc)"
            style={{ background: "none", border: "none", color: T.dwYellow, fontSize: 18, cursor: "pointer", lineHeight: 1, padding: 4 }}
          >✕</button>
        </div>

        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
          <Section icon="📁" title="Proyecto">
            <label style={{ display: "block", fontSize: 12, color: "#666", marginBottom: 4 }}>Nombre del proyecto</label>
            <input
              value={projectName}
              onChange={(e) => onRenameProject(e.target.value)}
              style={{
                width: "100%", boxSizing: "border-box", fontFamily: T.mono, fontSize: 14, fontWeight: "bold",
                color: "#FFFFFF", backgroundColor: T.dwDark, border: `1px solid ${T.dwGrey}`, padding: "6px 8px", marginBottom: 12,
              }}
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <PixelBtn small color="dwGrey" onClick={onExport}>💾 Exportar</PixelBtn>
              <PixelBtn small color="dwGrey" onClick={onImportClick}>📂 Importar</PixelBtn>
              <PixelBtn small color="red" onClick={onClear} title="Borra segmentos, variables y estado de la simulación">🗑 Limpiar Todo</PixelBtn>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFileSelected(file);
                e.target.value = "";
              }}
            />
            {importError && <div style={{ color: T.red, fontSize: 12, marginTop: 8 }}>{importError}</div>}
            {restoredFromAutosave && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, background: "#E3F2FD", border: "1px solid #64B5F6", color: "#0D47A1", padding: "6px 10px", marginTop: 8, fontSize: 12 }}>
                <span>↺ Proyecto restaurado automáticamente desde el autoguardado.</span>
                <button onClick={onDismissRestoredNotice} style={{ border: "none", background: "none", color: "#0D47A1", cursor: "pointer", fontWeight: "bold" }}>✕</button>
              </div>
            )}
          </Section>

          <Section icon="🏷️" title="Tabla de variables">
            <SymbolsPanel usedAddresses={usedAddresses} symbols={symbols} onChangeSymbol={onChangeSymbol} marks={marks} simRunning={simRunning} />
          </Section>

          <Section icon="🧩" title="Bloques (FC)">
            <BlocksPanel
              blocks={blocks}
              onAddBlock={onAddBlock}
              onRenameBlock={onRenameBlock}
              onRemoveBlock={onRemoveBlock}
              onAddParam={onAddParam}
              onRenameParam={onRenameParam}
              onRemoveParam={onRemoveParam}
            />
          </Section>

          <Section icon="🎯" title="Modo Desafío">
            <ChallengePanel blocks={blocks} wiringMap={wiringMap} onResultChange={onChallengeResultChange} />
          </Section>
        </div>
      </div>
    </div>
  );
}
