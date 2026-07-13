import { T } from "../../utils/constants";

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

export function DeviceIcon({ type, active }) {
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
