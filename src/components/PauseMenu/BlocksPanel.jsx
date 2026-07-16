import { useState } from "react";
import { T } from "../../utils/constants";
import { isBlockCalled } from "../../utils/blocks";
import PixelBtn from "../shared/PixelBtn";

// Editor de interfaz IN/OUT de un FC — mismo patrón "+ Añadir variable" que
// SymbolsPanel.jsx (input inline + botón ✓/✕), aplicado a una lista de
// parámetros en vez de a direcciones físicas.
function ParamList({ direction, label, params, onAdd, onRename, onRemove }) {
  const [adding, setAdding] = useState(false);
  const [draftName, setDraftName] = useState("");

  const confirmAdd = () => {
    if (!draftName.trim()) return;
    onAdd(direction, draftName.trim());
    setDraftName("");
    setAdding(false);
  };

  return (
    <div style={{ marginTop: 6 }}>
      <span style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
      {params.length === 0 && !adding && (
        <div style={{ fontSize: 12, color: "#AAA", fontStyle: "italic", marginTop: 2 }}>Sin parámetros</div>
      )}
      {params.map((p) => (
        <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, minWidth: 0 }}>
          <input
            value={p.name}
            onChange={(e) => onRename(direction, p.id, e.target.value)}
            style={{
              fontFamily: T.mono, fontSize: 13, flex: 1, minWidth: 0, boxSizing: "border-box",
              border: `1px solid ${T.dwGrey}`, padding: "3px 6px", backgroundColor: T.dwDark, color: "#FFFFFF",
            }}
          />
          <button
            onClick={() => onRemove(direction, p.id)}
            title="Quitar parámetro"
            style={{ background: "none", border: "none", color: "#999", cursor: "pointer", fontSize: 12, padding: 0, flexShrink: 0 }}
          >✕</button>
        </div>
      ))}
      {adding ? (
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
          <input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && confirmAdd()}
            placeholder="Nombre del parámetro"
            style={{ fontFamily: T.mono, fontSize: 13, flex: 1, minWidth: 0, boxSizing: "border-box", border: `1px solid ${T.dwGrey}`, padding: "3px 6px", backgroundColor: T.dwDark, color: "#FFFFFF" }}
          />
          <PixelBtn small color="dwGrey" onClick={confirmAdd} disabled={!draftName.trim()}>✓</PixelBtn>
          <PixelBtn small color="dwGrey" onClick={() => setAdding(false)}>✕</PixelBtn>
        </div>
      ) : (
        <div style={{ marginTop: 4 }}>
          <PixelBtn small color="dwGrey" onClick={() => setAdding(true)}>+ Añadir {label.toLowerCase()}</PixelBtn>
        </div>
      )}
    </div>
  );
}

