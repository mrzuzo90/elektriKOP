import { describe, it, expect } from "vitest";
import { createSyncOutputsMessage, parseBridgeMessage, collectCounters, DEFAULT_WS_URL } from "./factoryIOProtocol";

describe("factoryIOProtocol", () => {
  it("DEFAULT_WS_URL points to localhost:8080", () => {
    expect(DEFAULT_WS_URL).toBe("ws://localhost:8080");
  });

  describe("collectCounters", () => {
    it("extracts CTUD counter states correctly", () => {
      const blocks = [
        {
          id: "main",
          rungs: [
            {
              id: 0,
              outType: "ctud",
              outAddr: "M0.0",
              preset: 10,
              cdAddr: "I0.2",
            },
          ],
        },
      ];
      const timerDisplay = {
        "main:0": { count: 3, qu: false, qd: false },
      };

      const counters = collectCounters(blocks, timerDisplay);
      expect(counters["M0.0"]).toEqual({
        cv: 3,
        pv: 10,
        qu: false,
        qd: false,
        type: "ctud",
        outAddr: "M0.0",
        cdAddr: "I0.2",
        resetAddr: null,
        loadAddr: null,
      });
      expect(counters["main:0"]).toEqual(counters["M0.0"]);
    });
  });

  describe("createSyncOutputsMessage", () => {
    it("serializes outputs, marks, and counters", () => {
      const outputs = { "Q0.0": true, "Q0.1": false, "UNKNOWN": true };
      const marks = { "M0.0": true, "INVALID": true };
      const counters = { "M0.0": { cv: 5, pv: 10, qu: false, qd: false } };
      const raw = createSyncOutputsMessage(outputs, { IW0: 100 }, marks, counters);
      const parsed = JSON.parse(raw);

      expect(parsed.type).toBe("sync_outputs");
      expect(parsed.outputs["Q0.0"]).toBe(true);
      expect(parsed.outputs["Q0.1"]).toBe(false);
      expect(parsed.outputs["UNKNOWN"]).toBeUndefined();
      expect(parsed.marks["M0.0"]).toBe(true);
      expect(parsed.marks["INVALID"]).toBeUndefined();
      expect(parsed.counters["M0.0"]).toEqual({ cv: 5, pv: 10, qu: false, qd: false });
      expect(parsed.analogOutputs).toEqual({ IW0: 100 });
      expect(typeof parsed.timestamp).toBe("number");
    });
  });

  describe("parseBridgeMessage", () => {
    it("parses valid sync_inputs message correctly", () => {
      const raw = JSON.stringify({
        type: "sync_inputs",
        inputs: { "I0.0": true, "I0.1": 1, "I0.2": false, "INVALID": true },
        analogInputs: { IW0: 55 },
      });
      const res = parseBridgeMessage(raw);

      expect(res).not.toBeNull();
      expect(res.type).toBe("sync_inputs");
      expect(res.inputs["I0.0"]).toBe(true);
      expect(res.inputs["I0.1"]).toBe(true);
      expect(res.inputs["I0.2"]).toBe(false);
      expect(res.inputs["INVALID"]).toBeUndefined();
      expect(res.analogInputs).toEqual({ IW0: 55 });
    });

    it("parses pulse_input message correctly", () => {
      const raw = JSON.stringify({
        type: "pulse_input",
        addr: "I0.1",
        durationMs: 200,
      });
      const res = parseBridgeMessage(raw);
      expect(res).toEqual({
        type: "pulse_input",
        addr: "I0.1",
        durationMs: 200,
      });
    });

    it("parses sync_outputs message correctly for simulator clients", () => {
      const raw = JSON.stringify({
        type: "sync_outputs",
        outputs: { "Q0.1": true },
        marks: { "M0.0": false },
        counters: { "M0.0": { cv: 4, pv: 10, qu: false, qd: false } },
      });
      const res = parseBridgeMessage(raw);
      expect(res.type).toBe("sync_outputs");
      expect(res.outputs["Q0.1"]).toBe(true);
      expect(res.marks["M0.0"]).toBe(false);
      expect(res.counters["M0.0"].cv).toBe(4);
    });

    it("parses valid status message correctly", () => {
      const raw = JSON.stringify({
        type: "status",
        isMock: true,
        modbusConnected: true,
        modbusTarget: "127.0.0.1:502",
        activeClients: 1,
      });
      const res = parseBridgeMessage(raw);

      expect(res).toEqual({
        type: "status",
        isMock: true,
        modbusConnected: true,
        modbusTarget: "127.0.0.1:502",
        activeClients: 1,
      });
    });

    it("returns null on malformed JSON", () => {
      expect(parseBridgeMessage("{not json}")).toBeNull();
      expect(parseBridgeMessage(null)).toBeNull();
    });
  });
});
