import { T } from "../../utils/constants";

const deviceBoxStyle = {
  width: 40,
  height: 40,
  backgroundColor: T.dwGrey,
  border: `3px solid ${T.dwBlack}`,
  boxShadow: "inset -3px -3px 0px 0px rgba(0,0,0,0.5), inset 3px 3px 0px 0px rgba(255,255,255,0.15), 3px 3px 0px 0px rgba(0,0,0,0.5)",
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
          position: "relative",
          background: active ? T.dwYellow : "#666",
          clipPath: "polygon(50% 0%,61% 39%,100% 50%,61% 61%,50% 100%,39% 61%,0% 50%,39% 39%)",
          boxShadow: active ? `0 0 6px ${T.dwYellow}` : "none",
          animation: active ? "spin 0.5s linear infinite" : "none",
        }}
      >
        <div style={{ position: "absolute", top: "50%", left: "50%", width: 6, height: 6, borderRadius: "50%", background: T.dwBlack, transform: "translate(-50%,-50%)" }} />
      </div>
    </div>
  );
}

function BeltIcon({ active }) {
  const rollerColor = active ? T.dwYellow : "#555";
  return (
    <div style={deviceBoxStyle}>
      <div style={{ position: "absolute", left: 3, width: 8, height: 8, borderRadius: "50%", background: T.sDark, border: `1px solid ${rollerColor}` }} />
      <div style={{ position: "absolute", right: 3, width: 8, height: 8, borderRadius: "50%", background: T.sDark, border: `1px solid ${rollerColor}` }} />
      <div
        style={{
          width: "100%",
          height: 14,
          backgroundImage: `repeating-linear-gradient(45deg, ${rollerColor} 0 6px, ${T.dwBlack} 6px 12px)`,
          backgroundSize: "24px 24px",
          border: `1px solid ${T.dwBlack}`,
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
          background: active
            ? `radial-gradient(circle at 35% 30%, #FF7A7A, ${T.red})`
            : `radial-gradient(circle at 35% 30%, #FFE58A, ${T.dwYellow})`,
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
          background: active
            ? "radial-gradient(circle at 35% 30%, #B33333, #8B0000)"
            : `radial-gradient(circle at 35% 30%, #FF7A7A, ${T.red})`,
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
      <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#222", border: `2px solid ${T.dwBlack}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: active ? T.sLedGreen : T.sLedOff,
            boxShadow: active ? `0 0 8px ${T.sLedGreen}` : "inset 1px 1px 2px #000",
          }}
        />
      </div>
    </div>
  );
}

function LampIcon({ active }) {
  return (
    <div style={deviceBoxStyle}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
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
        <div style={{ width: 10, height: 4, background: T.dwBlack, marginTop: 1 }} />
      </div>
    </div>
  );
}

function AlarmIcon({ active }) {
  return (
    <div style={deviceBoxStyle}>
      <div style={{ position: "relative", width: 22, height: 18 }}>
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
        <span style={{ position: "absolute", top: 6, left: "50%", transform: "translateX(-50%)", fontSize: 10, fontWeight: "bold", color: T.dwBlack, fontFamily: "sans-serif" }}>!</span>
      </div>
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
          backgroundImage: "repeating-linear-gradient(90deg, transparent 0 9px, rgba(0,0,0,0.35) 9px 10px)",
          borderBottom: `2px solid ${T.dwBlack}`,
          transition: "height 0.35s ease",
        }}
      />
      <span style={{ position: "relative", fontSize: 8, color: active ? "#AAA" : "transparent" }}>ABIERTA</span>
    </div>
  );
}

function TimerIcon({ active }) {
  return (
    <div style={deviceBoxStyle}>
      <div style={{ position: "relative", width: 24, height: 24 }}>
        <div style={{ position: "absolute", top: -5, left: "50%", width: 8, height: 3, background: T.dwBlack, transform: "translateX(-50%)" }} />
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: active ? T.dwYellow : "#444",
            border: `2px solid ${T.dwBlack}`,
            boxShadow: active ? `0 0 8px ${T.dwYellow}` : "none",
            animation: active ? "pulseGlow 0.9s ease-in-out infinite" : "none",
          }}
        >
          <div style={{ position: "absolute", top: "50%", left: "50%", width: 2, height: 8, background: T.dwBlack, transformOrigin: "50% 100%", transform: "translate(-50%,-100%)" }} />
          <div style={{ position: "absolute", top: "50%", left: "50%", width: 2, height: 6, background: T.dwBlack, transformOrigin: "50% 100%", transform: "translate(-50%,-100%) rotate(90deg)" }} />
        </div>
      </div>
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
    case "temporizador":
      return <TimerIcon active={active} />;
    default:
      return (
        <div style={{ ...deviceBoxStyle, backgroundColor: "#2A2A2A", border: "2px dashed #555" }}>
          <span style={{ color: "#555", fontSize: 16 }}>—</span>
        </div>
      );
  }
}
