export const T = {
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
  mono: "'Silkscreen', 'Courier New', 'Consolas', monospace",
};

// Direccionamiento real Siemens (Octal por byte: 0.0 a 0.7, 1.0 a 1.1 para 10 entradas/salidas)
export const INPUT_ADDR = ["I0.0", "I0.1", "I0.2", "I0.3", "I0.4", "I0.5", "I0.6", "I0.7", "I1.0", "I1.1"];
export const OUTPUT_ADDR = ["Q0.0", "Q0.1", "Q0.2", "Q0.3", "Q0.4", "Q0.5", "Q0.6", "Q0.7", "Q1.0", "Q1.1"];
export const MAX_RUNGS = 10;
export const SCAN_MS = 100;
