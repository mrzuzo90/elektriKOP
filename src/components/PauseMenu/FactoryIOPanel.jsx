import { T } from "../../utils/constants";
import PixelBtn from "../shared/PixelBtn";

export default function FactoryIOPanel({ factoryIO }) {
  const {
    status,
    url,
    setUrl,
    autoConnect,
    setAutoConnect,
    bridgeInfo,
    errorMessage,
    lastSyncTime,
    rttMs,
    packetsSent,
    packetsReceived,
    connect,
    disconnect,
  } = factoryIO;

  const isConnected = status === "connected";
  const isConnecting = status === "connecting";
  const isError = status === "error";

  const getStatusBadge = () => {
    if (isConnected) {
      return (
        <span style={{ color: T.sLedGreen, fontWeight: "bold", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: T.sLedGreen, boxShadow: `0 0 6px ${T.sLedGreen}` }} />
          CONECTADO
        </span>
      );
    }
    if (isConnecting) {
      return (
        <span style={{ color: T.dwYellow, fontWeight: "bold", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: T.dwYellow }} />
          CONECTANDO...
        </span>
      );
    }
    if (isError) {
      return (
        <span style={{ color: T.red, fontWeight: "bold", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: T.red }} />
          ERROR
        </span>
      );
    }
    return (
      <span style={{ color: "#888", display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#666" }} />
        DESCONECTADO
      </span>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Cabecera de estado */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#222", padding: "8px 12px", border: `1px solid ${T.dwBlack}` }}>
        <span style={{ fontSize: 13, color: "#DDD" }}>Estado del puente:</span>
        {getStatusBadge()}
      </div>

      {/* Info detallada y telemetría si está conectado */}
      {isConnected && (
        <div style={{ backgroundColor: "#1A1A1A", padding: 10, border: `1px solid ${T.dwBlack}`, fontSize: 12, color: "#CCC", display: "flex", flexDirection: "column", gap: 6 }}>
          {bridgeInfo && (
            <div>
              <strong style={{ color: "#FFF" }}>Modo:</strong>{" "}
              {bridgeInfo.isMock ? (
                <span style={{ color: T.dwYellow }}>🧪 Mock 3D (Simulador sin Windows)</span>
              ) : (
                <span style={{ color: "#4CAF50" }}>🏭 Modbus TCP Real ({bridgeInfo.modbusTarget})</span>
              )}
            </div>
          )}

          {/* Telemetría de enlace en tiempo real */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 4, backgroundColor: "#111", padding: 8, border: "1px solid #333" }}>
            <div>
              <div style={{ color: "#888", fontSize: 10 }}>LATENCIA RTT</div>
              <div style={{ fontWeight: "bold", color: rttMs ? (rttMs < 60 ? T.sLedGreen : T.dwYellow) : "#FFF" }}>
                {rttMs ? `${rttMs} ms (${rttMs < 50 ? "Excelente" : "Aceptable"})` : "Calculando..."}
              </div>
            </div>
            <div>
              <div style={{ color: "#888", fontSize: 10 }}>THROUGHPUT PAQUETES</div>
              <div style={{ fontWeight: "bold", color: "#EEE", fontSize: 11 }}>
                ⬆️ {packetsSent || 0} | ⬇️ {packetsReceived || 0}
              </div>
            </div>
          </div>

          {lastSyncTime && (
            <div style={{ color: "#888", fontSize: 11, marginTop: 2 }}>
              Última sincronización: hace {Math.max(0, Math.round((Date.now() - lastSyncTime) / 1000))}s
            </div>
          )}
        </div>
      )}

      {/* Mensaje de error si ocurre */}
      {isError && errorMessage && (
        <div style={{ background: "rgba(255, 51, 51, 0.15)", border: `1px solid ${T.red}`, color: T.red, padding: "6px 10px", fontSize: 12 }}>
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Formulario de conexión */}
      <div>
        <label style={{ display: "block", fontSize: 12, color: "#666", marginBottom: 4 }}>
          Dirección del Bridge WebSocket
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={url}
            disabled={isConnected || isConnecting}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="ws://localhost:8080"
            style={{
              flex: 1,
              fontFamily: T.mono,
              fontSize: 13,
              color: "#FFF",
              backgroundColor: T.dwDark,
              border: `1px solid ${T.dwGrey}`,
              padding: "6px 8px",
            }}
          />
          {isConnected || isConnecting ? (
            <PixelBtn small color="red" onClick={disconnect}>
              Desconectar
            </PixelBtn>
          ) : (
            <PixelBtn small color="dwGrey" onClick={() => connect()}>
              Conectar
            </PixelBtn>
          )}
        </div>
      </div>

      {/* Checkbox auto-conectar */}
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#AAA", cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={autoConnect}
          onChange={(e) => setAutoConnect(e.target.checked)}
          style={{ cursor: "pointer" }}
        />
        Conectar automáticamente al abrir ElektriKOP
      </label>



      {/* Ayuda y comandos rápidos */}
      <div style={{ borderTop: "1px solid #CCC", paddingTop: 10, fontSize: 11, color: "#666", lineHeight: 1.4 }}>
        <div style={{ fontWeight: "bold", color: "#444", marginBottom: 4 }}>¿Cómo arrancar el puente?</div>
        <div>
          • Modo prueba en Mac (sin Windows): <code style={{ backgroundColor: "#EEE", padding: "1px 4px" }}>cd bridge && npm run mock</code>
        </div>
        <div style={{ marginTop: 2 }}>
          • Con Factory I/O real: <code style={{ backgroundColor: "#EEE", padding: "1px 4px" }}>cd bridge && npm start</code>
        </div>
      </div>
    </div>
  );
}