function BlockCard({ block, blocks, onRename, onRemove, onAddParam, onRenameParam, onRemoveParam }) {
  const called = isBlockCalled(blocks, block.id);
  const isFb = block.kind === "fb";
  return (
    <div style={{ border: `1px solid ${T.dwGrey}`, padding: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
        <input
          value={block.name}
          onChange={(e) => onRename(block.id, e.target.value)}
          style={{
            fontFamily: T.mono, fontSize: 14, fontWeight: "bold", flex: 1, minWidth: 0, boxSizing: "border-box",
            border: `1px solid ${T.dwGrey}`, padding: "4px 6px", backgroundColor: T.dwDark, color: "#FFFFFF",
          }}
        />
        <PixelBtn
          small color="red"
          disabled={called}
          title={called ? `No se puede eliminar: hay al menos un sitio de llamada activo a este ${isFb ? "FB" : "FC"}` : `Eliminar este ${isFb ? "FB" : "FC"}`}
          onClick={() => onRemove(block.id)}
        >🗑</PixelBtn>
      </div>
      <ParamList direction="in" label="IN" params={block.interface.in} onAdd={(dir, name) => onAddParam(block.id, dir, name)} onRename={(dir, id, name) => onRenameParam(block.id, dir, id, name)} onRemove={(dir, id) => onRemoveParam(block.id, dir, id)} />
      <ParamList direction="out" label="OUT" params={block.interface.out} onAdd={(dir, name) => onAddParam(block.id, dir, name)} onRename={(dir, id, name) => onRenameParam(block.id, dir, id, name)} onRemove={(dir, id) => onRemoveParam(block.id, dir, id)} />
      {isFb && (
        <ParamList direction="static" label="STATIC" params={block.interface.static || []} onAdd={(dir, name) => onAddParam(block.id, dir, name)} onRename={(dir, id, name) => onRenameParam(block.id, dir, id, name)} onRemove={(dir, id) => onRemoveParam(block.id, dir, id)} />
      )}
    </div>
  );
}

// Vive como sección dentro del menú de pausa (ver PauseMenu.jsx). Gestiona
// los FCs y FBs (crear/renombrar/eliminar + su interfaz) — el bloque Main
// no aparece aquí, se edita siempre desde el editor central. FC y FB
// comparten toda la mecánica de llamada (instrucción "Llamar", IN/OUT); la
// única diferencia real es que un FB añade STATIC, una memoria propia por
// sitio de llamada que persiste entre ciclos de scan (a diferencia de
// IN/OUT, que se recalculan en cada llamada) — por eso vive en su propia
// sección en vez de mezclarse con los FC.
export default function BlocksPanel({ blocks, onAddBlock, onRenameBlock, onRemoveBlock, onAddParam, onRenameParam, onRemoveParam }) {
  const fcs = blocks.filter((b) => b.kind === "fc");
  const fbs = blocks.filter((b) => b.kind === "fb");
  return (
    <div>
      <p style={{ fontSize: 12, color: "#666", marginTop: 0 }}>
        Los FC son funciones reutilizables con su propia interfaz IN/OUT, llamables desde Main o desde otro FC con la
        instrucción "Llamar". Un FB es igual, pero además tiene memoria STATIC propia por sitio de llamada, que
        persiste entre ciclos de scan (a diferencia de IN/OUT, que se recalculan en cada llamada).
      </p>

      <span style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>Bloques FC</span>
      {fcs.length === 0 && (
        <div style={{ fontSize: 12, color: "#888", fontStyle: "italic", marginTop: 4 }}>Aún no hay ningún FC — crea uno con el botón de abajo.</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: fcs.length ? 6 : 6 }}>
        {fcs.map((block) => (
          <BlockCard
            key={block.id}
            block={block}
            blocks={blocks}
            onRename={onRenameBlock}
            onRemove={onRemoveBlock}
            onAddParam={onAddParam}
            onRenameParam={onRenameParam}
            onRemoveParam={onRemoveParam}
          />
        ))}
      </div>
      <div style={{ marginTop: 10 }}>
        <PixelBtn small color="dwGrey" onClick={() => onAddBlock("fc")}>+ Nuevo FC</PixelBtn>
      </div>

      <span style={{ display: "block", fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginTop: 16 }}>Bloques FB</span>
      {fbs.length === 0 && (
        <div style={{ fontSize: 12, color: "#888", fontStyle: "italic", marginTop: 4 }}>Aún no hay ningún FB — crea uno con el botón de abajo.</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: fbs.length ? 6 : 6 }}>
        {fbs.map((block) => (
          <BlockCard
            key={block.id}
            block={block}
            blocks={blocks}
            onRename={onRenameBlock}
            onRemove={onRemoveBlock}
            onAddParam={onAddParam}
            onRenameParam={onRenameParam}
            onRemoveParam={onRemoveParam}
          />
        ))}
      </div>
      <div style={{ marginTop: 10 }}>
        <PixelBtn small color="dwGrey" onClick={() => onAddBlock("fb")}>+ Nuevo FB</PixelBtn>
      </div>
    </div>
  );
}
