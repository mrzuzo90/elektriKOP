import { T } from "../utils/constants";

export default function SymbolsPanel({ addresses, symbols, onChangeSymbol, visible, onToggle }) {
  return (
    <div style={{ backgroundColor: T.tiaBg, border: `2px solid ${T.dwBlack}`, boxShadow: "4px 4px 0px 0px rgba(0,0,0,0.25)", marginBottom: 20 }}>
      <div
        onClick={onToggle}
        style={{
          backgroundColor: T.tiaHeader,
          padding: "6px 12px",
          borderBottom: visible ? `2px solid ${T.dwBlack}` : "none",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
        }}
      >
        <span style={{ fontWeight: "bold", color: T.tiaText }}>🏷️ Tabla de variables</span>
        <span style={{ color: "#888", fontSize: 12 }}>{visible ? "▲ ocultar" : "▼ mostrar"}</span>
      </div>
      {visible && (
        <div style={{ padding: 14 }}>
          {addresses.length === 0 ? (
            <span style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>
              Aún no hay direcciones en uso — añade contactos o salidas a un segmento para nombrarlas aquí.
            </span>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
              {addresses.map((addr) => (
                // minWidth:0 en la fila y en el input: un flex/grid item
                // tiene min-width:auto por defecto, que se calcula a partir
                // de su contenido — sin esto, un <input> con flex:1 nunca
                // se encoge por debajo de su ancho intrínseco (~200px de
                // fábrica en la mayoría de navegadores) y se sale de la
                // tarjeta en vez de encogerse, por ancho que escribas.
                <div key={addr} style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
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
                      color: T.tiaText,
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
