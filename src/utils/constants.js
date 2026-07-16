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
// Marcas (memoria interna, M): a diferencia de I/Q no representan hardware
// físico real, así que no están limitadas al tamaño del panel HMI/físico
// simulado — dos bytes completos (16 bits) dan margen de sobra para
// banderas de secuencia sin tener que seguir gastando una Q libre como
// apaño (patrón que ya aparecía en el ejercicio del semáforo).
export const MARK_ADDR = ["M0.0", "M0.1", "M0.2", "M0.3", "M0.4", "M0.5", "M0.6", "M0.7", "M1.0", "M1.1", "M1.2", "M1.3", "M1.4", "M1.5", "M1.6", "M1.7"];
// Entrada analógica (IW, "input word"): a diferencia de I/Q/M, su valor no
// es un bit sino un número (0-100, como el porcentaje de un sensor de nivel
// o temperatura simulado) — la controla un slider en Proceso simulado en
// vez de un dispositivo NA/NC, y solo un comparador (nodo "compare") puede
// leerla, nunca un contacto normal.
export const ANALOG_ADDR = ["IW0"];
export const ANALOG_MAX = 100;
export const CMP_OPS = [">=", "<=", "==", "<>", "<", ">"];
export const MAX_RUNGS = 10;
export const SCAN_MS = 100;
// Defensa en profundidad: la UI ya impide crear un ciclo de llamadas entre
// bloques (wouldCreateCycle), pero un JSON importado a mano podría traer uno
// — este límite corta la recursión del motor de scan sin colgar la pestaña.
export const MAX_CALL_DEPTH = 16;
