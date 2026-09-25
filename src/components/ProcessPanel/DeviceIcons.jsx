import { T } from "../../utils/constants";
import "./deviceIcons.css";

const NAMES = {
  none: ["Sin dispositivo asignado", "Sin dispositivo asignado"],
  pulsador: ["Pulsador sin pulsar", "Pulsador pulsado"],
  interruptor: ["Interruptor desactivado", "Interruptor activado"],
  paro: ["Parada de emergencia liberada", "Parada de emergencia pulsada"],
  sensor: ["Sensor en reposo", "Sensor detectando"],
  motor: ["Motor detenido", "Motor en marcha"],
  cinta: ["Cinta transportadora detenida", "Cinta transportadora en marcha"],
  lampara: ["Lámpara apagada", "Lámpara encendida"],
  alarma: ["Alarma inactiva", "Alarma activa"],
  puerta: ["Puerta cerrada", "Puerta abierta"],
  temporizador: ["Temporizador inactivo", "Temporizador activo"],
};

const CAPTIONS = {
  none: "SIN ASIGNAR", pulsador: "PULSADOR", interruptor: "PALANCA",
  paro: "PARO", sensor: "SENSOR", motor: "MOTOR", cinta: "CINTA",
  lampara: "LAMPARA", alarma: "ALARMA", puerta: "PUERTA",
  temporizador: "TEMPORIZADOR", analog: "NIVEL",
};

