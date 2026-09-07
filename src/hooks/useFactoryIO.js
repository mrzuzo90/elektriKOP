import { useState, useEffect, useRef, useCallback } from "react";
import { DEFAULT_WS_URL, createSyncOutputsMessage, parseBridgeMessage } from "../utils/factoryIOProtocol";

const STORAGE_KEY_URL = "elektrikop_factoryio_url";
const STORAGE_KEY_AUTOCONNECT = "elektrikop_factoryio_autoconnect";

export function useFactoryIO({
  onInputsReceived,
  onPulseInput,
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
      return localStorage.getItem(STORAGE_KEY_AUTOCONNECT) === "true";
    } catch {
      return false;
    }
  });

  const [status, setStatus] = useState("disconnected"); // 'disconnected' | 'connecting' | 'connected' | 'error'
  const [bridgeInfo, setBridgeInfo] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const manualDisconnectRef = useRef(false);

  // Mantener referencias actualizadas para evitar recrear callbacks y bucles de render
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
                countersRef.current
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
        } else if (msg.type === "status") {
          setBridgeInfo(msg);
        }
      };

      ws.onerror = () => {
        setErrorMessage("No se pudo conectar al puente (¿has ejecutado 'npm run mock' o 'npm start' en la carpeta bridge?)");
        setStatus("error");
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (!manualDisconnectRef.current) {
          setStatus((prev) => (prev === "error" ? "error" : "disconnected"));
          if (autoConnectRef.current) {
            reconnectTimeoutRef.current = setTimeout(() => {
              connect(connectUrl);
            }, 5000);
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

  // Sincronizar salidas, marcas y contadores cuando cambian
  const prevStateRef = useRef("");
  useEffect(() => {
    if (status !== "connected" || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }
    const stateKey = JSON.stringify({ outputs, marks, counters, analogOutputs });
    if (prevStateRef.current !== stateKey) {
      prevStateRef.current = stateKey;
      try {
        wsRef.current.send(
          createSyncOutputsMessage(outputs, analogOutputs, marks, counters)
        );
      } catch (err) {
        console.warn("Error enviando salidas al bridge:", err);
      }
    }
  }, [outputs, marks, counters, analogOutputs, status]);

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
    connect,
    disconnect,
    toggleConnect,
  };
}
