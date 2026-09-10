import { useState } from "react";
import {
  T,
  INPUT_ADDR,
  OUTPUT_ADDR,
  MARK_ADDR,
  ANALOG_ADDR,
  ANALOG_OUT_ADDR,
} from "../../utils/constants";
import PixelBtn from "../shared/PixelBtn";

const ALL_ADDRESSES = [
  ...INPUT_ADDR,
  ...OUTPUT_ADDR,
  ...MARK_ADDR,
  ...ANALOG_ADDR,
  ...ANALOG_OUT_ADDR,
];

export default function WatchForceTable({
  inputs,
  outputs,
  marks,
  analogInputs,
  analogOutputs,
  symbols = {},
  forces = {},
  onSetForce,
  onClearAllForces,
}) {
  const [rows, setRows] = useState([
    "I0.0",
    "I0.1",
    "Q0.0",
    "Q0.1",
    "M0.0",
    "IW0",
    "QW0",
  ]);
  const [selectedAddr, setSelectedAddr] = useState("I0.2");
  const [forceDrafts, setForceDrafts] = useState({});

  const getValue = (addr) => {
    if (INPUT_ADDR.includes(addr)) return Boolean(inputs[addr]);
    if (OUTPUT_ADDR.includes(addr)) return Boolean(outputs[addr]);
    if (MARK_ADDR.includes(addr)) return Boolean(marks[addr]);
    if (ANALOG_ADDR.includes(addr)) return Number(analogInputs[addr] ?? 0);
    if (ANALOG_OUT_ADDR.includes(addr)) return Number(analogOutputs[addr] ?? 0);
    return false;
  };

  const isAnalog = (addr) =>
    ANALOG_ADDR.includes(addr) || ANALOG_OUT_ADDR.includes(addr);

  const addRow = () => {
    if (selectedAddr && !rows.includes(selectedAddr)) {
      setRows([...rows, selectedAddr]);
    }
  };

  const removeRow = (addr) => {
    setRows(rows.filter((r) => r !== addr));
    if (forces[addr] !== undefined) {
      onSetForce(addr, undefined);
    }
  };

  const toggleForceBool = (addr) => {
    if (forces[addr] !== undefined) {
      onSetForce(addr, undefined);
    } else {
      const currentVal = getValue(addr);
      onSetForce(addr, !currentVal);
    }
  };

  const applyForceAnalog = (addr) => {
    const draft = forceDrafts[addr];
    if (draft !== undefined && draft !== "") {
      onSetForce(addr, Number(draft) || 0);
    } else if (forces[addr] !== undefined) {
      onSetForce(addr, undefined);
    }
  };

  const populateGroup = (group) => {
    if (group === "inputs") setRows([...new Set([...rows, ...INPUT_ADDR])]);
    if (group === "outputs") setRows([...new Set([...rows, ...OUTPUT_ADDR])]);
    if (group === "marks") setRows([...new Set([...rows, ...MARK_ADDR])]);
    if (group === "all") setRows(ALL_ADDRESSES);
  };

  const totalForces = Object.keys(forces).filter(
    (k) => forces[k] !== undefined
  ).length;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "#FFFFFF",
        fontFamily: T.mono,
        color: T.tiaText,
        overflow: "hidden",
      }}
    >
      {/* TIA Portal Tool Ribbon */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 16px",
          backgroundColor: "#E8ECED",
          borderBottom: "2px solid #BAC3CA",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 18 }}>👓</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: "bold", color: "#004B52" }}>
              Tabla de Observación y Forzado Permanente [Watch Table 1]
            </div>
            <div style={{ fontSize: 11, color: "#666" }}>
              Monitoreo y forzado en tiempo real de entradas, salidas y marcas
              S7-1200
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {totalForces > 0 && (
            <div
              style={{
                backgroundColor: "#FFF3CD",
                border: "1px solid #FFC107",
                color: "#856404",
                padding: "4px 10px",
                fontSize: 12,
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>⚡ Forzados activos: {totalForces}</span>
              <button
                onClick={onClearAllForces}
                style={{
                  backgroundColor: T.red,
                  color: "#FFF",
                  border: "none",
                  padding: "2px 6px",
                  fontSize: 11,
                  cursor: "pointer",
                  fontFamily: T.mono,
                }}
              >
                Liberar todos
              </button>
            </div>
          )}

          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => populateGroup("inputs")}
              style={{
                fontSize: 11,
                padding: "4px 8px",
                cursor: "pointer",
                backgroundColor: "#FFF",
                border: "1px solid #CCC",
                fontFamily: T.mono,
              }}
            >
              + Entradas (DI)
            </button>
            <button
              onClick={() => populateGroup("outputs")}
              style={{
                fontSize: 11,
                padding: "4px 8px",
                cursor: "pointer",
                backgroundColor: "#FFF",
                border: "1px solid #CCC",
                fontFamily: T.mono,
              }}
            >
              + Salidas (DQ)
            </button>
            <button
              onClick={() => populateGroup("marks")}
              style={{
                fontSize: 11,
                padding: "4px 8px",
                cursor: "pointer",
                backgroundColor: "#FFF",
                border: "1px solid #CCC",
                fontFamily: T.mono,
              }}
            >
              + Marcas (M)
            </button>
          </div>
        </div>
      </div>

      {/* Row add bar */}
      <div
        style={{
          display: "flex",
          gap: 10,
          padding: "8px 16px",
          backgroundColor: "#F7F9FA",
          borderBottom: "1px solid #D0D7DE",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 12, fontWeight: "bold", color: "#333" }}>
          Añadir dirección:
        </span>
        <select
          value={selectedAddr}
          onChange={(e) => setSelectedAddr(e.target.value)}
          style={{
            fontFamily: T.mono,
            fontSize: 12,
            padding: "4px 8px",
            border: "1px solid #BAC3CA",
          }}
        >
          {ALL_ADDRESSES.map((a) => (
            <option key={a} value={a}>
              {a} {symbols[a] ? `(${symbols[a]})` : ""}
            </option>
          ))}
        </select>
        <PixelBtn small color="dwGrey" onClick={addRow}>
          + Añadir a tabla
        </PixelBtn>
      </div>

      {/* Main Table */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 16px" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
            border: "1px solid #BAC3CA",
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: "#E4E7EA",
                color: "#27343F",
                textAlign: "left",
                borderBottom: "2px solid #BAC3CA",
              }}
            >
              <th style={{ padding: "8px 10px", width: 90 }}>Dirección</th>
              <th style={{ padding: "8px 10px" }}>Nombre Simbólico</th>
              <th style={{ padding: "8px 10px", width: 110 }}>Formato</th>
              <th style={{ padding: "8px 10px", width: 150 }}>
                Valor de observación
              </th>
              <th style={{ padding: "8px 10px", width: 140 }}>
                Valor de forzado
              </th>
              <th style={{ padding: "8px 10px", width: 120 }}>Estado</th>
              <th style={{ padding: "8px 10px", width: 50, textAlign: "center" }}>
                Acción
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((addr) => {
              const val = getValue(addr);
              const isForced = forces[addr] !== undefined;
              const forcedVal = forces[addr];
              const analog = isAnalog(addr);

              return (
                <tr
                  key={addr}
                  style={{
                    borderBottom: "1px solid #E1E4E8",
                    backgroundColor: isForced
                      ? "rgba(235, 120, 10, 0.08)"
                      : "transparent",
                  }}
                >
                  <td
                    style={{
                      padding: "8px 10px",
                      fontWeight: "bold",
                      color: "#004B52",
                    }}
                  >
                    %{addr}
                  </td>
                  <td style={{ padding: "8px 10px", color: "#444" }}>
                    {symbols[addr] || (
                      <span style={{ color: "#999", fontStyle: "italic" }}>
                        —
                      </span>
                    )}
                  </td>
                  <td
                    style={{
                      padding: "8px 10px",
                      fontSize: 11,
                      color: "#666",
                    }}
                  >
                    {analog ? "DEC (0..100)" : "BOOL"}
                  </td>
                  <td style={{ padding: "8px 10px" }}>
                    {analog ? (
                      <span
                        style={{
                          fontWeight: "bold",
                          fontSize: 14,
                          color: "#00646E",
                        }}
                      >
                        {val}
                      </span>
                    ) : (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontWeight: "bold",
                          color: val ? T.tiaLineActive : "#555",
                        }}
                      >
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            backgroundColor: val ? T.tiaLineActive : "#999",
                            boxShadow: val
                              ? `0 0 6px ${T.tiaLineActive}`
                              : "none",
                          }}
                        />
                        {val ? "TRUE (1)" : "FALSE (0)"}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "8px 10px" }}>
                    {analog ? (
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          placeholder={String(val)}
                          value={
                            forceDrafts[addr] !== undefined
                              ? forceDrafts[addr]
                              : isForced
                                ? forcedVal
                                : ""
                          }
                          onChange={(e) =>
                            setForceDrafts({
                              ...forceDrafts,
                              [addr]: e.target.value,
                            })
                          }
                          style={{
                            width: 60,
                            fontFamily: T.mono,
                            fontSize: 12,
                            padding: "2px 4px",
                            border: `1px solid ${isForced ? T.siemensOrange : "#CCC"}`,
                          }}
                        />
                        <button
                          onClick={() => applyForceAnalog(addr)}
                          title={isForced ? "Liberar forzado" : "Aplicar forzado"}
                          style={{
                            backgroundColor: isForced
                              ? T.siemensOrange
                              : "#EEE",
                            color: isForced ? "#FFF" : "#333",
                            border: "1px solid #CCC",
                            padding: "2px 6px",
                            fontSize: 11,
                            cursor: "pointer",
                            fontFamily: T.mono,
                          }}
                        >
                          {isForced ? "Quitar" : "Forzar"}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => toggleForceBool(addr)}
                        style={{
                          backgroundColor: isForced
                            ? forcedVal
                              ? T.tiaLineActive
                              : T.red
                            : "#EEE",
                          color: isForced ? "#FFF" : "#333",
                          border: `1px solid ${isForced ? T.siemensOrange : "#CCC"}`,
                          padding: "3px 8px",
                          fontSize: 11,
                          fontWeight: isForced ? "bold" : "normal",
                          cursor: "pointer",
                          fontFamily: T.mono,
                        }}
                      >
                        {isForced
                          ? forcedVal
                            ? "FORZADO 1"
                            : "FORZADO 0"
                          : "Forzar bit"}
                      </button>
                    )}
                  </td>
                  <td style={{ padding: "8px 10px", fontSize: 12 }}>
                    {isForced ? (
                      <span
                        style={{
                          color: T.siemensOrange,
                          fontWeight: "bold",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        ⚡ FORZADO
                      </span>
                    ) : (
                      <span style={{ color: "#888" }}>Ciclo PLC</span>
                    )}
                  </td>
                  <td style={{ padding: "8px 10px", textAlign: "center" }}>
                    <button
                      onClick={() => removeRow(addr)}
                      title="Eliminar fila"
                      style={{
                        background: "none",
                        border: "none",
                        color: "#999",
                        cursor: "pointer",
                        fontSize: 14,
                      }}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
