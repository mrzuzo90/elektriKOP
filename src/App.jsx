import React, { useState, useEffect, useRef } from "react";

// ---------------------------------------------------------------------------
// Paletas de Colores y Tokens
// ---------------------------------------------------------------------------
const T = {
  // Paleta DeWalt
  dwYellow: "#FECE2F",
  dwYellowDim: "#C59B15",
  dwBlack: "#111111",
  dwDark: "#1E1E1E",
  dwGrey: "#333333",
  
  // Paleta Siemens S7-1200
  sBg: "#5C666C",
  sDark: "#3A4042",
  sBlue: "#0099CC",
  sLedGreen: "#00FF00",
  sLedOff: "#1a211c",
  
  // TIA Portal KOP
  tiaBg: "#FFFFFF",
  tiaHeader: "#E5E5E5",
  tiaText: "#000000",
  tiaLine: "#000000",
  tiaLineActive: "#00B000",
  tiaBlue: "#0000FF",

  // Utilidades
  red: "#FF3333",
  text: "#FFFFFF",
  mono: "'Courier New', 'Consolas', monospace",
};

// Direccionamiento real Siemens (Octal por byte: 0.0 a 0.7, 1.0 a 1.1 para 10 entradas/salidas)
const INPUT_ADDR = ["I0.0", "I0.1", "I0.2", "I0.3", "I0.4", "I0.5", "I0.6", "I0.7", "I1.0", "I1.1"];
const OUTPUT_ADDR = ["Q0.0", "Q0.1", "Q0.2", "Q0.3", "Q0.4", "Q0.5", "Q0.6", "Q0.7", "Q1.0", "Q1.1"];
const MAX_RUNGS = 10;
const SCAN_MS = 100;

let _uid = 0;
const genId = () => `n${_uid++}`;

function newContactNode() {
  return { kind: "contact", id: genId(), addr: "I0.0", neg: false };
}
function newBranch() {
  return { id: genId(), nodes: [newContactNode()] };
}
function newParallelNode() {
  return { kind: "parallel", id: genId(), branches: [newBranch(), newBranch()] };
}
function newRung(id) {
  return {
    id,
    title: `Network ${id + 1}`,
    comment: "Comentario del segmento...",
    logic: [newContactNode()],
    outAddr: "Q0.0",
    outType: "coil", // coil | ton
    preset: 2,
  };
}

// --- Tree Utilities (Mantienen tu lógica original intacta y robusta) ---
function countContacts(nodes) {
  return nodes.reduce(
    (sum, n) => sum + (n.kind === "contact" ? 1 : n.branches.reduce((s, b) => s + countContacts(b.nodes), 0)),
    0
  );
}
function mapContainer(nodes, containerId, fn) {
  if (containerId === "root") return fn(nodes);
  return nodes.map((n) => {
    if (n.kind !== "parallel") return n;
    return {
      ...n,
      branches: n.branches.map((b) =>
        b.id === containerId ? { ...b, nodes: fn(b.nodes) } : { ...b, nodes: mapContainer(b.nodes, containerId, fn) }
      ),
    };
  });
}
function removeNodeEverywhere(nodes, nodeId) {
  return nodes
    .filter((n) => n.id !== nodeId)
    .map((n) =>
      n.kind === "parallel"
        ? { ...n, branches: n.branches.map((b) => ({ ...b, nodes: removeNodeEverywhere(b.nodes, nodeId) })) }
        : n
    );
}
function updateContactEverywhere(nodes, contactId, patch) {
  return nodes.map((n) => {
    if (n.id === contactId && n.kind === "contact") return { ...n, ...patch };
    if (n.kind === "parallel") {
      return { ...n, branches: n.branches.map((b) => ({ ...b, nodes: updateContactEverywhere(b.nodes, contactId, patch) })) };
    }
    return n;
  });
}
function addBranchToParallel(nodes, parallelId) {
  return nodes.map((n) => {
    if (n.kind !== "parallel") return n;
    if (n.id === parallelId) {
      if (n.branches.length >= 4) return n;
      return { ...n, branches: [...n.branches, newBranch()] };
    }
    return { ...n, branches: n.branches.map((b) => ({ ...b, nodes: addBranchToParallel(b.nodes, parallelId) })) };
  });
}
function removeBranchFromParallel(nodes, parallelId, branchId) {
  return nodes.map((n) => {
    if (n.kind !== "parallel") return n;
    if (n.id === parallelId) {
      if (n.branches.length <= 2) return n;
      return { ...n, branches: n.branches.filter((b) => b.id !== branchId) };
    }
    return {
      ...n,
      branches: n.branches.map((b) => ({ ...b, nodes: removeBranchFromParallel(b.nodes, parallelId, branchId) })),
    };
  });
}

// --- Evaluación Lógica ---
function evalNode(node, mem) {
  if (node.kind === "contact") {
    const raw = !!mem[node.addr];
    return node.neg ? !raw : raw;
  }
  return node.branches.some((b) => evalSeries(b.nodes, mem));
}
function evalSeries(nodes, mem) {
  if (nodes.length === 0) return false;
  return nodes.every((n) => evalNode(n, mem));
}
function computeStates(nodes, mem, out) {
  let accFlow = true; // Para pintar líneas verdes hasta donde llegue la corriente
  nodes.forEach((n) => {
    const nodeState = evalNode(n, mem);
    out[n.id] = { state: nodeState, flowIn: accFlow };
    accFlow = accFlow && nodeState;
    if (n.kind === "parallel") {
      n.branches.forEach((b) => computeStates(b.nodes, mem, out));
    }
  });
  return out;
}

// Direcciones I/Q realmente referenciadas en un segmento (contactos + su
// propia salida), usado para no mostrar en "Proceso simulado" direcciones
// que no se usan en ningún sitio todavía.
function collectContactAddrs(nodes, set) {
  nodes.forEach((n) => {
    if (n.kind === "contact") set.add(n.addr);
    else n.branches.forEach((b) => collectContactAddrs(b.nodes, set));
  });
}
function collectUsedAddresses(rungs) {
  const set = new Set();
  rungs.forEach((rung) => {
    collectContactAddrs(rung.logic, set);
    set.add(rung.outAddr);
  });
  return [...INPUT_ADDR, ...OUTPUT_ADDR].filter((a) => set.has(a));
}

// Convierte el estado "físico" de cada entrada (¿está el pulsador pulsado?,
// ¿ha detectado el sensor?) en el bit que realmente llega al terminal DI del
// PLC, según cómo esté cableado ese dispositivo en la realidad. Un sensor
// NC (p.ej. un termostato que abre al superar una temperatura) deja pasar
// señal en reposo y la corta al activarse — justo lo contrario de un NA.
// Por defecto (sin asignar) se asume NA, que es el cableado más habitual.
function applyWiring(inputs, wiringMap) {
  const out = {};
  INPUT_ADDR.forEach((a) => {
    const physicallyActive = !!inputs[a];
    const isNC = wiringMap?.[a] === "NC";
    out[a] = isNC ? !physicallyActive : physicallyActive;
  });
  return out;
}

// Segmentos distintos que escriben en la misma dirección de salida — casi
// siempre un despiste, salvo el patrón normal de un SET y un RESET
// compartiendo dirección (eso es el enclavamiento típico, no un error).
function collectOutputConflicts(rungs) {
  const byAddr = {};
  rungs.forEach((r, idx) => {
    if (!byAddr[r.outAddr]) byAddr[r.outAddr] = [];
    byAddr[r.outAddr].push(idx);
  });
  return Object.entries(byAddr).filter(([, idxs]) => {
    if (idxs.length < 2) return false;
    // Solo avisamos si hay una bobina directa o un TON compartiendo la
    // dirección con algo más — esos dos tipos sobrescriben sin condiciones,
    // así que compartir dirección con ellos casi siempre es un despiste.
    return idxs.some((i) => rungs[i].outType === "coil" || rungs[i].outType === "ton");
  });
}

