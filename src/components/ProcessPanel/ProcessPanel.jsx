import { T } from "../../utils/constants";
import { pixelSelectStyle } from "../../styles/pixelStyles";
import { DeviceIcon } from "./DeviceIcons";
import { DEVICE_TYPES } from "./deviceTypes";

// Vive en la barra lateral derecha (320px): 2 dispositivos por fila con
// iconos grandes (64px) — con más de 2 columnas los iconos se quedarían
// diminutos en ese ancho, y con 1 sola el panel crecería demasiado rápido
// según se añaden dispositivos, obligando a hacer scroll antes de lo
// necesario.
export default function ProcessPanel({ addresses, deviceMap, onChangeType, wiringMap, onChangeWiring, inputs, outputs, analogInputs, onChangeAnalog, visible, onToggle }) {
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14, padding: 14 }}>
          {addresses.length === 0 ? (
            <span style={{ gridColumn: "1 / -1", fontSize: 12, color: "#888", fontStyle: "italic" }}>
              Aún no hay direcciones en uso — añade contactos o salidas a un segmento para que aparezcan aquí.
            </span>
          ) : (
            addresses.map((addr) => {
              // Entrada analógica (IW): antes de la comprobación "empieza
              // por I" de más abajo, porque "IW0" también la cumpliría y se
              // trataría como un bit digital — un sensor de nivel/temperatura
              // simulado no tiene NA/NC ni icono de dispositivo, se controla
              // con un slider numérico (0-100), no un clic on/off.
              if (addr.startsWith("IW")) {
                const value = analogInputs?.[addr] ?? 0;
                return (
                  <div key={addr} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13, color: T.tiaText, fontWeight: "bold" }}>{addr}</span>
                    <span style={{ fontSize: 32, lineHeight: 1 }} title="Sensor analógico simulado">🌡️</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={value}
                      onChange={(e) => onChangeAnalog(addr, Number(e.target.value))}
                      style={{ width: "100%" }}
                      title={`${addr}: ${value}`}
                    />
                    <span style={{ fontSize: 12, color: T.tiaText, fontWeight: "bold" }}>{value}</span>
                  </div>
                );
              }
              const isInput = addr.startsWith("I");
              const active = isInput ? !!inputs[addr] : !!outputs[addr];
              const type = deviceMap[addr] || "none";
              const wiring = wiringMap?.[addr] || "NA";
              return (
                <div key={addr} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 13, color: T.tiaText, fontWeight: "bold" }}>{addr}</span>
                  <DeviceIcon type={type} active={active} size={64} />
                  <select
                    value={type}
                    title={DEVICE_TYPES.find((d) => d.id === type)?.label}
                    onChange={(e) => onChangeType(addr, e.target.value)}
                    style={pixelSelectStyle({ fontSize: 11, width: "100%", fontFamily: T.mono, color: T.tiaText, padding: "3px 16px 3px 6px" })}
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
                            fontSize: 11,
                            padding: "3px 0",
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
                            fontSize: 11,
                            padding: "3px 0",
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
                      <span style={{ fontSize: 11, color: (wiring === "NC" ? !active : active) ? T.dwYellow : "#999" }}>
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
