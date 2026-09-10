import { useState } from "react";
import { T } from "../../utils/constants";
import PixelBtn from "../shared/PixelBtn";

export default function DiagnosticBufferView({
  events = [],
  onClear,
  onExport,
  scanCycleTimeMs = "1.1",
  scanCount = 0,
  running = false,
}) {
  const [filter, setFilter] = useState("all"); // 'all' | 'warning_error'
  const [selectedEvent, setSelectedEvent] = useState(null);

  const filteredEvents = events.filter((e) => {
    if (filter === "warning_error") {
      return e.severity === "warning" || e.severity === "error";
    }
    return true;
  });

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
      {/* TIA Portal Diagnostics Header */}
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
          <span style={{ fontSize: 18 }}>🩺</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: "bold", color: "#004B52" }}>
              Diagnóstico y Memoria de Eventos [SIMATIC S7-1200 CPU 1214C]
            </div>
            <div style={{ fontSize: 11, color: "#666" }}>
              Buffer de diagnóstico en anillo · Registro de eventos del sistema y
              estados operativos
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              fontFamily: T.mono,
              fontSize: 12,
              padding: "4px 8px",
              border: "1px solid #BAC3CA",
            }}
          >
            <option value="all">Todos los eventos ({events.length})</option>
            <option value="warning_error">
              Solo advertencias y errores (
              {
                events.filter(
                  (e) => e.severity === "warning" || e.severity === "error"
                ).length
              }
              )
            </option>
          </select>
          <PixelBtn small color="dwGrey" onClick={onExport}>
            📥 Exportar Log
          </PixelBtn>
          <PixelBtn small color="red" onClick={onClear}>
            🗑️ Limpiar
          </PixelBtn>
        </div>
      </div>

      {/* CPU Telemetry Banner */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 10,
          padding: "10px 16px",
          backgroundColor: "#F7F9FA",
          borderBottom: "1px solid #D0D7DE",
          fontSize: 12,
        }}
      >
        <div
          style={{
            backgroundColor: "#FFF",
            padding: "6px 10px",
            border: "1px solid #DCE2E6",
          }}
        >
          <div style={{ color: "#777", fontSize: 10 }}>ESTADO OPERATIVO</div>
          <div
            style={{
              fontWeight: "bold",
              color: running ? T.tiaLineActive : T.dwYellowDim,
              fontSize: 13,
            }}
          >
            {running ? "🟢 RUN (Cíclico)" : "🟡 STOP (Pausado)"}
          </div>
        </div>

        <div
          style={{
            backgroundColor: "#FFF",
            padding: "6px 10px",
            border: "1px solid #DCE2E6",
          }}
        >
          <div style={{ color: "#777", fontSize: 10 }}>TIEMPO DE CICLO</div>
          <div style={{ fontWeight: "bold", color: "#00646E", fontSize: 13 }}>
            {scanCycleTimeMs} ms (Scan # {scanCount})
          </div>
        </div>

        <div
          style={{
            backgroundColor: "#FFF",
            padding: "6px 10px",
            border: "1px solid #DCE2E6",
          }}
        >
          <div style={{ color: "#777", fontSize: 10 }}>MEMORIA DE CARGA</div>
          <div style={{ fontWeight: "bold", color: "#333", fontSize: 13 }}>
            18.4 KB / 128 KB (14%)
          </div>
        </div>

        <div
          style={{
            backgroundColor: "#FFF",
            padding: "6px 10px",
            border: "1px solid #DCE2E6",
          }}
        >
          <div style={{ color: "#777", fontSize: 10 }}>HARDWARE / FIRMWARE</div>
          <div style={{ fontWeight: "bold", color: "#333", fontSize: 13 }}>
            S7-1214C DC/DC/DC FW 4.5
          </div>
        </div>
      </div>

      {/* Events Table and Inspector Split */}
      <div
        style={{
          display: "flex",
          flex: 1,
          overflow: "hidden",
        }}
      >
        {/* Table list */}
        <div style={{ flex: 1, overflowY: "auto", borderRight: "1px solid #BAC3CA" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 12,
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: "#E4E7EA",
                  color: "#27343F",
                  textAlign: "left",
                  borderBottom: "1px solid #BAC3CA",
                  position: "sticky",
                  top: 0,
                  zIndex: 2,
                }}
              >
                <th style={{ padding: "8px 10px", width: 45 }}>Nº</th>
                <th style={{ padding: "8px 10px", width: 175 }}>Fecha y Hora</th>
                <th style={{ padding: "8px 10px", width: 110 }}>Código 16#</th>
                <th style={{ padding: "8px 10px" }}>Descripción del Evento</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      padding: "20px",
                      textAlign: "center",
                      color: "#999",
                      fontStyle: "italic",
                    }}
                  >
                    No hay eventos registrados en este filtro.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((evt, idx) => {
                  const isSelected = selectedEvent?.id === evt.id;
                  const isError = evt.severity === "error";
                  const isWarn = evt.severity === "warning";

                  return (
                    <tr
                      key={evt.id}
                      onClick={() => setSelectedEvent(evt)}
                      style={{
                        cursor: "pointer",
                        borderBottom: "1px solid #EAEAEA",
                        backgroundColor: isSelected
                          ? "#D0E7EB"
                          : idx % 2 === 0
                            ? "#FFFFFF"
                            : "#F9FBFC",
                      }}
                    >
                      <td style={{ padding: "6px 10px", color: "#888" }}>
                        {evt.id}
                      </td>
                      <td style={{ padding: "6px 10px", color: "#555" }}>
                        {evt.timestamp}
                      </td>
                      <td
                        style={{
                          padding: "6px 10px",
                          fontWeight: "bold",
                          color: isError
                            ? T.red
                            : isWarn
                              ? T.siemensOrange
                              : "#00646E",
                        }}
                      >
                        {evt.code}
                      </td>
                      <td style={{ padding: "6px 10px", color: "#222" }}>
                        <span style={{ marginRight: 6 }}>
                          {isError ? "🔴" : isWarn ? "⚠️" : "ℹ️"}
                        </span>
                        {evt.message}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Event Detail Inspector Pane */}
        <div
          style={{
            width: 320,
            backgroundColor: "#F7F9FA",
            padding: 16,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            fontSize: 12,
          }}
        >
          <div
            style={{
              fontWeight: "bold",
              fontSize: 13,
              color: "#004B52",
              borderBottom: "1px solid #DCE2E6",
              paddingBottom: 6,
            }}
          >
            Detalles del Evento Seleccionado
          </div>

          {selectedEvent ? (
            <>
              <div>
                <strong style={{ color: "#555" }}>ID del Evento:</strong>{" "}
                <span>#{selectedEvent.id}</span>
              </div>
              <div>
                <strong style={{ color: "#555" }}>Código Siemens:</strong>{" "}
                <span style={{ fontWeight: "bold", color: "#00646E" }}>
                  {selectedEvent.code}
                </span>
              </div>
              <div>
                <strong style={{ color: "#555" }}>Marca de tiempo:</strong>{" "}
                <div>{selectedEvent.timestamp}</div>
              </div>
              <div>
                <strong style={{ color: "#555" }}>Severidad:</strong>{" "}
                <span
                  style={{
                    textTransform: "uppercase",
                    fontWeight: "bold",
                    color:
                      selectedEvent.severity === "error"
                        ? T.red
                        : selectedEvent.severity === "warning"
                          ? T.siemensOrange
                          : T.tiaLineActive,
                  }}
                >
                  {selectedEvent.severity}
                </span>
              </div>
              <div>
                <strong style={{ color: "#555" }}>Mensaje:</strong>
                <div
                  style={{
                    backgroundColor: "#FFF",
                    padding: 8,
                    border: "1px solid #DCE2E6",
                    marginTop: 4,
                    lineHeight: 1.4,
                  }}
                >
                  {selectedEvent.message}
                </div>
              </div>
              {selectedEvent.details && (
                <div>
                  <strong style={{ color: "#555" }}>Información adicional:</strong>
                  <div
                    style={{
                      backgroundColor: "#FFF",
                      padding: 8,
                      border: "1px solid #DCE2E6",
                      marginTop: 4,
                      color: "#666",
                      lineHeight: 1.4,
                    }}
                  >
                    {selectedEvent.details}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ color: "#888", fontStyle: "italic", marginTop: 20 }}>
              Haz clic en cualquier evento de la tabla para ver su información
              detallada de diagnóstico Siemens.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
