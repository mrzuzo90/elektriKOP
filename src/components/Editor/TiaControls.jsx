import { T } from "../../utils/constants";
import { pixelSelectStyle } from "../../styles/pixelStyles";

export function TiaSelect({ value, onChange, options, isOut, symbols }) {
  const labelFor = (addr) => (symbols && symbols[addr] ? `${addr} · ${symbols[addr]}` : addr);
  return (
    <select
      value={value}
      title={labelFor(value)}
      onChange={(e) => onChange(e.target.value)}
      style={pixelSelectStyle({
        fontFamily: T.mono,
        fontSize: 13,
        position: "absolute",
        top: -20,
        left: isOut ? "auto" : "50%",
        right: isOut ? 0 : "auto",
        transform: isOut ? "none" : "translateX(-50%)",
        color: T.tiaText,
        outline: "none",
        // Los contactos en serie se cablean muy juntos (~60px entre
        // centros) — un select más ancho que eso se solaparía con el del
        // contacto vecino, ya que cada uno se centra sobre el suyo con
        // position:absolute. Las salidas (isOut) no tienen ese problema:
        // están solas al final de la fila, así que pueden ir más anchas.
        maxWidth: isOut ? 150 : 64,
        padding: "1px 14px 1px 4px",
        boxShadow: `1px 1px 0px 0px ${T.dwGrey}`,
      })}
    >
      {options.map((o) => <option key={o} value={o}>{labelFor(o)}</option>)}
    </select>
  );
}

export function TiaMiniBtn({ onClick, children, disabled, draggable, onDragStart, onDragEnd, title }) {
  return (
    <button
      onClick={onClick} disabled={disabled} title={title}
      draggable={draggable && !disabled} onDragStart={onDragStart} onDragEnd={onDragEnd}
      style={{
        background: "none", border: "1px dashed #CCC", fontSize: 12,
        cursor: disabled ? "default" : (draggable ? "grab" : "pointer"),
        color: disabled ? "#EEE" : "#888", margin: "0 2px", padding: "0 4px"
      }}
    >
      {children}
    </button>
  );
}

// Botón de instrucción de salida (Bobina/SET/RESET/TON...) con aspecto de
// botonera industrial retro: mismo lenguaje visual que .dw-pixel-btn
// (bisel claro arriba-izq / oscuro abajo-der en reposo, hundimiento +
// sombra invertida cuando está seleccionado), más un LED integrado que se
// enciende en verde cuando la instrucción es la activa. Además de hacer
// clic, es arrastrable: soltarlo sobre la zona de salida del segmento
// aplica el mismo cambio que el clic (ver dnd.dropOutType en TiaSegment).
export function TiaInstructionBtn({ active, onClick, label, sub, draggable, onDragStart, onDragEnd, title }) {
  return (
    <button
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      title={title}
      className="dw-pixel-btn"
      style={{
        position: "relative",
        fontFamily: T.mono,
        fontWeight: "bold",
        fontSize: 12,
        lineHeight: 1.3,
        textAlign: "center",
        minWidth: 72,
        padding: "6px 8px 6px 18px",
        color: T.tiaText,
        backgroundColor: active ? "#E2E2E2" : "#F7F7F7",
        border: `2px solid ${T.dwBlack}`,
        cursor: draggable ? "grab" : "pointer",
        boxShadow: active
          ? "inset 3px 3px 0px 0px rgba(0,0,0,0.35)"
          : "inset -2px -2px 0px 0px rgba(0,0,0,0.25), inset 2px 2px 0px 0px rgba(255,255,255,0.7), 2px 2px 0px 0px rgba(0,0,0,0.15)",
        transform: active ? "translate(2px, 2px)" : "none",
      }}
    >
      <span
        style={{
          position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)",
          width: 7, height: 7, borderRadius: "50%",
          backgroundColor: active ? T.tiaLineActive : "#C7C7C7",
          boxShadow: active ? `0 0 4px 1px ${T.tiaLineActive}` : "inset 1px 1px 1px rgba(0,0,0,0.4)",
        }}
      />
      <div>{label}</div>
      {sub && <div style={{ fontWeight: "normal", fontSize: 11, opacity: 0.75 }}>{sub}</div>}
    </button>
  );
}
