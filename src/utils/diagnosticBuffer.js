// Buffer de Diagnóstico del SIMATIC S7-1200
// Registra cronológicamente eventos del sistema con identificadores 16# estándar de Siemens.

let _eventId = 1;

export function formatDiagnosticTimestamp(date = new Date()) {
  const pad = (n, len = 2) => String(n).padStart(len, "0");
  const d = date;
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const mins = pad(d.getMinutes());
  const secs = pad(d.getSeconds());
  const ms = pad(d.getMilliseconds(), 3);
  return `${year}-${month}-${day} ${hours}:${mins}:${secs}.${ms}`;
}

export function createDiagnosticEvent(code, message, severity = "info", details = "") {
  return {
    id: _eventId++,
    timestamp: formatDiagnosticTimestamp(),
    timeRaw: Date.now(),
    code,
    severity, // 'info' | 'warning' | 'error'
    message,
    details,
  };
}

export const MAX_DIAGNOSTIC_ENTRIES = 50;

export function addDiagnosticEvent(buffer = [], event, maxEntries = MAX_DIAGNOSTIC_ENTRIES) {
  return [event, ...buffer].slice(0, maxEntries);
}

export function initialDiagnosticEvents() {
  return [
    createDiagnosticEvent(
      "16# 02:4000",
      "CPU SIMATIC S7-1200 arrancada en modo STOP.",
      "info",
      "Módulo CPU 1214C DC/DC/DC FW 4.5. Configuración de hardware cargada correctamente."
    ),
    createDiagnosticEvent(
      "16# 01:2100",
      "Memoria de trabajo y marcas inicializadas a cero.",
      "info",
      "16 marcas M0.0-M1.7 listas. Retentividad configurada."
    ),
    createDiagnosticEvent(
      "16# 03:0010",
      "Módulos integrados de E/S digitales (10 DI / 10 DQ) y analógicas (1 AI) detectados.",
      "info",
      "DI a/b: %I0.0..%I1.1 | DQ a/b: %Q0.0..%Q1.1 | AI: %IW0 | AQ: %QW0"
    ),
  ];
}