function Artwork({ type, active, value }) {
  const yellow = T.dwYellow;
  const green = T.tiaLineActive;
  const metal = T.sBg;
  const dark = T.dwBlack;

  switch (type) {
    case "pulsador":
      return <>
        <rect x="28" y="24" width="40" height="33" fill="#555" stroke={dark} strokeWidth="3" />
        <rect x="33" y="27" width="30" height="24" fill="#171717" stroke="#949494" strokeWidth="2" />
        <rect x="36" y={active ? 32 : 29} width="24" height="18" fill={active ? green : yellow} stroke={dark} strokeWidth="2" />
        <rect x="39" y={active ? 35 : 32} width="17" height="3" fill="#fff" opacity="0.45" />
        <text x="48" y="66" textAnchor="middle" fill={active ? "#aaff7a" : "#a9a9a9"} fontSize="7">{active ? "PULSADO" : "ESPERA"}</text>
      </>;
    case "interruptor":
      return <>
        <rect x="27" y="22" width="42" height="40" fill={metal} stroke={dark} strokeWidth="3" />
        <rect x="32" y="27" width="32" height="30" fill="#30383c" />
        <circle cx="48" cy="47" r="7" fill="#151515" stroke="#9ea8a9" strokeWidth="2" />
        <path d={active ? "M48 46L60 30" : "M48 46L36 30"} stroke={active ? yellow : "#ddd"} strokeWidth="7" strokeLinecap="square" />
        <rect x={active ? 56 : 30} y="26" width="8" height="6" fill={active ? yellow : "#eee"} stroke={dark} strokeWidth="2" />
      </>;
    case "paro":
      return <>
        <rect x="28" y="27" width="40" height="33" fill={yellow} stroke={dark} strokeWidth="3" />
        <rect x="34" y="33" width="28" height="24" fill="#282828" />
        <rect x="31" y={active ? 38 : 29} width="34" height="14" fill={active ? "#ad1e1e" : T.red} stroke={dark} strokeWidth="3" />
        <rect x="36" y={active ? 41 : 32} width="20" height="3" fill="#ff9b8a" opacity="0.7" />
        <text x="48" y="66" textAnchor="middle" fill={active ? "#ff8b8b" : "#a9a9a9"} fontSize="7">{active ? "PARADA" : "LIBRE"}</text>
      </>;
    case "sensor":
      return <>
        <rect x="20" y="28" width="39" height="30" fill={metal} stroke={dark} strokeWidth="3" />
        <rect x="26" y="34" width="23" height="18" fill="#171717" stroke="#929da2" strokeWidth="2" />
        <circle cx="38" cy="43" r="6" fill={active ? T.sLedGreen : "#33483c"} />
        <rect x="58" y="39" width="20" height="8" fill={active ? "#7dff73" : "#39494a"} opacity={active ? 0.8 : 0.4} />
        <rect x="78" y="28" width="5" height="30" fill={active ? yellow : "#777"} />
        <rect x="18" y="61" width="66" height="4" fill="#101010" />
      </>;
    case "motor":
      return <>
        <rect x="18" y="53" width="61" height="8" fill="#171717" />
        <rect x="25" y="25" width="52" height="32" fill={active ? yellow : metal} stroke={dark} strokeWidth="3" />
        <path d="M31 28v26 M72 28v26" stroke="#272727" strokeWidth="2" />
        <g className={active ? "process-device__rotor" : undefined}>
          <circle cx="51" cy="41" r="13" fill="#27343f" stroke={dark} strokeWidth="2" />
          <path d="M51 30v22 M40 41h22 M43 33l16 16 M59 33L43 49" stroke={active ? "#fff1a4" : "#aab3b8"} strokeWidth="3" />
          <circle cx="51" cy="41" r="4" fill={active ? yellow : "#777"} />
        </g>
        <rect x="78" y="37" width="9" height="8" fill={active ? green : "#666"} stroke={dark} strokeWidth="2" />
      </>;
    case "cinta":
      return <>
        <path d="M20 58v6 M76 58v6" stroke="#8e9b9f" strokeWidth="5" />
        <rect x="12" y="42" width="72" height="18" rx="8" fill="#111" stroke="#859297" strokeWidth="3" />
        <svg x="17" y="46" width="62" height="10" viewBox="0 0 62 10" overflow="hidden">
          <rect width="62" height="10" fill="#272727" />
          <g className={active ? "process-device__belt" : undefined} fill={active ? yellow : "#596267"}>
            {[-12, 0, 12, 24, 36, 48, 60].map((x) => <path key={x} d={`M${x} 0h5l-6 10h-5z`} />)}
          </g>
        </svg>
        <circle cx="20" cy="51" r="5" fill="#596267" stroke={dark} strokeWidth="2" />
        <circle cx="76" cy="51" r="5" fill="#596267" stroke={dark} strokeWidth="2" />
        <g className={active ? "process-device__box" : undefined}>
          <rect x="22" y="22" width="23" height="19" fill={yellow} stroke={dark} strokeWidth="2" />
          <path d="M22 29h23 M33 22v19" stroke="#bd9616" strokeWidth="2" />
        </g>
      </>;
    case "lampara":
      return <>
        <rect x="38" y="55" width="20" height="7" fill="#151515" />
        <rect x="42" y="49" width="12" height="7" fill="#7c8487" />
        <path d="M32 42c0-12 6-18 16-18s16 6 16 18v8H32z" fill={active ? yellow : "#4c5152"} stroke={dark} strokeWidth="3" />
        <path d="M37 39c2-7 5-10 12-10" fill="none" stroke="#fff" strokeWidth="3" opacity={active ? 0.75 : 0.25} />
        {active && <g className="process-device__glow" stroke={yellow} strokeWidth="3"><path d="M48 16v6 M24 38h6 M66 38h6 M29 20l5 5 M67 20l-5 5" /></g>}
      </>;
    case "alarma":
      return <>
        <rect x="31" y="49" width="34" height="9" fill="#727c81" stroke={dark} strokeWidth="2" />
        <rect x="38" y="56" width="20" height="7" fill="#1a1a1a" />
        <path d="M35 48V37c0-12 5-16 13-16s13 4 13 16v11z" fill={active ? T.red : "#753b3b"} stroke={dark} strokeWidth="3" />
        <rect x="43" y="27" width="5" height="18" fill="#ffb3a1" opacity={active ? 0.8 : 0.3} />
        {active && <g className="process-device__flash" stroke="#ff7777" strokeWidth="3"><path d="M48 14v5 M24 29l7 4 M72 29l-7 4 M23 49h7 M73 49h-7" /></g>}
      </>;
    case "puerta":
      return <>
        <rect x="18" y="20" width="60" height="43" fill="#101417" stroke="#9da9ac" strokeWidth="4" />
        <rect x="23" y="24" width="50" height={active ? 10 : 34} fill={metal} stroke={dark} strokeWidth="2" />
        <path d={active ? "M26 28h44" : "M26 32h44 M26 40h44 M26 48h44"} stroke="#374044" strokeWidth="2" />
        {active && <path d="M35 51h26" stroke={green} strokeWidth="4" />}
        <rect x="16" y="62" width="64" height="5" fill="#151515" />
      </>;
    case "temporizador":
      return <>
        <rect x="43" y="18" width="10" height="6" fill="#8f999b" stroke={dark} strokeWidth="2" />
        <circle cx="48" cy="44" r="21" fill={active ? yellow : "#879296"} stroke={dark} strokeWidth="3" />
        <circle cx="48" cy="44" r="16" fill="#27343f" />
        <path d="M48 29v4 M63 44h-4 M48 59v-4 M33 44h4" stroke="#f0f2f5" strokeWidth="2" />
        <g className={active ? "process-device__hand" : undefined}>
          <path d="M48 44V32 M48 44l9 5" fill="none" stroke={active ? "#aaff7a" : "#d3d9dc"} strokeWidth="3" />
        </g>
        <circle cx="48" cy="44" r="3" fill="#fff" />
      </>;
    case "analog": {
      const level = Math.max(0, Math.min(100, Number(value) || 0));
      const height = level * 0.36;
      return <>
        <rect x="28" y="21" width="40" height="43" fill="#15191c" stroke="#a9b6ba" strokeWidth="3" />
        <rect x="33" y={60 - height} width="30" height={height} fill={level >= 80 ? T.siemensOrange : T.sBlue} />
        <path d="M34 31h7 M34 42h7 M34 53h7" stroke="#dce5e8" strokeWidth="2" />
        <rect x="41" y="16" width="14" height="5" fill="#89989e" />
        <text x="48" y="67" textAnchor="middle" fill="#fff" fontSize="8">{level}%</text>
      </>;
    }
    default:
      return <>
        <rect x="25" y="24" width="46" height="38" fill="#292929" stroke="#6d6d6d" strokeWidth="2" strokeDasharray="5 4" />
        <text x="48" y="49" textAnchor="middle" fill="#777" fontSize="23">?</text>
      </>;
  }
}

