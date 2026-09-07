import { useState, useEffect, useRef, useCallback } from "react";
import { DEFAULT_WS_URL, createSyncOutputsMessage, parseBridgeMessage } from "../utils/factoryIOProtocol";

const STORAGE_KEY_URL = "elektrikop_factoryio_url";
const STORAGE_KEY_AUTOCONNECT = "elektrikop_factoryio_autoconnect";

export function useFactoryIO({ onInputsReceived, outputs, analogOutputs }) {
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

  const setUrl = (newUrl) => {
    setUrlState(newUrl);
    try {
      localStorage.setItem(STORAGE_KEY_URL, newUrl);
    } catch {
      // ignore
    }
  };

  const setAutoConnect = (val) => {
    setAutoConnectState(val);
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
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus("disconnected");
    setBridgeInfo(null);
  }, []);

  const connect = useCallback((targetUrl) => {
    manualDisconnectRef.current = false;
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const connectUrl = targetUrl || url;
    setStatus("connecting");
    setErrorMessage(null);

    try {
      const ws = new WebSocket(connectUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("connected");
        setErrorMessage(null);
        // Enviar estado de salidas inmediatamente al conectar
        if (outputs) {
          ws.send(createSyncOutputsMessage(outputs, analogOutputs));
        }
      };

      ws.onmessage = (event) => {
        const msg = parseBridgeMessage(event.data);
        if (!msg) return;

        if (msg.type === "sync_inputs") {
          setLastSyncTime(Date.now());
          if (onInputsReceived) {
            onInputsReceived(msg.inputs, msg.analogInputs);
          }
        } else if (msg.type === "status") {
          setBridgeInfo(msg);
        }
      };

      ws.onerror = () => {
        setErrorMessage("No se pudo conectar al puente WebSocket");
        setStatus("error");
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (!manualDisconnectRef.current) {
          setStatus("disconnected");
          if (autoConnect) {
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
      setErrorMessage(err.message);
    }
  }, [url, outputs, analogOutputs, onInputsReceived, autoConnect]);

  const toggleConnect = useCallback(() => {
    if (status === "connected" || status === "connecting") {
      disconnect();
    } else {
      connect();
    }
  }, [status, connect, disconnect]);

  // Sincronizar salidas cada vez que cambian y la conexión está activa
  const prevOutputsRef = useRef();
  useEffect(() => {
    if (status !== "connected" || !wsRef.current) return;
    const serialized = JSON.stringify(outputs);
    if (prevOutputsRef.current !== serialized) {
      prevOutputsRef.current = serialized;
      try {
        wsRef.current.send(createSyncOutputsMessage(outputs, analogOutputs));
      } catch (err) {
        console.warn("Error enviando salidas al bridge:", err);
      }
    }
  }, [outputs, analogOutputs, status]);

  // Autoconexión inicial al montar si está habilitada
  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    return () => {
      manualDisconnectRef.current = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [autoConnect, connect]);

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
