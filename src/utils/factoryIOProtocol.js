import { INPUT_ADDR, OUTPUT_ADDR, MARK_ADDR } from "./constants";

export const DEFAULT_WS_URL = "ws://localhost:8080";

export function collectCounters(blocks = [], timerDisplay = {}) {
  const counters = {};
  if (!Array.isArray(blocks)) return counters;

  blocks.forEach((block) => {
    (block.rungs || []).forEach((rung) => {
      if (rung.outType === "ctu" || rung.outType === "ctd" || rung.outType === "ctud") {
        const suffix = `${block.id}:${rung.id}`;
        let timer = timerDisplay[suffix];
        if (!timer) {
          Object.keys(timerDisplay).forEach((k) => {
            if (k === suffix || k.endsWith(`>${suffix}`)) timer = timerDisplay[k];
          });
        }
        const cv = timer?.count ?? 0;
        const pv = rung.preset ?? 0;
        const qu = timer?.qu ?? (cv >= pv);
        const qd = timer?.qd ?? (cv <= 0);

        const data = {
          cv,
          pv,
          qu: rung.outType === "ctd" ? false : qu,
          qd: rung.outType === "ctu" ? false : qd,
          type: rung.outType,
          outAddr: rung.outAddr,
          cdAddr: rung.cdAddr || null,
          resetAddr: rung.resetAddr || null,
          loadAddr: rung.loadAddr || null,
        };

        if (rung.outAddr) {
          counters[rung.outAddr] = data;
        }
        counters[`${block.id}:${rung.id}`] = data;
      }
    });
  });

  return counters;
}

export function createSyncOutputsMessage(outputs, analogOutputs = {}, marks = {}, counters = {}) {
  const filteredOutputs = {};
  OUTPUT_ADDR.forEach((addr) => {
    filteredOutputs[addr] = Boolean(outputs?.[addr]);
  });

  const filteredMarks = {};
  MARK_ADDR.forEach((addr) => {
    if (marks?.[addr] !== undefined) {
      filteredMarks[addr] = Boolean(marks[addr]);
    }
  });

  return JSON.stringify({
    type: "sync_outputs",
    outputs: filteredOutputs,
    marks: filteredMarks,
    counters: counters || {},
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

    if (parsed.type === "pulse_input") {
      return {
        type: "pulse_input",
        addr: parsed.addr,
        durationMs: Math.max(20, Math.min(5000, Number(parsed.durationMs) || 150)),
      };
    }

    if (parsed.type === "sync_outputs") {
      return {
        type: "sync_outputs",
        outputs: parsed.outputs || {},
        marks: parsed.marks || {},
        counters: parsed.counters || {},
        analogOutputs: parsed.analogOutputs || {},
        timestamp: parsed.timestamp || Date.now(),
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