// Tras importar un proyecto hay que evitar que el generador de ids local
// (_uid) vuelva a repartir un id que ya existe dentro del árbol importado.
function collectAllNodeIds(nodes, arr) {
  nodes.forEach((n) => {
    arr.push(n.id);
    if (n.kind === "parallel") {
      n.branches.forEach((b) => {
        arr.push(b.id);
        collectAllNodeIds(b.nodes, arr);
      });
    }
  });
}
function bumpUidPastImportedRungs(rungs) {
  let maxNum = -1;
  rungs.forEach((r) => {
    const ids = [];
    collectAllNodeIds(r.logic, ids);
    ids.forEach((id) => {
      const m = /^n(\d+)$/.exec(id);
      if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    });
  });
  if (maxNum >= _uid) _uid = maxNum + 1;
}

// ---------------------------------------------------------------------------
// Componentes UI: Estilo Pixel Art & DeWalt
// ---------------------------------------------------------------------------
const pixelBorderStyle = {
  boxShadow: `inset -3px -3px 0px 0px rgba(0,0,0,0.5), inset 3px 3px 0px 0px rgba(255,255,255,0.2)`,
  border: `2px solid ${T.dwBlack}`,
};

// Flecha de desplegable dibujada con dos gradientes CSS (sin imágenes
// externas) para que los <select> nativos dejen de desentonar con el resto
// del pixel-art.
function pixelSelectStyle(extra = {}) {
  return {
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
    backgroundColor: "#FFF",
    backgroundImage: `linear-gradient(45deg, transparent 50%, ${T.dwBlack} 50%), linear-gradient(135deg, ${T.dwBlack} 50%, transparent 50%)`,
    backgroundPosition: "calc(100% - 10px) calc(50% - 1px), calc(100% - 5px) calc(50% - 1px)",
    backgroundSize: "5px 5px, 5px 5px",
    backgroundRepeat: "no-repeat",
    border: `2px solid ${T.dwBlack}`,
    boxShadow: `2px 2px 0px 0px ${T.dwBlack}`,
    cursor: "pointer",
    ...extra,
  };
}

const fontStyles = `
  * { box-sizing: border-box; }
  body { margin: 0; background-color: ${T.dwDark}; }
  ::-webkit-scrollbar { width: 12px; height: 12px; }
  ::-webkit-scrollbar-track { background: ${T.dwDark}; border-left: 2px solid ${T.dwBlack}; }
  ::-webkit-scrollbar-thumb { background: ${T.dwYellow}; border: 2px solid ${T.dwBlack}; }
  @keyframes blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes beltMove { from { background-position: 0 0; } to { background-position: 24px 0; } }
  @keyframes pulseGlow { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }

  /* Campos de texto "editables" (título de proyecto, nombre/comentario de
     segmento): sin caja hasta que el usuario interactúa, para no competir
     visualmente con el resto, pero con una pista clara de que se puede
     tocar. */
  .dw-edit-field {
    border: none;
    border-bottom: 2px dashed rgba(255,255,255,0.25);
    background: transparent;
    transition: border-color 0.15s, background-color 0.15s;
  }
  .dw-edit-field:hover { border-bottom-color: rgba(255,255,255,0.5); }
  .dw-edit-field:focus { border-bottom: 2px solid ${T.dwYellow}; background: rgba(255,255,255,0.06); }
  .dw-edit-field-dark { border-bottom-color: rgba(0,0,0,0.25); }
  .dw-edit-field-dark:hover { border-bottom-color: rgba(0,0,0,0.5); }
  .dw-edit-field-dark:focus { background: rgba(0,0,0,0.05); }

  /* Overlay tipo pantalla CRT: líneas de barrido muy sutiles + viñeta,
     puramente decorativo (pointer-events:none) para dar aire de HUD de
     videojuego retro sin estorbar la lectura. */
  .dw-crt-overlay {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 9999;
    background:
      repeating-linear-gradient(0deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 1px, transparent 1px, transparent 3px),
      radial-gradient(ellipse at center, transparent 65%, rgba(0,0,0,0.12) 100%);
    mix-blend-mode: multiply;
    opacity: 0.35;
  }
`;

function PixelBtn({ children, onClick, active, color = "yellow", disabled, small, title }) {
  const bg = color === "yellow" ? T.dwYellow : color === "red" ? T.red : T.dwGrey;
  const tc = color === "yellow" ? T.dwBlack : T.text;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        fontFamily: T.mono,
        fontSize: small ? 14 : 18,
        backgroundColor: active ? (color === "yellow" ? "#FFF" : "#777") : bg,
        color: disabled ? "#888" : tc,
        padding: small ? "4px 8px" : "8px 16px",
        border: `2px solid ${T.dwBlack}`,
        boxShadow: active 
          ? `inset 4px 4px 0px 0px rgba(0,0,0,0.4)`
          : `inset -2px -2px 0px 0px rgba(0,0,0,0.3), inset 2px 2px 0px 0px rgba(255,255,255,0.3), 3px 3px 0px ${T.dwBlack}`,
        cursor: disabled ? "not-allowed" : "pointer",
        transform: active ? "translate(3px, 3px)" : "none",
        textTransform: "uppercase",
        transition: "all 0.05s",
      }}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Nivel 1: Proceso simulado — iconos pixel-art reactivos por dirección
// ---------------------------------------------------------------------------
const DEVICE_TYPES = [
  { id: "none", label: "— Sin asignar —" },
  { id: "pulsador", label: "Pulsador (momentáneo)" },
  { id: "paro", label: "Seta de PARO (enclavamiento)" },
  { id: "sensor", label: "Sensor / fin de carrera" },
  { id: "motor", label: "Motor" },
  { id: "cinta", label: "Cinta transportadora" },
  { id: "lampara", label: "Lámpara" },
  { id: "alarma", label: "Alarma" },
  { id: "puerta", label: "Puerta" },
];

const deviceBoxStyle = {
  width: 40,
  height: 40,
  backgroundColor: T.dwGrey,
  border: `2px solid ${T.dwBlack}`,
  boxShadow: "2px 2px 0px 0px rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  position: "relative",
};

function MotorIcon({ active }) {
  return (
    <div style={deviceBoxStyle}>
      <div
        style={{
          width: 22,
          height: 22,
          background: active ? T.dwYellow : "#666",
          clipPath: "polygon(50% 0%,61% 39%,100% 50%,61% 61%,50% 100%,39% 61%,0% 50%,39% 39%)",
          animation: active ? "spin 0.5s linear infinite" : "none",
        }}
      />
    </div>
  );
}

function BeltIcon({ active }) {
  return (
    <div style={deviceBoxStyle}>
      <div
        style={{
          width: "100%",
          height: 14,
          backgroundImage: `repeating-linear-gradient(45deg, ${active ? T.dwYellow : "#555"} 0 6px, ${T.dwBlack} 6px 12px)`,
          backgroundSize: "24px 24px",
          animation: active ? "beltMove 0.4s linear infinite" : "none",
        }}
      />
    </div>
  );
}

