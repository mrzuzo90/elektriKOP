#!/usr/bin/env node
import { WebSocketServer } from "ws";
import ModbusRTU from "modbus-serial";

// ============================================================================
// Configuración y argumentos de línea de comandos
// ============================================================================
const args = process.argv.slice(2);
const isMock = args.includes("--mock") || process.env.MOCK === "true";

function getArgValue(flag, defaultVal) {
  const idx = args.indexOf(flag);
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  return defaultVal;
}

const WS_PORT = parseInt(getArgValue("--port", process.env.WS_PORT || "8080"), 10);
const MODBUS_HOST = getArgValue("--modbus-host", process.env.MODBUS_HOST || "127.0.0.1");
const MODBUS_PORT = parseInt(getArgValue("--modbus-port", process.env.MODBUS_PORT || "502"), 10);
const MODBUS_UNIT_ID = parseInt(getArgValue("--unit-id", process.env.MODBUS_UNIT_ID || "1"), 10);
const POLL_INTERVAL = parseInt(getArgValue("--poll", process.env.POLL_INTERVAL || "50"), 10);

const INPUT_ADDRS = ["I0.0", "I0.1", "I0.2", "I0.3", "I0.4", "I0.5", "I0.6", "I0.7", "I1.0", "I1.1"];
const OUTPUT_ADDRS = ["Q0.0", "Q0.1", "Q0.2", "Q0.3", "Q0.4", "Q0.5", "Q0.6", "Q0.7", "Q1.0", "Q1.1"];

console.log("==========================================================");
console.log("🔌 ElektriKOP ⇄ Factory I/O Bridge");
console.log(`   Modo: ${isMock ? "🧪 SIMULADOR MOCK (Sin Windows/Factory I/O)" : "🏭 MODBUS TCP REAL"}`);
console.log(`   WebSocket Server: ws://0.0.0.0:${WS_PORT}`);
if (!isMock) {
  console.log(`   Destino Modbus TCP: ${MODBUS_HOST}:${MODBUS_PORT} (Unit ID: ${MODBUS_UNIT_ID})`);
}
console.log("==========================================================\n");

// ============================================================================
// Servidor WebSocket (Comunicación con ElektriKOP en el navegador)
// ============================================================================
const wss = new WebSocketServer({ port: WS_PORT });