// Cada escena responde al estado físico I o a la salida Q calculada por el scan.
export function DeviceIcon({ type, active = false, size = 96, value = 0 }) {
  const level = Math.max(0, Math.min(100, Number(value) || 0));
  const label = type === "analog"
    ? `Sensor analógico: ${level} de 100`
    : (NAMES[type] || NAMES.none)[active ? 1 : 0];
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox="0 0 96 74"
      width={size}
      height={Math.round(size * 74 / 96)}
      className={`process-device ${active ? "process-device--active" : ""}`}
      style={{ display: "block", maxWidth: "100%", height: "auto", imageRendering: "pixelated" }}
    >
      <rect x="1" y="1" width="94" height="72" fill="#17191b" stroke={active ? T.dwYellow : "#5c666c"} strokeWidth="2" />
      <rect x="4" y="4" width="88" height="66" fill="#24282b" stroke="#3a4042" strokeWidth="1" />
      <path d="M5 13V5h8 M83 5h8v8 M5 61v8h8 M83 69h8v-8" fill="none" stroke={active ? T.dwYellow : "#687277"} strokeWidth="2" />
      <text x="9" y="13" fill={active ? T.dwYellow : "#acb6ba"} fontFamily="monospace" fontSize="7" fontWeight="bold">{CAPTIONS[type] || CAPTIONS.none}</text>
      <rect x="82" y="7" width="6" height="6" fill={active ? T.sLedGreen : "#48524e"} />
      <Artwork type={type} active={active} value={level} />
    </svg>
  );
}
