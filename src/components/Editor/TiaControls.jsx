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

export function TiaMiniBtn({ onClick, children, disabled }) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      style={{
        background: "none", border: "1px dashed #CCC", fontSize: 12, cursor: disabled ? "default" : "pointer",
        color: disabled ? "#EEE" : "#888", margin: "0 2px", padding: "0 4px"
      }}
    >
      {children}
    </button>
  );
}
