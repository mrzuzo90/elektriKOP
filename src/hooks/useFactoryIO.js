import { useState, useEffect, useRef, useCallback } from "react";
import { DEFAULT_WS_URL, createSyncOutputsMessage, parseBridgeMessage, createPingMessage } from "../utils/factoryIOProtocol";

const STORAGE_KEY_URL = "elektrikop_factoryio_url";
const STORAGE_KEY_AUTOCONNECT = "elektrikop_factoryio_autoconnect";

export function useFactoryIO({
  onInputsReceived,
  onPulseInput,
  onSetInput,
  inputs,
  outputs,
  marks,
  counters,
  analogOutputs,
}) {
  const [url, setUrlState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_URL) || DEFAULT_WS_URL;
    } catch {
      return DEFAULT_WS_URL;
    }
  });

  const [autoConnect, setAutoConnectState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_AUTOCONNECT);
      return stored === null ? true : stored === "true";
    } catch {
      return true;
    }
  });

  const [status, setStatus] = useState("disconnected"); // 'disconnected' | 'connecting' | 'connected' | 'error'
  const [bridgeInfo, setBridgeInfo] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [rttMs, setRttMs] = useState(null);
  const [packetsSent, setPacketsSent] = useState(0);
  const [packetsReceived, setPacketsReceived] = useState(0);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const manualDisconnectRef = useRef(false);

  // Mantener referencias actualizadas para evitar recrear callbacks y bucles de render
  const inputsRef = useRef(inputs);
  inputsRef.current = inputs;
  const outputsRef = useRef(outputs);
  outputsRef.current = outputs;
  const marksRef = useRef(marks);
  marksRef.current = marks;
  const countersRef = useRef(counters);
  countersRef.current = counters;
  const analogOutputsRef = useRef(analogOutputs);
  analogOutputsRef.current = analogOutputs;
  const onInputsReceivedRef = useRef(onInputsReceived);
  onInputsReceivedRef.current = onInputsReceived;
  const onPulseInputRef = useRef(onPulseInput);
  onPulseInputRef.current = onPulseInput;
  const onSetInputRef = useRef(onSetInput);
  onSetInputRef.current = onSetInput;
  const urlRef = useRef(url);
  urlRef.current = url;
  const autoConnectRef = useRef(autoConnect);
  autoConnectRef.current = autoConnect;

  const setUrl = (newUrl) => {
    setUrlState(newUrl);
    urlRef.current = newUrl;
    try {
      localStorage.setItem(STORAGE_KEY_URL, newUrl);
    } catch {
      // ignore
    }
  };

  const setAutoConnect = (val) => {
    setAutoConnectState(val);
    autoConnectRef.current = val;
    try {
      localStorage.setItem(STORAGE_KEY_AUTOCONNECT, String(val));
    } catch {
      // ignore
    }
  };

  const disconnect = useCallback(() => {
    manualDisconnectRef.current = true;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }
    setStatus("disconnected");
    setBridgeInfo(null);
    setErrorMessage(null);
  }, []);

  const connect = useCallback((targetUrl) => {
    manualDisconnectRef.current = false;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Evitar abrir múltiples WebSockets si ya está conectando o conectado
    if (wsRef.current) {
      if (
        wsRef.current.readyState === WebSocket.CONNECTING ||
        wsRef.current.readyState === WebSocket.OPEN
      ) {
        return;
      }
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }

    const connectUrl = targetUrl || urlRef.current || DEFAULT_WS_URL;
    setStatus("connecting");
    setErrorMessage(null);

    try {
      const ws = new WebSocket(connectUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("connected");
        setErrorMessage(null);
        if (outputsRef.current) {
          try {
            ws.send(
              createSyncOutputsMessage(
                outputsRef.current,
                analogOutputsRef.current,
                marksRef.current,
                countersRef.current,
                inputsRef.current
              )
            );
          } catch {
            // ignore
          }
        }
      };

      ws.onmessage = (event) => {
        const msg = parseBridgeMessage(event.data);
        if (!msg) return;

        setPacketsReceived((p) => p + 1);
        if (msg.type === "sync_inputs") {
          setLastSyncTime(Date.now());
          if (onInputsReceivedRef.current) {
            onInputsReceivedRef.current(msg.inputs, msg.analogInputs);
          }
        } else if (msg.type === "pulse_input") {
          setLastSyncTime(Date.now());
          if (onPulseInputRef.current) {
            onPulseInputRef.current(msg.addr, msg.durationMs);
          }
        } else if (msg.type === "set_input") {
          setLastSyncTime(Date.now());
          if (onSetInputRef.current) {
            onSetInputRef.current(msg.addr, msg.value);
          }
        } else if (msg.type === "status") {
          setBridgeInfo(msg);
        } else if (msg.type === "pong") {
          if (msg.clientTime) {
            setRttMs(Math.max(1, Date.now() - msg.clientTime));
          }
        }
      };

      ws.onerror = () => {
        setErrorMessage("No se pudo conectar al puente (¿has ejecutado 'npm run mock' o 'npm start' en la carpeta bridge?)");
        setStatus("error");
      };

      ws.onclose = () => {
        wsRef.current = null;
        setRttMs(null);
        if (!manualDisconnectRef.current) {
          setStatus((prev) => (prev === "error" ? "error" : "disconnected"));
          if (autoConnectRef.current) {
            reconnectTimeoutRef.current = setTimeout(() => {
              connect(connectUrl);
            }, 3000);
          }
        } else {
          setStatus("disconnected");
        }
      };
    } catch (err) {
      setStatus("error");
      setErrorMessage(err.message || "Error al iniciar WebSocket");
    }
  }, []);

  const toggleConnect = useCallback(() => {
    if (status === "connected" || status === "connecting") {
      disconnect();
    } else {
      connect();
    }
  }, [status, connect, disconnect]);

  // Heartbeat ping periódico para telemetría de latencia RTT (ms)
  useEffect(() => {
    if (status !== "connected" || !wsRef.current) return;
    const interval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(createPingMessage());
          setPacketsSent((p) => p + 1);
        } catch {
          // ignore
        }
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [status]);

  // Sincronizar salidas, marcas y contadores cuando cambian
  const prevStateRef = useRef("");
  useEffect(() => {
    if (status !== "connected" || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }
    const stateKey = JSON.stringify({ inputs, outputs, marks, counters, analogOutputs });
    if (prevStateRef.current !== stateKey) {
      prevStateRef.current = stateKey;
      try {
        wsRef.current.send(
          createSyncOutputsMessage(outputs, analogOutputs, marks, counters, inputs)
        );
        setPacketsSent((p) => p + 1);
      } catch (err) {
        console.warn("Error enviando salidas al bridge:", err);
      }
    }
  }, [inputs, outputs, marks, counters, analogOutputs, status]);

  // Autoconexión inicial SOLO al montar el componente
  useEffect(() => {
    if (autoConnectRef.current) {
      connect();
    }
    return () => {
      manualDisconnectRef.current = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          // ignore
        }
      }
    };
  }, [connect]);

  return {
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
    toggleConnect,
  };
}
