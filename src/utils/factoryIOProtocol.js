import { INPUT_ADDR, OUTPUT_ADDR, MARK_ADDR } from "./constants";

export const DEFAULT_WS_URL = "ws://localhost:8080";

export function createPingMessage() {
  return JSON.stringify({ type: "ping", time: Date.now() });
}

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
        const qu = rung.outType === "ctd" ? false : (timer?.qu ?? (cv >= pv));
        const qd = rung.outType === "ctu" ? false : (timer?.qd ?? (cv <= 0));
        const cu = rung.outType === "ctd" ? false : Boolean(timer?.cu);
        const cd = rung.outType === "ctu" ? false : Boolean(timer?.cd);
        const r = Boolean(timer?.r);
        const ld = Boolean(timer?.ld);

        const cuAddr =
          rung.cuAddr ||
          (rung.logic && rung.logic.length === 1 && rung.logic[0].kind === "contact" ? rung.logic[0].addr : null);

        const data = {
          cv,
          pv,
          cu,
          cd,
          qu,
          qd,
          r,
          ld,
          type: rung.outType,
          outAddr: rung.outAddr,
          cuAddr,
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

export function createSyncOutputsMessage(outputs, analogOutputs = {}, marks = {}, counters = {}, inputs = {}) {
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

  const filteredInputs = {};
  INPUT_ADDR.forEach((addr) => {
    if (inputs?.[addr] !== undefined) {
      filteredInputs[addr] = Boolean(inputs[addr]);
    }
  });

  const filteredAnalogOutputs = {};
  if (analogOutputs && typeof analogOutputs === "object") {
    Object.entries(analogOutputs).forEach(([addr, val]) => {
      if (typeof val === "number" && Number.isFinite(val)) {
        filteredAnalogOutputs[addr] = val;
      }
    });
  }

  return JSON.stringify({
    type: "sync_outputs",
    inputs: filteredInputs,
    outputs: filteredOutputs,
    marks: filteredMarks,
    counters: counters || {},
    analogOutputs: filteredAnalogOutputs,
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

    if (parsed.type === "set_input") {
      return {
        type: "set_input",
        addr: parsed.addr,
        value: Boolean(parsed.value),
      };
    }

    if (parsed.type === "sync_outputs") {
      return {
        type: "sync_outputs",
        inputs: parsed.inputs || {},
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
        clientTime: parsed.clientTime,
      };
    }

    return parsed;
  } catch {
    return null;
  }
}
