import { T } from "../../utils/constants";
import { pixelSelectStyle } from "../../styles/pixelStyles";
import { DeviceIcon } from "./DeviceIcons";
import { DEVICE_TYPES } from "./deviceTypes";

export default function ProcessPanel({ addresses, deviceMap, onChangeType, wiringMap, onChangeWiring, inputs, outputs, visible, onToggle }) {
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
        <span style={{ fontWeight: "bold", color: T.tiaText }}>🏭 Proceso simulado</span>
        <span style={{ color: "#888", fontSize: 12 }}>{visible ? "▲ ocultar" : "▼ mostrar"}</span>
      </div>
      {visible && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, padding: 14 }}>
          {addresses.length === 0 ? (
            <span style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>
              Aún no hay direcciones en uso — añade contactos o salidas a un segmento para que aparezcan aquí.
            </span>
          ) : (
            addresses.map((addr) => {
              const isInput = addr.startsWith("I");
              const active = isInput ? !!inputs[addr] : !!outputs[addr];
              const type = deviceMap[addr] || "none";
              const wiring = wiringMap?.[addr] || "NA";
              return (
                <div key={addr} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: 84 }}>
                  <span style={{ fontSize: 11, color: T.tiaText, fontWeight: "bold" }}>{addr}</span>
                  <DeviceIcon type={type} active={active} />
                  <select
                    value={type}
                    title={DEVICE_TYPES.find((d) => d.id === type)?.label}
                    onChange={(e) => onChangeType(addr, e.target.value)}
                    style={pixelSelectStyle({ fontSize: 10, width: "100%", fontFamily: T.mono, color: T.tiaText, padding: "2px 14px 2px 4px" })}
                  >
                    {DEVICE_TYPES.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                  {isInput && (
                    <>
                      <div
                        title="Cableado físico del dispositivo: normalmente abierto (NA) o normalmente cerrado (NC), independiente del contacto que uses en el segmento"
                        style={{ display: "flex", width: "100%", border: `1px solid ${T.dwGrey}` }}
                      >
                        <button
                          onClick={() => onChangeWiring(addr, "NA")}
                          style={{
                            flex: 1,
                            fontFamily: T.mono,
                            fontSize: 10,
                            padding: "2px 0",
                            cursor: "pointer",
                            backgroundColor: wiring === "NA" ? T.dwYellow : "#EEE",
                            color: T.dwBlack,
                            border: "none",
                            fontWeight: wiring === "NA" ? "bold" : "normal",
                          }}
                        >
                          NA
                        </button>
                        <button
                          onClick={() => onChangeWiring(addr, "NC")}
                          style={{
                            flex: 1,
                            fontFamily: T.mono,
                            fontSize: 10,
                            padding: "2px 0",
                            cursor: "pointer",
                            backgroundColor: wiring === "NC" ? T.dwYellow : "#EEE",
                            color: T.dwBlack,
                            border: "none",
                            borderLeft: `1px solid ${T.dwGrey}`,
                            fontWeight: wiring === "NC" ? "bold" : "normal",
                          }}
                        >
                          NC
                        </button>
                      </div>
                      <span style={{ fontSize: 10, color: (wiring === "NC" ? !active : active) ? T.dwYellow : "#999" }}>
                        PLC ve: {(wiring === "NC" ? !active : active) ? "1" : "0"}
                      </span>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
