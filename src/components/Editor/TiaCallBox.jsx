import { T } from "../../utils/constants";
import { pixelSelectStyle } from "../../styles/pixelStyles";
import { TiaLine } from "./TiaGraphics";

// Desplegable de cableado de un pin IN/OUT — mismo estilo que TiaSelect,
// pero SIN su position:absolute (TiaSelect está pensado para flotar sobre
// un único ancla pequeña, p.ej. un contacto; aquí necesitamos varias filas
// en flujo normal dentro de la caja, así que se posiciona en línea).
export function PinWiringSelect({ value, onChange, options, symbols }) {
  const labelFor = (addr) => (symbols && symbols[addr] ? `${addr} · ${symbols[addr]}` : addr);
  return (
    <select
      value={value || ""}
      title={value ? labelFor(value) : "Sin cablear"}
      onChange={(e) => onChange(e.target.value || null)}
      style={pixelSelectStyle({ fontFamily: T.mono, fontSize: 11, color: T.tiaText, maxWidth: 90, padding: "1px 14px 1px 4px" })}
    >
      <option value="">—</option>
      {options.map((o) => <option key={o} value={o}>{labelFor(o)}</option>)}
    </select>
  );
}

// Instrucción "Llamar a bloque" (CALL): generaliza el patrón visual "caja
// con filas" de TiaTonBox, pero con una lista dinámica de pines IN/OUT (uno
// por parámetro de la interfaz del bloque destino) en vez de las 3 filas
// fijas de un temporizador.
export default function TiaCallBox({ rung, targetBlock, availableTargets, onChangeTarget, onChangeWiring, addrOptions, symbols, flowIn }) {
  const color = flowIn ? T.tiaLineActive : T.tiaLine;
  const ins = targetBlock?.interface.in || [];
  const outs = targetBlock?.interface.out || [];
  const rowCount = Math.max(ins.length, outs.length);

  return (
    <div style={{ display: "flex", alignItems: "flex-start" }}>
      <TiaLine active={flowIn} size={8} />
      <div
        style={{
          border: `3px solid ${color}`,
          backgroundColor: "#FFF",
          minWidth: 200,
          padding: "2px 8px 6px",
          position: "relative",
          boxShadow: `2px 2px 0px 0px rgba(0,0,0,0.15)`,
        }}
      >
        <div style={{ fontSize: 12, lineHeight: 1.2, textAlign: "center", fontWeight: "bold", borderBottom: `1px solid ${color}`, color: T.tiaText, padding: "2px 0" }}>
          CALL
        </div>

        <select
          value={rung.callTarget || ""}
          onChange={(e) => onChangeTarget(e.target.value || null)}
          style={pixelSelectStyle({ width: "100%", fontFamily: T.mono, fontSize: 12, color: T.tiaText, margin: "4px 0" })}
        >
          <option value="">— elegir FC —</option>
          {availableTargets.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        {!targetBlock ? (
          <div style={{ fontSize: 11, color: T.red, fontStyle: "italic", padding: "2px 0" }}>
            Elige un bloque FC destino para esta llamada.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {Array.from({ length: rowCount }).map((_, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 4 }}>
                  {ins[i] && (
                    <>
                      <PinWiringSelect
                        value={rung.paramWiring?.[ins[i].id]}
                        onChange={(v) => onChangeWiring(ins[i].id, v)}
                        options={addrOptions}
                        symbols={symbols}
                      />
                      <span title={ins[i].name} style={{ fontSize: 11, color: T.tiaText, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ins[i].name}</span>
                    </>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                  {outs[i] && (
                    <>
                      <span title={outs[i].name} style={{ fontSize: 11, color: T.tiaText, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{outs[i].name}</span>
                      <PinWiringSelect
                        value={rung.paramWiring?.[outs[i].id]}
                        onChange={(v) => onChangeWiring(outs[i].id, v)}
                        options={addrOptions}
                        symbols={symbols}
                      />
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <TiaLine active={flowIn} size={8} />
    </div>
  );
}