function PushButtonIcon({ active }) {
  return (
    <div style={deviceBoxStyle}>
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: active ? T.red : T.dwYellow,
          border: `2px solid ${T.dwBlack}`,
          boxShadow: active ? "inset 2px 2px 4px rgba(0,0,0,0.6)" : "0 2px 0 rgba(0,0,0,0.5)",
          transform: active ? "translateY(2px)" : "none",
        }}
      />
    </div>
  );
}

function EStopIcon({ active }) {
  return (
    <div style={{ ...deviceBoxStyle, backgroundColor: T.dwYellow }}>
      <div
        style={{
          width: active ? 26 : 24,
          height: active ? 26 : 24,
          borderRadius: "50%",
          background: active ? "#8B0000" : T.red,
          border: `2px solid ${T.dwBlack}`,
          boxShadow: active
            ? "inset 3px 3px 5px rgba(0,0,0,0.7)"
            : "0 3px 0 rgba(0,0,0,0.6), inset -2px -2px 3px rgba(0,0,0,0.25)",
          transform: active ? "translateY(2px)" : "none",
        }}
      />
    </div>
  );
}

function SensorIcon({ active }) {
  return (
    <div style={deviceBoxStyle}>
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: active ? T.sLedGreen : T.sLedOff,
          boxShadow: active ? `0 0 8px ${T.sLedGreen}` : "inset 1px 1px 2px #000",
          border: `2px solid ${T.dwBlack}`,
        }}
      />
    </div>
  );
}

function LampIcon({ active }) {
  return (
    <div style={deviceBoxStyle}>
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: "50% 50% 3px 3px",
          background: active ? T.dwYellow : "#555",
          boxShadow: active ? `0 0 12px ${T.dwYellow}` : "none",
          animation: active ? "pulseGlow 0.9s ease-in-out infinite" : "none",
        }}
      />
    </div>
  );
}

function AlarmIcon({ active }) {
  return (
    <div style={deviceBoxStyle}>
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: "11px solid transparent",
          borderRight: "11px solid transparent",
          borderBottom: `18px solid ${active ? T.red : "#555"}`,
          animation: active ? "blink 0.3s steps(1) infinite" : "none",
          filter: active ? `drop-shadow(0 0 6px ${T.red})` : "none",
        }}
      />
    </div>
  );
}

function DoorIcon({ active }) {
  return (
    <div style={deviceBoxStyle}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: active ? "18%" : "100%",
          background: T.sDark,
          borderBottom: `2px solid ${T.dwBlack}`,
          transition: "height 0.35s ease",
        }}
      />
      <span style={{ position: "relative", fontSize: 8, color: active ? "#AAA" : "transparent" }}>ABIERTA</span>
    </div>
  );
}

function DeviceIcon({ type, active }) {
  switch (type) {
    case "pulsador":
      return <PushButtonIcon active={active} />;
    case "paro":
      return <EStopIcon active={active} />;
    case "motor":
      return <MotorIcon active={active} />;
    case "cinta":
      return <BeltIcon active={active} />;
    case "sensor":
      return <SensorIcon active={active} />;
    case "lampara":
      return <LampIcon active={active} />;
    case "alarma":
      return <AlarmIcon active={active} />;
    case "puerta":
      return <DoorIcon active={active} />;
    default:
      return (
        <div style={{ ...deviceBoxStyle, backgroundColor: "#2A2A2A", border: "2px dashed #555" }}>
          <span style={{ color: "#555", fontSize: 16 }}>—</span>
        </div>
      );
  }
}

