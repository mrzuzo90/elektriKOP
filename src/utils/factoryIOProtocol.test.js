import { describe, it, expect } from "vitest";
import { createSyncOutputsMessage, parseBridgeMessage, DEFAULT_WS_URL } from "./factoryIOProtocol";

describe("factoryIOProtocol", () => {
  it("DEFAULT_WS_URL points to localhost:8080", () => {
    expect(DEFAULT_WS_URL).toBe("ws://localhost:8080");
  });

  describe("createSyncOutputsMessage", () => {
    it("serializes outputs and filters standard output addresses", () => {
      const outputs = { "Q0.0": true, "Q0.1": false, "UNKNOWN": true };
      const raw = createSyncOutputsMessage(outputs, { IW0: 100 });
      const parsed = JSON.parse(raw);

      expect(parsed.type).toBe("sync_outputs");
      expect(parsed.outputs["Q0.0"]).toBe(true);
      expect(parsed.outputs["Q0.1"]).toBe(false);
      expect(parsed.outputs["UNKNOWN"]).toBeUndefined();
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
