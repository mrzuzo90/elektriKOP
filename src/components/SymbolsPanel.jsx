import { useState } from "react";
import { T, INPUT_ADDR, OUTPUT_ADDR, MARK_ADDR } from "../utils/constants";
import { pixelSelectStyle } from "../styles/pixelStyles";
import PixelBtn from "./shared/PixelBtn";

const ALL_ADDR = [...INPUT_ADDR, ...OUTPUT_ADDR, ...MARK_ADDR];

// Vive como sección dentro del menú de pausa — ya no es un panel
// colapsable propio (ver ChallengePanel.jsx para el mismo cambio).
//
// usedAddresses: direcciones que YA aparecen en algún segmento (como
// antes). Pero la tabla ya no se limita a esas: cualquier dirección con un
// nombre asignado en `symbols` se sigue mostrando aunque se deje de usar,
// y el botón "+" permite reservar y nombrar una dirección todavía sin usar
// — así se puede planear el nombrado antes de montar el circuito, en vez
// de esperar a haber colocado el contacto/bobina correspondiente.
export default function SymbolsPanel({ usedAddresses, symbols, onChangeSymbol, marks, simRunning }) {
  const [adding, setAdding] = useState(false);
  const [draftAddr, setDraftAddr] = useState("");
  const [draftName, setDraftName] = useState("");

  const namedAddresses = Object.keys(symbols).filter((a) => symbols[a]);
  const shown = new Set([...usedAddresses, ...namedAddresses]);
  const addresses = ALL_ADDR.filter((a) => shown.has(a));
  const available = ALL_ADDR.filter((a) => !shown.has(a));

  const startAdding = () => {
    setDraftAddr(available[0] ?? "");
    setDraftName("");
    setAdding(true);
  };
  const confirmAdd = () => {
    if (!draftAddr || !draftName.trim()) return;
    onChangeSymbol(draftAddr, draftName.trim());
    setAdding(false);
  };

  return (
    <div>
      {addresses.length === 0 && !adding ? (
        <span style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>
          Aún no hay variables — añade una con el botón de abajo, o usa una dirección en un segmento.
        </span>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
          {addresses.map((addr) => (
            // minWidth:0 en la fila y en el input: un flex/grid item tiene
            // min-width:auto por defecto, que se calcula a partir de su
            // contenido — sin esto, un <input> con flex:1 nunca se encoge
            // por debajo de su ancho intrínseco y se sale de la tarjeta.
            <div key={addr} style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
              {/* Punto de estado en vivo, solo para marcas (M): al ser
                  memoria interna sin panel HMI/Proceso simulado propio,
                  este es el único sitio donde se puede "ver" su valor sin
                  montar un contacto de prueba. */}
              {addr.startsWith("M") && (
                <span
                  title={simRunning ? (marks?.[addr] ? "Activa" : "Inactiva") : "Simulación parada"}
                  style={{
                    width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                    backgroundColor: simRunning && marks?.[addr] ? T.tiaLineActive : "#CCC",
                    border: `1px solid ${T.dwGrey}`,
                  }}
                />
              )}
              <span style={{ fontFamily: T.mono, fontSize: 13, color: T.tiaText, width: 46, flexShrink: 0 }}>{addr}</span>
              <input
                value={symbols[addr] || ""}
                onChange={(e) => onChangeSymbol(addr, e.target.value)}
                placeholder="ej. Marcha M1"
                title={symbols[addr] || ""}
                style={{
                  fontFamily: T.mono,
                  fontSize: 13,
                  flex: 1,
                  minWidth: 0,
                  boxSizing: "border-box",
                  border: `1px solid ${T.dwGrey}`,
                  padding: "3px 6px",
                  backgroundColor: T.dwDark,
                  color: "#FFFFFF",
                }}
              />
              <button
                onClick={() => onChangeSymbol(addr, "")}
                title="Borrar nombre"
                style={{ background: "none", border: "none", color: "#999", cursor: "pointer", fontSize: 12, padding: 0, flexShrink: 0 }}
              >✕</button>
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
          <select
            value={draftAddr}
            onChange={(e) => setDraftAddr(e.target.value)}
            style={pixelSelectStyle({ fontSize: 13, fontFamily: T.mono, color: T.tiaText, padding: "3px 20px 3px 6px" })}
          >
            {available.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && confirmAdd()}
            placeholder="Nombre de la variable"
            style={{ fontFamily: T.mono, fontSize: 13, flex: 1, minWidth: 100, boxSizing: "border-box", border: `1px solid ${T.dwGrey}`, padding: "3px 6px", backgroundColor: T.dwDark, color: "#FFFFFF" }}
          />
          <PixelBtn small color="dwGrey" onClick={confirmAdd} disabled={!draftName.trim()}>✓ Añadir</PixelBtn>
          <PixelBtn small color="dwGrey" onClick={() => setAdding(false)}>✕</PixelBtn>
        </div>
      ) : (
        <div style={{ marginTop: 10 }}>
          <PixelBtn small color="dwGrey" onClick={startAdding} disabled={available.length === 0}>
            + Añadir variable
          </PixelBtn>
        </div>
      )}
    </div>
  );
}
