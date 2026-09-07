import { INPUT_ADDR, OUTPUT_ADDR } from "./constants";

export const DEFAULT_WS_URL = "ws://localhost:8080";

export function createSyncOutputsMessage(outputs, analogOutputs = {}) {
  const filteredOutputs = {};
  OUTPUT_ADDR.forEach((addr) => {
    filteredOutputs[addr] = Boolean(outputs?.[addr]);
  });

  return JSON.stringify({
    type: "sync_outputs",
    outputs: filteredOutputs,
    analogOutputs: analogOutputs || {},
    timestamp: Date.now(),
  });
}

export function parseBridgeMessage(rawData) {
  try {
    const parsed = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
    if (!parsed || typeof parsed !== "object") return null;

    if (parsed.type === "sync_inputs") {
      const sanitizedInputs = {};
      if (parsed.inputs && typeof parsed.inputs === "object") {
        INPUT_ADDR.forEach((addr) => {
          if (parsed.inputs[addr] !== undefined) {
            sanitizedInputs[addr] = Boolean(parsed.inputs[addr]);
          }
        });
      }
      return {
        type: "sync_inputs",
        inputs: sanitizedInputs,
        analogInputs: parsed.analogInputs || {},
      };
    }

    if (parsed.type === "status") {
      return {
        type: "status",
        isMock: Boolean(parsed.isMock),
        modbusConnected: Boolean(parsed.modbusConnected),
        modbusTarget: parsed.modbusTarget || "",
        activeClients: parsed.activeClients || 0,
      };
    }

    if (parsed.type === "pong") {
      return {
        type: "pong",
        time: parsed.time,
      };
    }

    return parsed;
  } catch {
    return null;
  }
}