function ProcessPanel({ addresses, deviceMap, onChangeType, wiringMap, onChangeWiring, inputs, outputs, visible, onToggle }) {
  return (
    <div style={{ backgroundColor: T.tiaBg, border: `2px solid ${T.dwBlack}`, boxShadow: "4px 4px 0px 0px rgba(0,0,0,0.25)", marginBottom: 20 }}>
      <div
        onClick={onToggle}
        style={{
          backgroundColor: T.tiaHeader,
          padding: "6px 12px",
          borderBottom: visible ? `2px solid ${T.dwBlack}` : "none",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
        }}
      >
        <span style={{ fontWeight: "bold", color: T.tiaText }}>🏭 Proceso simulado</span>
        <span style={{ color: "#888", fontSize: 12 }}>{visible ? "▲ ocultar" : "▼ mostrar"}</span>
      </div>
      {visible && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, padding: 14 }}>
          {addresses.length === 0 ? (
            <span style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>
              Aún no hay direcciones en uso — añade contactos o salidas a un segmento para que aparezcan aquí.
            </span>
          ) : (
            addresses.map((addr) => {
              const isInput = addr.startsWith("I");
              const active = isInput ? !!inputs[addr] : !!outputs[addr];
              const type = deviceMap[addr] || "none";
              const wiring = wiringMap?.[addr] || "NA";
              return (
                <div key={addr} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: 68 }}>
                  <span style={{ fontSize: 11, color: T.tiaText, fontWeight: "bold" }}>{addr}</span>
                  <DeviceIcon type={type} active={active} />
                  <select
                    value={type}
                    onChange={(e) => onChangeType(addr, e.target.value)}
                    style={pixelSelectStyle({ fontSize: 9, width: "100%", fontFamily: T.mono, color: T.tiaText, padding: "2px 14px 2px 4px" })}
                  >
                    {DEVICE_TYPES.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                  {isInput && (
                    <>
                      <div
                        title="Cableado físico del dispositivo: normalmente abierto (NA) o normalmente cerrado (NC), independiente del contacto que uses en el segmento"
                        style={{ display: "flex", width: "100%", border: `1px solid ${T.dwGrey}` }}
                      >
                        <button
                          onClick={() => onChangeWiring(addr, "NA")}
                          style={{
                            flex: 1,
                            fontFamily: T.mono,
                            fontSize: 9,
                            padding: "2px 0",
                            cursor: "pointer",
                            backgroundColor: wiring === "NA" ? T.dwYellow : "#EEE",
                            color: T.dwBlack,
                            border: "none",
                            fontWeight: wiring === "NA" ? "bold" : "normal",
                          }}
                        >
                          NA
                        </button>
                        <button
                          onClick={() => onChangeWiring(addr, "NC")}
                          style={{
                            flex: 1,
                            fontFamily: T.mono,
                            fontSize: 9,
                            padding: "2px 0",
                            cursor: "pointer",
                            backgroundColor: wiring === "NC" ? T.dwYellow : "#EEE",
                            color: T.dwBlack,
                            border: "none",
                            borderLeft: `1px solid ${T.dwGrey}`,
                            fontWeight: wiring === "NC" ? "bold" : "normal",
                          }}
                        >
                          NC
                        </button>
                      </div>
                      <span style={{ fontSize: 9, color: (wiring === "NC" ? !active : active) ? T.dwYellow : "#999" }}>
                        PLC ve: {(wiring === "NC" ? !active : active) ? "1" : "0"}
                      </span>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tabla de variables — nombres simbólicos para las direcciones en uso
// ---------------------------------------------------------------------------
function SymbolsPanel({ addresses, symbols, onChangeSymbol, visible, onToggle }) {
  return (
    <div style={{ backgroundColor: T.tiaBg, border: `2px solid ${T.dwBlack}`, boxShadow: "4px 4px 0px 0px rgba(0,0,0,0.25)", marginBottom: 20 }}>
      <div
        onClick={onToggle}
        style={{
          backgroundColor: T.tiaHeader,
          padding: "6px 12px",
          borderBottom: visible ? `2px solid ${T.dwBlack}` : "none",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
        }}
      >
        <span style={{ fontWeight: "bold", color: T.tiaText }}>🏷️ Tabla de variables</span>
        <span style={{ color: "#888", fontSize: 12 }}>{visible ? "▲ ocultar" : "▼ mostrar"}</span>
      </div>
      {visible && (
        <div style={{ padding: 14 }}>
          {addresses.length === 0 ? (
            <span style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>
              Aún no hay direcciones en uso — añade contactos o salidas a un segmento para nombrarlas aquí.
            </span>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
              {addresses.map((addr) => (
                <div key={addr} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontFamily: T.mono, fontSize: 13, color: T.tiaText, width: 46, flexShrink: 0 }}>{addr}</span>
                  <input
                    value={symbols[addr] || ""}
                    onChange={(e) => onChangeSymbol(addr, e.target.value)}
                    placeholder="ej. Marcha M1"
                    style={{
                      fontFamily: T.mono,
                      fontSize: 13,
                      flex: 1,
                      border: `1px solid ${T.dwGrey}`,
                      padding: "3px 6px",
                      color: T.tiaText,
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente PLC S7-1200 Pixelado
// ---------------------------------------------------------------------------
function SiemensPLC({ inputs, outputs, running, error }) {
  const ledSize = 10;
  
  const renderLedRow = (addrs, states, label) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, marginRight: 8 }}>
      <div style={{ display: "flex", gap: 6 }}>
        {addrs.map((a) => (
          <div key={a} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: 10, color: "#AAA" }}>{a.split('.')[1]}</span>
            <div style={{
              width: ledSize, height: ledSize, 
              backgroundColor: states[a] ? T.sLedGreen : T.sLedOff,
              border: `2px solid ${T.dwBlack}`,
              boxShadow: states[a] ? `0 0 5px ${T.sLedGreen}` : 'inset 1px 1px 2px #000'
            }} />
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: "#CCC", textAlign: "right", marginTop: 2 }}>{label}</div>
    </div>
  );

  return (
    <div style={{
      backgroundColor: T.sBg,
      border: `4px solid ${T.dwBlack}`,
      width: 320,
      padding: 12,
      display: "flex",
      flexDirection: "column",
      gap: 10,
      boxShadow: '10px 10px 0px rgba(0,0,0,0.5)'
    }}>
      {/* Upper Terminals / Input LEDs */}
      <div style={{ display: "flex", justifyContent: "space-between", backgroundColor: T.sDark, padding: 8, border: `2px solid ${T.dwBlack}` }}>
        {renderLedRow(INPUT_ADDR.slice(0, 8), inputs, "DI a")}
        {renderLedRow(INPUT_ADDR.slice(8, 10), inputs, "DI b")}
      </div>

      {/* Center Branding & Status */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
        <div style={{ position: "absolute", top: -5, left: -12, width: "calc(100% + 24px)", height: 6, backgroundColor: T.sBlue, borderTop: `2px solid ${T.dwBlack}`, borderBottom: `2px solid ${T.dwBlack}` }} />
        
        <div style={{ marginTop: 15, display: "flex", gap: 10, backgroundColor: "#222", padding: "4px 8px", border: `2px solid ${T.dwBlack}` }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: running ? T.sLedGreen : T.sLedOff, border: '1px solid #000' }} />
            <span style={{ fontSize: 10, color: "#FFF" }}>RUN</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: !running ? T.dwYellow : T.sLedOff, border: '1px solid #000' }} />
            <span style={{ fontSize: 10, color: "#FFF" }}>STOP</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: error ? T.red : T.sLedOff, border: '1px solid #000' }} />
            <span style={{ fontSize: 10, color: "#FFF" }}>ERROR</span>
          </div>
        </div>
        
        <div style={{ marginTop: 15, textAlign: "right" }}>
          <div style={{ fontSize: 18, fontWeight: "bold", color: "#FFF", letterSpacing: 1, textShadow: "2px 2px #000" }}>SIEMENS</div>
          <div style={{ fontSize: 14, color: "#CCC" }}>SIMATIC S7-1200</div>
        </div>
      </div>

      {/* Lower Terminals / Output LEDs */}
      <div style={{ display: "flex", justifyContent: "space-between", backgroundColor: T.sDark, padding: 8, border: `2px solid ${T.dwBlack}` }}>
        {renderLedRow(OUTPUT_ADDR.slice(0, 8), outputs, "DQ a")}
        {renderLedRow(OUTPUT_ADDR.slice(8, 10), outputs, "DQ b")}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente HMI DeWalt
// ---------------------------------------------------------------------------
function HmiPanel({ inputs, onToggle, onPulse, running, timers, deviceMap, scanCount }) {
  const activeTimers = Object.entries(timers || {}).filter(([_, val]) => val > 0);

  return (
    <div style={{
      backgroundColor: T.dwYellow,
      border: `4px solid ${T.dwBlack}`,
      padding: 16,
      width: 320,
      marginTop: 16,
      boxShadow: '10px 10px 0px rgba(0,0,0,0.5)',
      ...pixelBorderStyle
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: `2px solid ${T.dwBlack}`, paddingBottom: 4, marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20, color: T.dwBlack, textTransform: "uppercase", letterSpacing: 1 }}>Panel HMI</h2>
        <span style={{ fontSize: 14, color: T.dwBlack }}>FORCE IO</span>
      </div>

      {/* Pantalla LCD Retro */}
      <div style={{
        backgroundColor: "#8BA791", // Verde LCD clásico
        border: `4px solid ${T.dwGrey}`,
        padding: "8px 12px",
        marginBottom: 16,
        minHeight: 60,
        boxShadow: 'inset 3px 3px 6px rgba(0,0,0,0.5)',
        color: "#1E2B22",
        fontFamily: T.mono,
        fontSize: 16,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        textTransform: "uppercase"
      }}>
         <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>SYS: {running ? "RUNNING" : "STOPPED"}</span>
            <span style={{ animation: running ? "blink 1s infinite" : "none" }}>{running ? "▶" : "⏸"}</span>
         </div>
         <div style={{ marginTop: 2, fontSize: 13 }}>CICLO: {String(scanCount ?? 0).padStart(5, "0")}</div>
         {activeTimers.length > 0 ? (
           <div style={{ marginTop: 4, fontSize: 14, color: "#111" }}>
             T. ACTIVOS: {activeTimers.length}
           </div>
         ) : (
           <div style={{ marginTop: 4, fontSize: 14, opacity: 0.7 }}>ESPERANDO PROCESO...</div>
         )}
      </div>

      <div style={{
        backgroundColor: T.dwBlack,
        color: T.dwYellow,
        padding: 12,
        border: `4px solid ${T.dwGrey}`,
        boxShadow: 'inset 4px 4px 0px rgba(0,0,0,0.8)'
      }}>
        <div style={{ fontSize: 16, marginBottom: 10, textAlign: "center", borderBottom: `2px dashed ${T.dwGrey}`, paddingBottom: 4 }}>
          ESTADO ENTRADAS
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
          {INPUT_ADDR.map((a) => {
            const type = deviceMap?.[a];
            const isPulse = type === "pulsador";
            const isStop = type === "paro";

            if (isStop) {
              return (
                <button
                  key={a}
                  title="Seta de PARO: clic para enclavar, clic de nuevo para rearmar"
                  onClick={() => onToggle(a)}
                  style={{
                    fontFamily: T.mono,
                    fontSize: 13,
                    width: "100%",
                    aspectRatio: "1 / 1",
                    borderRadius: "50%",
                    backgroundColor: inputs[a] ? "#8B0000" : T.red,
                    color: "#FFF",
                    border: `3px solid ${T.dwYellow}`,
                    boxShadow: inputs[a]
                      ? "inset 3px 3px 6px rgba(0,0,0,0.7)"
                      : "0 3px 0 rgba(0,0,0,0.6)",
                    transform: inputs[a] ? "translateY(2px)" : "none",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  {a.replace('I', '')}
                </button>
              );
            }

            return (
              <button
                key={a}
                title={isPulse ? "Pulsador: activo solo mientras lo mantienes pulsado" : "Interruptor: clic para alternar"}
                onClick={isPulse ? undefined : () => onToggle(a)}
                onMouseDown={isPulse ? () => onPulse(a, true) : undefined}
                onMouseUp={isPulse ? () => onPulse(a, false) : undefined}
                onMouseLeave={isPulse ? () => onPulse(a, false) : undefined}
                onTouchStart={isPulse ? (e) => { e.preventDefault(); onPulse(a, true); } : undefined}
                onTouchEnd={isPulse ? (e) => { e.preventDefault(); onPulse(a, false); } : undefined}
                style={{
                  fontFamily: T.mono,
                  fontSize: 16,
                  backgroundColor: inputs[a] ? T.dwYellow : T.dwGrey,
                  color: inputs[a] ? T.dwBlack : "#888",
                  border: `2px solid ${inputs[a] ? "#FFF" : T.dwBlack}`,
                  borderRadius: isPulse ? "50%" : 0,
                  padding: "8px 0",
                  cursor: "pointer",
                  boxShadow: inputs[a] ? `0 0 8px ${T.dwYellow}` : "inset 2px 2px 0px rgba(0,0,0,0.5)",
                  userSelect: "none",
                }}
              >
                {a.replace('I', '')}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gráficos TIA Portal (KOP)
// ---------------------------------------------------------------------------
function TiaLine({ active, vertical, size = 20 }) {
  const color = active ? T.tiaLineActive : T.tiaLine;
  return (
    <div style={{
      width: vertical ? 3 : size,
      height: vertical ? size : 3,
      backgroundColor: color,
      margin: vertical ? "0 4px" : "0",
      transition: "background-color 0.1s"
    }} />
  );
}

function TiaContact({ neg, stateObj }) {
  const active = stateObj?.flowIn && stateObj?.state;
  const color = active ? T.tiaLineActive : T.tiaLine;
  const hasFlow = stateObj?.flowIn;
  
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <TiaLine active={hasFlow} size={8} />
      <svg width="24" height="30" viewBox="0 0 24 30" style={{ overflow: 'visible' }}>
        <line x1="0" y1="15" x2="8" y2="15" stroke={hasFlow ? T.tiaLineActive : T.tiaLine} strokeWidth="3" strokeLinecap="square" />
        <line x1="16" y1="15" x2="24" y2="15" stroke={active ? T.tiaLineActive : T.tiaLine} strokeWidth="3" strokeLinecap="square" />
        <line x1="8" y1="5" x2="8" y2="25" stroke={color} strokeWidth="3" strokeLinecap="square" />
        <line x1="16" y1="5" x2="16" y2="25" stroke={color} strokeWidth="3" strokeLinecap="square" />
        {neg && <line x1="6" y1="26" x2="18" y2="4" stroke={color} strokeWidth="3" strokeLinecap="square" />}
      </svg>
      <TiaLine active={active} size={8} />
    </div>
  );
}

function TiaCoil({ active, flowIn }) {
  const color = active && flowIn ? T.tiaLineActive : T.tiaLine;
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <TiaLine active={flowIn} size={12} />
      <svg width="28" height="30" viewBox="0 0 28 30">
        <line x1="0" y1="15" x2="6" y2="15" stroke={flowIn ? T.tiaLineActive : T.tiaLine} strokeWidth="3" strokeLinecap="square" />
        <line x1="22" y1="15" x2="28" y2="15" stroke={color} strokeWidth="3" strokeLinecap="square" />
        <path d="M 10 5 A 10 10 0 0 0 10 25" fill="none" stroke={color} strokeWidth="3" />
        <path d="M 18 5 A 10 10 0 0 1 18 25" fill="none" stroke={color} strokeWidth="3" />
      </svg>
    </div>
  );
}

function TiaSetReset({ active, flowIn, type }) {
  const color = active && flowIn ? T.tiaLineActive : T.tiaLine;
  const letter = type === "set" ? "S" : "R";
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <TiaLine active={flowIn} size={12} />
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <svg width="28" height="30" viewBox="0 0 28 30">
          <line x1="0" y1="15" x2="6" y2="15" stroke={flowIn ? T.tiaLineActive : T.tiaLine} strokeWidth="3" strokeLinecap="square" />
          <line x1="22" y1="15" x2="28" y2="15" stroke={color} strokeWidth="3" strokeLinecap="square" />
          <path d="M 10 5 A 10 10 0 0 0 10 25" fill="none" stroke={color} strokeWidth="3" />
          <path d="M 18 5 A 10 10 0 0 1 18 25" fill="none" stroke={color} strokeWidth="3" />
        </svg>
        <span style={{ position: 'absolute', fontSize: 13, fontWeight: 'bold', color: color, fontFamily: 'sans-serif', marginTop: 1 }}>{letter}</span>
      </div>
    </div>
  );
}

function TiaTonBox({ active, flowIn, preset, elapsed }) {
  const color = active && flowIn ? T.tiaLineActive : T.tiaLine;
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <TiaLine active={flowIn} size={8} />
      <div style={{
        border: `3px solid ${color}`,
        backgroundColor: "#FFF",
        width: 60,
        height: 50,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "2px 4px",
        position: "relative",
        boxShadow: `2px 2px 0px 0px rgba(0,0,0,0.15)`,
      }}>
        <div style={{ fontSize: 12, textAlign: "center", fontWeight: "bold", borderBottom: `1px solid ${color}`, color: T.tiaText }}>TON</div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T.tiaText }}>
          <div>IN</div>
          <div>Q</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T.tiaText }}>
          <div>PT</div>
          <div>ET</div>
        </div>
        {/* Helper text outside box */}
        <div style={{ position: "absolute", bottom: -16, left: 0, fontSize: 12, color: T.tiaBlue }}>{preset}s</div>
        <div style={{ position: "absolute", bottom: -16, right: 0, fontSize: 12, color: T.tiaText }}>{(elapsed || 0).toFixed(1)}s</div>
      </div>
      <TiaLine active={color === T.tiaLineActive} size={8} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editor de Lógica KOP
// ---------------------------------------------------------------------------
function TiaSelect({ value, onChange, options, isOut, symbols }) {
  const labelFor = (addr) => (symbols && symbols[addr] ? `${addr} · ${symbols[addr]}` : addr);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={pixelSelectStyle({
        fontFamily: T.mono,
        fontSize: 13,
        position: "absolute",
        top: -20,
        left: isOut ? "auto" : "50%",
        right: isOut ? 0 : "auto",
        transform: isOut ? "none" : "translateX(-50%)",
        color: T.tiaText,
        outline: "none",
        maxWidth: 150,
        padding: "1px 14px 1px 4px",
        boxShadow: `1px 1px 0px 0px ${T.dwGrey}`,
      })}
    >
      {options.map((o) => <option key={o} value={o}>{labelFor(o)}</option>)}
    </select>
  );
}

function TiaMiniBtn({ onClick, children, disabled }) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      style={{
        background: "none", border: "1px dashed #CCC", fontSize: 12, cursor: disabled ? "default" : "pointer",
        color: disabled ? "#EEE" : "#888", margin: "0 2px", padding: "0 4px"
      }}
    >
      {children}
    </button>
  );
}

function LogicSeries({ containerId, nodes, states, actions, depth, flowIn, symbols }) {
  let currentFlow = flowIn;
  
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {nodes.map((n, idx) => {
        const nodeState = states[n.id];
        const prevFlow = currentFlow;
        currentFlow = currentFlow && nodeState?.state;

        return (
          <React.Fragment key={n.id}>
            {idx > 0 && <TiaLine active={prevFlow} size={16} />}
            {n.kind === "contact" ? (
              <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", margin: "0 4px" }}>
                <TiaSelect value={n.addr} onChange={(v) => actions.updateContact(n.id, { addr: v })} options={[...INPUT_ADDR, ...OUTPUT_ADDR]} symbols={symbols} />
                <div 
                  onClick={() => actions.updateContact(n.id, { neg: !n.neg })}
                  style={{ cursor: "pointer" }} title="Click para alternar NA/NC"
                >
                  <TiaContact neg={n.neg} stateObj={{ ...nodeState, flowIn: prevFlow }} />
                </div>
                {nodes.length > 1 && (
                  <button onClick={() => actions.removeNode(n.id)} style={{ position: "absolute", bottom: -15, fontSize: 10, color: "red", border: "none", background: "none", cursor: "pointer" }}>✕</button>
                )}
              </div>
            ) : (
              <ParallelBlock node={n} states={states} actions={actions} removable={nodes.length > 1} depth={depth} flowIn={prevFlow} symbols={symbols} />
            )}
          </React.Fragment>
        );
      })}
      
      <div style={{ display: "flex", marginLeft: 8 }}>
        <TiaMiniBtn onClick={() => actions.addContact(containerId)} disabled={actions.totalContacts() >= 8}>+C</TiaMiniBtn>
        {depth === 0 && (
          <TiaMiniBtn onClick={() => actions.addParallel(containerId)} disabled={actions.totalContacts() >= 8}>+P</TiaMiniBtn>
        )}
      </div>
    </div>
  );
}

function ParallelBlock({ node, states, actions, removable, depth, flowIn, symbols }) {
  return (
    <div style={{ display: "flex", alignItems: "center", position: "relative", margin: "0 4px" }}>
      <div style={{ display: "flex", flexDirection: "column", position: "relative" }}>
        
        {/* Left vertical rail of parallel group */}
        <div style={{ position: "absolute", left: 0, top: 15, bottom: 15, width: 2, backgroundColor: flowIn ? T.tiaLineActive : T.tiaLine }} />

        {node.branches.map((br, idx) => {
          // A branch is active if any node in it passes flow, but visually we just evaluate it
          const isLast = idx === node.branches.length - 1;
          const isFirst = idx === 0;
          return (
            <div key={br.id} style={{ display: "flex", alignItems: "center", padding: "10px 0", position: "relative" }}>
              <TiaLine active={flowIn} size={12} />
              <LogicSeries containerId={br.id} nodes={br.nodes} states={states} actions={actions} depth={depth + 1} flowIn={flowIn} symbols={symbols} />
              <TiaLine active={states[br.id]?.flowOut || false} size={12} /> 
              {/* Note: Simplified parallel reconnect visual. True TIA Portal draws right rail perfectly, we do our best with flexbox */}
              
              {node.branches.length > 2 && (
                <button onClick={() => actions.removeBranch(node.id, br.id)} style={{ color: "red", background: "none", border: "none", cursor: "pointer", fontSize: 12 }}>✕</button>
              )}
            </div>
          );
        })}
        
        {/* Right vertical rail */}
        <div style={{ position: "absolute", right: 0, top: 15, bottom: 15, width: 2, backgroundColor: T.tiaLine }} /> 

        <div style={{ paddingLeft: 12 }}>
          <TiaMiniBtn onClick={() => actions.addBranch(node.id)} disabled={node.branches.length >= 4}>+Rama</TiaMiniBtn>
        </div>
      </div>
      {removable && (
         <button onClick={() => actions.removeNode(node.id)} style={{ position: "absolute", bottom: -5, left: -5, color: "red", background: "none", border: "none", cursor: "pointer", fontSize: 12 }}>✕</button>
      )}
    </div>
  );
}

function TiaSegment({ rung, onChange, onDelete, evalResult, canDelete, symbols }) {
  const actions = {
    totalContacts: () => countContacts(rung.logic),
    addContact: (containerId) => onChange({ ...rung, logic: mapContainer(rung.logic, containerId, (nodes) => [...nodes, newContactNode()]) }),
    addParallel: (containerId) => onChange({ ...rung, logic: mapContainer(rung.logic, containerId, (nodes) => [...nodes, newParallelNode()]) }),
    removeNode: (nodeId) => onChange({ ...rung, logic: removeNodeEverywhere(rung.logic, nodeId) }),
    updateContact: (contactId, patch) => onChange({ ...rung, logic: updateContactEverywhere(rung.logic, contactId, patch) }),
    addBranch: (parallelId) => onChange({ ...rung, logic: addBranchToParallel(rung.logic, parallelId) }),
    removeBranch: (parallelId, branchId) => onChange({ ...rung, logic: removeBranchFromParallel(rung.logic, parallelId, branchId) }),
  };

  // Determine final flow reaching the output
  let flowToOut = true;
  rung.logic.forEach(n => {
     flowToOut = flowToOut && evalResult?.states?.[n.id]?.state;
  });

  return (
    <div style={{ backgroundColor: T.tiaBg, border: `2px solid ${T.dwBlack}`, boxShadow: "4px 4px 0px 0px rgba(0,0,0,0.25)", marginBottom: 20 }}>
      {/* Header TIA Portal */}
      <div style={{ backgroundColor: T.tiaHeader, padding: "4px 8px", borderBottom: `2px solid ${T.dwBlack}`, display: "flex", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            value={rung.title}
            onChange={(e) => onChange({ ...rung, title: e.target.value })}
            className="dw-edit-field dw-edit-field-dark"
            style={{
              width: 120,
              fontWeight: "bold",
              fontSize: 16,
              color: T.tiaText,
              fontFamily: T.mono,
              outline: "none",
              padding: "2px 0",
            }}
            title="Clic para renombrar el segmento"
          />
          <span style={{ color: T.tiaText }}>:</span>
          <input 
            value={rung.comment} 
            onChange={(e) => onChange({...rung, comment: e.target.value})}
            className="dw-edit-field dw-edit-field-dark"
            style={{ width: 300, fontStyle: "italic", color: "#555", fontFamily: T.mono, fontSize: 16, outline: "none", padding: "2px 0" }}
          />
        </div>
        <div>
          {canDelete && <button onClick={onDelete} style={{ color: "red", cursor: "pointer", border: "none", background: "none", fontSize: 16 }}>🗑️</button>}
        </div>
      </div>

      {/* Rung Logic Area */}
      <div style={{ padding: "30px 10px", display: "flex", alignItems: "center", overflowX: "auto" }}>
        
        {/* Left Power Rail */}
        <div style={{ width: 4, backgroundColor: T.tiaLine, height: 60, marginRight: 4 }} />
        
        <LogicSeries containerId="root" nodes={rung.logic} states={evalResult?.states || {}} actions={actions} depth={0} flowIn={true} symbols={symbols} />
        
        {/* Main Line connecting to Output */}
        <div style={{ flex: 1, height: 3, backgroundColor: flowToOut ? T.tiaLineActive : T.tiaLine, minWidth: 40 }} />
        
        {/* Output Device */}
        <div style={{ position: "relative", marginRight: 8, display: "flex", alignItems: "center" }}>
          {rung.outType === "ton" ? (
             <TiaTonBox active={evalResult?.outputState} flowIn={flowToOut} preset={rung.preset} elapsed={evalResult?.timerElapsed} />
          ) : rung.outType === "set" || rung.outType === "reset" ? (
             <TiaSetReset active={evalResult?.outputState} flowIn={flowToOut} type={rung.outType} />
          ) : (
             <TiaCoil active={evalResult?.outputState} flowIn={flowToOut} />
          )}
          <TiaSelect value={rung.outAddr} onChange={(v) => onChange({ ...rung, outAddr: v })} options={OUTPUT_ADDR} isOut={true} symbols={symbols} />
        </div>

        {/* Right Power Rail */}
        <div style={{ width: 4, backgroundColor: T.tiaLine, height: 60, marginLeft: 4 }} />
      </div>

      {/* Output Type Selector / Footer */}
      <div style={{ backgroundColor: "#F9F9F9", borderTop: "1px solid #EEE", padding: "4px 8px", display: "flex", gap: 12, fontSize: 14 }}>
         <label style={{ display: "flex", alignItems: "center", gap: 4, color: T.tiaText, cursor: "pointer" }}>
            <input type="radio" checked={rung.outType === "coil"} onChange={() => onChange({...rung, outType: "coil"})} />
            Bobina -( )
         </label>
         <label style={{ display: "flex", alignItems: "center", gap: 4, color: T.tiaText, cursor: "pointer" }}>
            <input type="radio" checked={rung.outType === "set"} onChange={() => onChange({...rung, outType: "set"})} />
            Set -(S)
         </label>
         <label style={{ display: "flex", alignItems: "center", gap: 4, color: T.tiaText, cursor: "pointer" }}>
            <input type="radio" checked={rung.outType === "reset"} onChange={() => onChange({...rung, outType: "reset"})} />
            Reset -(R)
         </label>
         <label style={{ display: "flex", alignItems: "center", gap: 4, color: T.tiaText, cursor: "pointer" }}>
            <input type="radio" checked={rung.outType === "ton"} onChange={() => onChange({...rung, outType: "ton"})} />
            Temp TON
         </label>
         {rung.outType === "ton" && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
               <span style={{color: T.tiaText}}>PT (segs):</span>
               <input 
                  type="number" min={1} max={30} value={rung.preset} 
                  onChange={(e) => onChange({...rung, preset: Number(e.target.value) || 1})}
                  style={{ width: 50, fontFamily: T.mono, fontSize: 14, textAlign: "center" }}
               />
            </div>
         )}
      </div>
    </div>
  );
}


// ---------------------------------------------------------------------------
// App Principal
// ---------------------------------------------------------------------------
export default function PlcEmulator() {
  const [projectName, setProjectName] = useState("Proyecto ELEE0109");
  const [inputs, setInputs] = useState(() => Object.fromEntries(INPUT_ADDR.map((a) => [a, false])));
  const [outputs, setOutputs] = useState(() => Object.fromEntries(OUTPUT_ADDR.map((a) => [a, false])));
  const [rungs, setRungs] = useState([newRung(0)]);
  const [running, setRunning] = useState(false);
  const [deviceMap, setDeviceMap] = useState({});
  const [wiringMap, setWiringMap] = useState({});
  const [symbols, setSymbols] = useState({});
  const [showProcess, setShowProcess] = useState(true);
  const [showSymbols, setShowSymbols] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [scanCount, setScanCount] = useState(0);
  const [importError, setImportError] = useState("");
  const setDeviceType = (addr, type) => setDeviceMap((prev) => ({ ...prev, [addr]: type }));
  const setWiringFor = (addr, wiring) => setWiringMap((prev) => ({ ...prev, [addr]: wiring }));
  const setSymbolFor = (addr, name) => setSymbols((prev) => ({ ...prev, [addr]: name }));
  const timersRef = useRef({}); 
  const [timerDisplay, setTimerDisplay] = useState({});
  const inputsRef = useRef(inputs);
  inputsRef.current = inputs;
  const rungsRef = useRef(rungs);
  rungsRef.current = rungs;
  const outputsRef = useRef(outputs);
  const deviceMapRef = useRef(deviceMap);
  deviceMapRef.current = deviceMap;
  const wiringMapRef = useRef(wiringMap);
  wiringMapRef.current = wiringMap;
  const soundOnRef = useRef(soundOn);
  soundOnRef.current = soundOn;
  const audioCtxRef = useRef(null);
  const prevAlarmRef = useRef({});
  const fileInputRef = useRef(null);

  const toggleInput = (addr) => setInputs((prev) => ({ ...prev, [addr]: !prev[addr] }));
  const setInputMomentary = (addr, val) => setInputs((prev) => ({ ...prev, [addr]: val }));

  const ensureAudio = () => {
    if (!audioCtxRef.current) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtxRef.current = new AC();
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  };

  const beep = () => {
    if (!soundOnRef.current) return;
    const ctx = ensureAudio();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = 880;
      gain.gain.value = 0.05;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      /* audio no disponible en este entorno, se ignora en silencio */
    }
  };

  const checkAlarms = (nextOutputs) => {
    Object.keys(nextOutputs).forEach((addr) => {
      if (deviceMapRef.current[addr] === "alarma") {
        const wasOn = prevAlarmRef.current[addr] || false;
        const isOn = nextOutputs[addr];
        if (isOn && !wasOn) beep();
        prevAlarmRef.current[addr] = isOn;
      }
    });
  };

  // Un único ciclo de scan (leer entradas+Q previa, ejecutar segmentos en
  // orden, escribir salidas). Se llama tanto desde el intervalo de RUN como
  // desde el botón de PASO — misma lógica, distinto disparador.
  const runScanTick = () => {
    const mem = { ...applyWiring(inputsRef.current, wiringMapRef.current), ...outputsRef.current };
    const nextTimerDisplay = {};

    rungsRef.current.forEach((rung) => {
      const combined = evalSeries(rung.logic, mem);
      let outVal;
      if (rung.outType === "coil") {
        outVal = combined;
        mem[rung.outAddr] = outVal;
      } else if (rung.outType === "set") {
        if (combined) mem[rung.outAddr] = true;
      } else if (rung.outType === "reset") {
        if (combined) mem[rung.outAddr] = false;
      } else {
        const prevElapsed = timersRef.current[rung.id] || 0;
        let elapsed = combined ? prevElapsed + SCAN_MS / 1000 : 0;
        if (elapsed > rung.preset) elapsed = rung.preset;
        timersRef.current[rung.id] = elapsed;
        nextTimerDisplay[rung.id] = elapsed;
        outVal = elapsed >= rung.preset;
        mem[rung.outAddr] = outVal;
      }
    });

    const nextOutputs = Object.fromEntries(OUTPUT_ADDR.map((a) => [a, !!mem[a]]));
    outputsRef.current = nextOutputs;
    setOutputs(nextOutputs);
    setTimerDisplay(nextTimerDisplay);
    setScanCount((n) => n + 1);
    checkAlarms(nextOutputs);
  };

  const stepOnce = () => {
    setRunning(false);
    ensureAudio();
    runScanTick();
  };

  // Scan Cycle
  useEffect(() => {
    if (!running) return;
    const id = setInterval(runScanTick, SCAN_MS);
    return () => clearInterval(id);
  }, [running]);

  const exportProject = () => {
    const data = { version: 1, projectName, rungs, deviceMap, wiringMap, symbols };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(projectName || "proyecto").replace(/[^a-z0-9_-]+/gi, "_")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importProject = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || !Array.isArray(data.rungs) || data.rungs.length === 0) {
          throw new Error("El archivo no tiene el formato esperado (falta 'rungs').");
        }
        bumpUidPastImportedRungs(data.rungs);
        setProjectName(data.projectName || "Proyecto importado");
        setRungs(data.rungs);
        setDeviceMap(data.deviceMap || {});
        setWiringMap(data.wiringMap || {});
        setSymbols(data.symbols || {});
        setRunning(false);
        const zeroOut = Object.fromEntries(OUTPUT_ADDR.map((a) => [a, false]));
        setInputs(Object.fromEntries(INPUT_ADDR.map((a) => [a, false])));
        setOutputs(zeroOut);
        outputsRef.current = zeroOut;
        timersRef.current = {};
        setTimerDisplay({});
        setScanCount(0);
        setImportError("");
      } catch (e) {
        setImportError("No se pudo importar: " + e.message);
      }
    };
    reader.onerror = () => setImportError("No se pudo leer el archivo.");
    reader.readAsText(file);
  };

  const reset = () => {
    setRunning(false);
    const zeroOut = Object.fromEntries(OUTPUT_ADDR.map((a) => [a, false]));
    setInputs(Object.fromEntries(INPUT_ADDR.map((a) => [a, false])));
    setOutputs(zeroOut);
    outputsRef.current = zeroOut;
    timersRef.current = {};
    setTimerDisplay({});
    setScanCount(0);
    prevAlarmRef.current = {};
  };

  // Entradas ya convertidas según el cableado físico (NA/NC) de cada
  // dispositivo — esto es lo que realmente "ve" el autómata y lo que debe
  // pintarse en los LEDs del PLC y en la lógica del editor.
  const effectiveInputs = applyWiring(inputs, wiringMap);

  return (
    <>
      <style>{fontStyles}</style>
      <div className="dw-crt-overlay" />
      <div style={{ display: "flex", height: "100vh", backgroundColor: T.dwDark, fontFamily: T.mono, overflow: "hidden" }}>
        
        {/* Left Sidebar: PLC & HMI */}
        <div style={{ width: 380, padding: 20, borderRight: `4px solid ${T.dwBlack}`, backgroundColor: T.dwGrey, overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center" }}>
          
          <div style={{ width: "100%", marginBottom: 20, textAlign: "center" }}>
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="dw-edit-field"
              style={{
                width: "100%",
                textAlign: "center",
                outline: "none",
                color: T.dwYellow,
                fontFamily: T.mono,
                fontWeight: "bold",
                fontSize: 24,
                letterSpacing: 1,
                padding: "4px 0",
                textShadow: `2px 2px 0 ${T.dwBlack}`,
                textTransform: "uppercase",
              }}
              title="Clic para renombrar el proyecto"
            />
            <p style={{ color: "#AAA", fontSize: 14, marginTop: 6, letterSpacing: 1 }}>v2.0 TIA & ElektriZIA Edition</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 8 }}>
              <PixelBtn small color="dwGrey" onClick={exportProject}>💾 Exportar</PixelBtn>
              <PixelBtn small color="dwGrey" onClick={() => fileInputRef.current?.click()}>📂 Importar</PixelBtn>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importProject(file);
                e.target.value = "";
              }}
            />
            {importError && (
              <div style={{ color: T.red, fontSize: 12, marginTop: 6 }}>{importError}</div>
            )}
          </div>

          <SiemensPLC inputs={effectiveInputs} outputs={outputs} running={running} error={false} />
          <HmiPanel inputs={inputs} onToggle={toggleInput} onPulse={setInputMomentary} deviceMap={deviceMap} running={running} timers={timerDisplay} scanCount={scanCount} />
          
          <div style={{ display: "flex", gap: 12, marginTop: 30, width: "100%", justifyContent: "center", flexWrap: "wrap" }}>
             <PixelBtn active={running} onClick={() => setRunning(!running)}>{running ? '⏸ STOP' : '▶ RUN'}</PixelBtn>
             <PixelBtn color="red" onClick={reset}>⟲ RESET</PixelBtn>
             <PixelBtn small color="dwGrey" onClick={stepOnce} title="Ejecuta un único ciclo de scan y para">⏭ 1 CICLO</PixelBtn>
             <PixelBtn small color="dwGrey" active={!soundOn} onClick={() => setSoundOn((v) => !v)} title="Silenciar/activar el pitido de alarma">
               {soundOn ? "🔊 SONIDO" : "🔇 MUDO"}
             </PixelBtn>
          </div>
        </div>

        {/* Right Area: TIA Portal Editor */}
        <div style={{ flex: 1, backgroundColor: "#EBEBEB", display: "flex", flexDirection: "column" }}>
          
          <div style={{ backgroundColor: "#F0F0F0", borderBottom: "1px solid #CCC", padding: "10px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
             <div>
                <div style={{ fontSize: 20, fontWeight: "bold", color: T.tiaText }}>Main [OB1]</div>
                <div style={{ fontSize: 14, color: "#666" }}>Program block (Ladder Logic)</div>
             </div>
             <PixelBtn small color="dwGrey" onClick={() => {
                if(rungs.length < MAX_RUNGS) {
                  setRungs([...rungs, newRung(rungs.length ? Math.max(...rungs.map(r=>r.id))+1 : 0)])
                }
             }}>+ Añadir Segmento</PixelBtn>
          </div>

          <div style={{ flex: 1, padding: 20, overflowY: "auto" }}>
            {collectOutputConflicts(rungs).length > 0 && (
              <div style={{ background: "#FFF3CD", border: "1px solid #FFB300", color: "#7A5200", padding: "8px 12px", marginBottom: 16, fontSize: 13 }}>
                ⚠️ Direcciones de salida repetidas sin ser SET/RESET:{" "}
                {collectOutputConflicts(rungs)
                  .map(([addr, idxs]) => `${addr} (${idxs.map((i) => rungs[i].title).join(", ")})`)
                  .join(" · ")}
              </div>
            )}
            <ProcessPanel
              addresses={collectUsedAddresses(rungs)}
              deviceMap={deviceMap}
              onChangeType={setDeviceType}
              wiringMap={wiringMap}
              onChangeWiring={setWiringFor}
              inputs={inputs}
              outputs={outputs}
              visible={showProcess}
              onToggle={() => setShowProcess((v) => !v)}
            />
            <SymbolsPanel
              addresses={collectUsedAddresses(rungs)}
              symbols={symbols}
              onChangeSymbol={setSymbolFor}
              visible={showSymbols}
              onToggle={() => setShowSymbols((v) => !v)}
            />
            {rungs.map((rung, idx) => {
              const states = computeStates(rung.logic, { ...effectiveInputs, ...outputs }, {});
              return (
                <TiaSegment
                  key={rung.id}
                  rung={rung}
                  canDelete={rungs.length > 1}
                  symbols={symbols}
                  onChange={(next) => setRungs(rungs.map((r, i) => (i === idx ? next : r)))}
                  onDelete={() => {
                    const removedId = rungs[idx].id;
                    delete timersRef.current[removedId];
                    setRungs(rungs.filter((_, i) => i !== idx));
                  }}
                  evalResult={{
                    states,
                    outputState: outputs[rung.outAddr],
                    timerElapsed: rung.outType === "ton" ? timerDisplay[rung.id] ?? 0 : undefined,
                  }}
                />
              );
            })}
            {rungs.length >= MAX_RUNGS && <div style={{ color: "red", textAlign: "center", marginTop: 10 }}>Límite de segmentos alcanzado ({MAX_RUNGS})</div>}
          </div>

        </div>
      </div>
    </>
  );
}