wss.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n❌ Error: El puerto ${WS_PORT} ya está en uso.`);
    console.error(`   Hay otra instancia del bridge o proceso corriendo en ese puerto.`);
    console.error(`   Para liberarlo ejecuta:`);
    console.error(`     kill -9 $(lsof -t -i :${WS_PORT})\n`);
    process.exit(1);
  }
  console.error("⚠️ [WS Server Error]:", err.message);
});

let currentInputs = Object.fromEntries(INPUT_ADDRS.map((a) => [a, false]));
let currentAnalogInputs = { IW0: 0 };
let currentOutputs = Object.fromEntries(OUTPUT_ADDRS.map((a) => [a, false]));
let currentMarks = {};
let currentCounters = {};
let isModbusConnected = false;

function broadcast(payload, excludeWs = null) {
  const msg = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client !== excludeWs && client.readyState === 1) { // OPEN
      client.send(msg);
    }
  }
}

function sendStatusTo(client) {
  if (client.readyState === 1) {
    client.send(
      JSON.stringify({
        type: "status",
        isMock,
        modbusConnected: isMock ? true : isModbusConnected,
        modbusTarget: `${MODBUS_HOST}:${MODBUS_PORT}`,
        activeClients: wss.clients.size,
      })
    );
  }
}

wss.on("connection", (ws, req) => {
  const remoteIp = req.socket.remoteAddress;
  console.log(`🟢 [WS] Cliente conectado desde ${remoteIp} (Total: ${wss.clients.size})`);

  sendStatusTo(ws);

  // Enviar estado actual de entradas, salidas, marcas y contadores inmediatamente al nuevo cliente
  ws.send(
    JSON.stringify({
      type: "sync_inputs",
      inputs: currentInputs,
      analogInputs: currentAnalogInputs,
    })
  );

  ws.send(
    JSON.stringify({
      type: "sync_outputs",
      inputs: currentInputs,
      outputs: currentOutputs,
      marks: currentMarks,
      counters: currentCounters,
      analogOutputs: currentAnalogInputs,
      timestamp: Date.now(),
    })
  );

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === "sync_outputs") {
        handleOutputsFromElektriKOP(msg.outputs, msg.analogOutputs, msg.marks, msg.counters, msg.inputs, ws);
      } else if (msg.type === "sync_inputs") {
        handleInputsFromClient(msg.inputs, msg.analogInputs, ws);
      } else if (msg.type === "set_input") {
        handleSetInputFromClient(msg.addr, msg.value, ws);
      } else if (msg.type === "pulse_input") {
        handlePulseInputFromClient(msg.addr, msg.durationMs, ws);
      } else if (msg.type === "ping") {
        ws.send(JSON.stringify({ type: "pong", time: Date.now() }));
      }
    } catch (err) {
      console.error("⚠️ [WS] Error procesando mensaje WebSocket:", err.message);
    }
  });

  ws.on("close", () => {
    console.log(`🔴 [WS] Cliente desconectado (Restantes: ${wss.clients.size})`);
  });
});

// ============================================================================
// Lógica de Salidas recibidas desde ElektriKOP
// ============================================================================
function handleOutputsFromElektriKOP(newOutputs, _newAnalog, newMarks, newCounters, newInputs = null, senderWs = null) {
  if (!newOutputs) return;

  if (newInputs && typeof newInputs === "object") {
    const changedInputs = [];
    INPUT_ADDRS.forEach((addr) => {
      if (newInputs[addr] !== undefined && Boolean(newInputs[addr]) !== Boolean(currentInputs[addr])) {
        changedInputs.push(`${addr}: ${newInputs[addr] ? "ON" : "OFF"}`);
      }
    });
    if (changedInputs.length > 0) {
      console.log(`📥 [ElektriKOP -> Entradas] ${changedInputs.join(" | ")}`);
    }
    currentInputs = { ...currentInputs, ...newInputs };
  }
  if (newMarks) currentMarks = { ...currentMarks, ...newMarks };

  if (newCounters && typeof newCounters === "object") {
    Object.entries(newCounters).forEach(([addr, c]) => {
      // Filtrar claves repetidas o mostrar solo las de outAddr
      if (addr.startsWith("M") || addr.startsWith("Q")) {
        const prev = currentCounters[addr];
        if (!prev || prev.cv !== c.cv || prev.qu !== c.qu || prev.cu !== c.cu || prev.cd !== c.cd) {
          console.log(
            `🚗 [Contador ${addr}] CV: ${c.cv}/${c.pv} | CU: ${c.cu ? "ON" : "off"} | CD: ${c.cd ? "ON" : "off"} | QU: ${c.qu ? "LLENO" : "libre"}`
          );
        }
      }
    });
    currentCounters = { ...currentCounters, ...newCounters };
  }

  // Detectar cambios relevantes para logging limpio
  const changed = [];
  OUTPUT_ADDRS.forEach((addr) => {
    if (Boolean(newOutputs[addr]) !== Boolean(currentOutputs[addr])) {
      changed.push(`${addr}: ${newOutputs[addr] ? "ON" : "OFF"}`);
    }
  });

  currentOutputs = { ...currentOutputs, ...newOutputs };

  if (changed.length > 0) {
    console.log(`⚡ [ElektriKOP -> Salidas] ${changed.join(" | ")}`);
  }

  // Retransmitir entradas, salidas, marcas y contadores a todos los demás clientes (Pixel Twin, etc.)
  broadcast(
    {
      type: "sync_outputs",
      inputs: currentInputs,
      outputs: currentOutputs,
      marks: currentMarks,
      counters: currentCounters,
      analogOutputs: currentAnalogInputs,
      timestamp: Date.now(),
    },
    senderWs
  );

  if (isMock) {
    onMockOutputsUpdated(currentOutputs);
  } else if (isModbusConnected) {
    writeOutputsToModbus(currentOutputs);
  }
}

function handleInputsFromClient(newInputs, newAnalog, senderWs = null) {
  if (!newInputs) return;

  let changed = false;
  for (const [k, v] of Object.entries(newInputs)) {
    const bVal = Boolean(v);
    if (currentInputs[k] !== bVal) {
      currentInputs[k] = bVal;
      changed = true;
    }
  }

  if (newAnalog && typeof newAnalog === "object") {
    currentAnalogInputs = { ...currentAnalogInputs, ...newAnalog };
    changed = true;
  }

  if (changed) {
    console.log(`📥 [Cliente -> Entradas] Retransmitiendo a ElektriKOP: ${JSON.stringify(newInputs)}`);
    broadcast(
      {
        type: "sync_inputs",
        inputs: currentInputs,
        analogInputs: currentAnalogInputs,
      },
      senderWs
    );
  }
}

function handleSetInputFromClient(addr, value, senderWs = null) {
  if (!addr) return;
  const bVal = Boolean(value);
  const changed = currentInputs[addr] !== bVal;
  currentInputs[addr] = bVal;
  if (changed) {
    console.log(`📥 [Cliente -> Entrada fija] ${addr} = ${bVal ? "ON" : "OFF"}`);
    broadcast(
      {
        type: "sync_inputs",
        inputs: currentInputs,
        analogInputs: currentAnalogInputs,
      },
      senderWs
    );
  }
}

function handlePulseInputFromClient(addr, durationMs = 150, senderWs = null) {
  if (!addr) return;
  console.log(`🔘 [Cliente -> Pulso] ${addr} (${durationMs}ms) enviado a ElektriKOP`);
  currentInputs[addr] = true;
  setTimeout(() => {
    currentInputs[addr] = false;
  }, durationMs);

  broadcast(
    {
      type: "pulse_input",
      addr,
      durationMs,
    },
    senderWs
  );
}

// ============================================================================
// MODO MOCK (Simulador para desarrollo y pruebas en Mac sin Factory I/O)
// ============================================================================
let mockConveyorRunning = false;
let mockBoxProgress = 0; // 0 a 100
let mockInterval = null;

function onMockOutputsUpdated(outputs) {
  const cinta = Boolean(outputs["Q0.0"]);
  if (cinta !== mockConveyorRunning) {
    mockConveyorRunning = cinta;
    if (cinta) {
      console.log("   📦 [MOCK 3D] Cinta transportadora (Q0.0) ARRANCADA. La caja avanza hacia el sensor...");
    } else {
      console.log("   ⏸️ [MOCK 3D] Cinta transportadora (Q0.0) DETENIDA.");
    }
  }
}

if (isMock) {
  console.log("   - [Escena Cinta]: Q0.0 avanza caja hacia sensor I0.1.");
  console.log("   - [Escena Garaje]: Pulsa 'e' para coche entrando (I0.1), 's' para coche saliendo (I0.2).");

  if (process.stdin.isTTY) {
    try {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (key) => {
        if (key === "\u0003" || key === "\u001b") {
          process.exit();
        }
        if (key === "e" || key === "E") {
          handlePulseInputFromClient("I0.1", 150);
        } else if (key === "s" || key === "S") {
          handlePulseInputFromClient("I0.2", 150);
        }
      });
    } catch {
      // Ignorar si no es TTY interactivo
    }
  }

  mockInterval = setInterval(() => {
    if (mockConveyorRunning) {
      mockBoxProgress += 2; // Avanza cada 50ms (completa trayecto en 2.5s)
      if (mockBoxProgress >= 100) {
        mockBoxProgress = 0;
      }

      // El sensor I0.1 está ubicado entre el 45% y el 65% de la cinta
      const isAtSensor = mockBoxProgress >= 45 && mockBoxProgress <= 65;
      if (isAtSensor !== currentInputs["I0.1"]) {
        currentInputs["I0.1"] = isAtSensor;
        if (isAtSensor) {
          console.log("   🚨 [MOCK 3D] Sensor óptico I0.1: ¡CAJA DETECTADA! (ON)");
        } else {
          console.log("   ⚪ [MOCK 3D] Sensor óptico I0.1: Caja pasó el sensor (OFF)");
        }
        broadcast({
          type: "sync_inputs",
          inputs: currentInputs,
          analogInputs: currentAnalogInputs,
        });
      }
    }
  }, 50);
}

// ============================================================================
// MODO REAL: Comunicación Modbus TCP con Factory I/O
// ============================================================================
const modbusClient = new ModbusRTU();
let isPolling = false;

async function writeOutputsToModbus(outputs) {
  if (!isModbusConnected) return;
  try {
    const coilValues = OUTPUT_ADDRS.map((addr) => Boolean(outputs[addr]));
    // Escribe las 10 salidas digitales en los Coils 0..9 de Factory I/O
    await modbusClient.writeCoils(0, coilValues);
  } catch (err) {
    console.error("⚠️ [Modbus] Error escribiendo salidas (Coils):", err.message);
  }
}

async function pollModbusInputs() {
  if (!isModbusConnected || isPolling) return;
  isPolling = true;

  try {
    // 1. Leer las 10 Entradas Discretas de Factory I/O (Discrete Inputs 0..9)
    // En Factory I/O Modbus TCP Server:
    // Los sensores y pulsadores conectados a "Discrete Inputs" empiezan en la dirección 0.
    const discreteResult = await modbusClient.readDiscreteInputs(0, INPUT_ADDRS.length);
    let inputsChanged = false;

    if (discreteResult && Array.isArray(discreteResult.data)) {
      discreteResult.data.slice(0, INPUT_ADDRS.length).forEach((val, idx) => {
        const addr = INPUT_ADDRS[idx];
        const boolVal = Boolean(val);
        if (currentInputs[addr] !== boolVal) {
          currentInputs[addr] = boolVal;
          inputsChanged = true;
        }
      });
    }

    // 2. Leer Registro Analógico (Input Register 0 -> IW0) si existe
    try {
      const analogResult = await modbusClient.readInputRegisters(0, 1);
      if (analogResult && analogResult.data && analogResult.data[0] !== undefined) {
        const val = analogResult.data[0];
        if (currentAnalogInputs.IW0 !== val) {
          currentAnalogInputs.IW0 = val;
          inputsChanged = true;
        }
      }
    } catch {
      // Si la escena no tiene entradas analógicas configuradas, ignorar
    }

    if (inputsChanged) {
      broadcast({
        type: "sync_inputs",
        inputs: currentInputs,
        analogInputs: currentAnalogInputs,
      });
    }
  } catch (err) {
    console.error("⚠️ [Modbus] Error en lectura de entradas:", err.message);
  } finally {
    isPolling = false;
  }
}

async function startModbusConnection() {
  if (isMock) return;

  console.log(`⏳ [Modbus] Intentando conectar a Factory I/O en ${MODBUS_HOST}:${MODBUS_PORT}...`);
  try {
    await modbusClient.connectTCP(MODBUS_HOST, { port: MODBUS_PORT });
    modbusClient.setID(MODBUS_UNIT_ID);
    modbusClient.setTimeout(1000);
    isModbusConnected = true;
    console.log(`✅ [Modbus] ¡Conectado con éxito a Factory I/O (${MODBUS_HOST}:${MODBUS_PORT})!`);

    broadcast({
      type: "status",
      isMock: false,
      modbusConnected: true,
      modbusTarget: `${MODBUS_HOST}:${MODBUS_PORT}`,
      activeClients: wss.clients.size,
    });

    // Iniciar bucle de muestreo de entradas
    setInterval(pollModbusInputs, POLL_INTERVAL);
  } catch (err) {
    isModbusConnected = false;
    console.warn(`❌ [Modbus] No se pudo conectar: ${err.message}. Reintentando en 3s...`);
    broadcast({
      type: "status",
      isMock: false,
      modbusConnected: false,
      modbusTarget: `${MODBUS_HOST}:${MODBUS_PORT}`,
      activeClients: wss.clients.size,
    });
    setTimeout(startModbusConnection, 3000);
  }
}

if (!isMock) {
  startModbusConnection();
}

// Limpieza ordenada en salida
process.on("SIGINT", () => {
  console.log("\nCerrando puente ElektriKOP ⇄ Factory I/O...");
  if (mockInterval) clearInterval(mockInterval);
  wss.close();
  if (modbusClient.isOpen) modbusClient.close();
  process.exit(0);
});
