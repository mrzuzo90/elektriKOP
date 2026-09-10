import { describe, it, expect } from "vitest";
import {
  createDiagnosticEvent,
  addDiagnosticEvent,
  initialDiagnosticEvents,
  formatDiagnosticTimestamp,
} from "./diagnosticBuffer";

describe("diagnosticBuffer", () => {
  it("formats timestamp with milliseconds correctly", () => {
    const d = new Date(2026, 8, 11, 14, 30, 45, 123);
    const ts = formatDiagnosticTimestamp(d);
    expect(ts).toBe("2026-09-11 14:30:45.123");
  });

  it("creates a diagnostic event with standard fields", () => {
    const evt = createDiagnosticEvent("16# 02:3952", "Cambio a modo RUN", "info", "CPU activa");
    expect(evt.code).toBe("16# 02:3952");
    expect(evt.message).toBe("Cambio a modo RUN");
    expect(evt.severity).toBe("info");
    expect(evt.details).toBe("CPU activa");
    expect(typeof evt.id).toBe("number");
    expect(typeof evt.timestamp).toBe("string");
  });

  it("adds events to buffer maintaining FIFO limit", () => {
    let buf = [];
    for (let i = 0; i < 60; i++) {
      buf = addDiagnosticEvent(buf, createDiagnosticEvent(`16# 00:00${i}`, `Evento ${i}`));
    }
    expect(buf.length).toBe(50);
    expect(buf[0].message).toBe("Evento 59");
  });

  it("generates initial diagnostic events", () => {
    const init = initialDiagnosticEvents();
    expect(init.length).toBe(3);
    expect(init[0].code).toBe("16# 02:4000");
  });
});
