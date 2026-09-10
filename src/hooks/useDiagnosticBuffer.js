import { useState, useCallback } from "react";
import {
  initialDiagnosticEvents,
  createDiagnosticEvent,
  addDiagnosticEvent,
} from "../utils/diagnosticBuffer";

export function useDiagnosticBuffer() {
  const [events, setEvents] = useState(initialDiagnosticEvents);

  const logEvent = useCallback((code, message, severity = "info", details = "") => {
    const evt = createDiagnosticEvent(code, message, severity, details);
    setEvents((prev) => addDiagnosticEvent(prev, evt));
    return evt;
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  const exportLog = useCallback(() => {
    const textLines = events.map(
      (e) => `[${e.timestamp}] [${e.code}] [${e.severity.toUpperCase()}] ${e.message}${e.details ? ` (${e.details})` : ""}`
    );
    const content = textLines.join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Siemens_S7-1200_DiagnosticBuffer_${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  }, [events]);

  return {
    events,
    logEvent,
    clearEvents,
    exportLog,
  };
}
