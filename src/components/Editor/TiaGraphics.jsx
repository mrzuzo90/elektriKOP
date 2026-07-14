import { useEffect, useRef, useState } from "react";
import { T } from "../../utils/constants";

// Dispara un breve destello (200ms) cada vez que `active` pasa de false a
// true — no en cada render, solo en la transición apagado→encendido.
function useSpark(active) {
  const prevRef = useRef(active);
  const [sparking, setSparking] = useState(false);

  useEffect(() => {
    if (active && !prevRef.current) {
      setSparking(true);
      const id = setTimeout(() => setSparking(false), 250);
      prevRef.current = active;
      return () => clearTimeout(id);
    }
    prevRef.current = active;
  }, [active]);

  return sparking;
}

// Envuelto en una caja de 30px (misma altura que un contacto/bobina) con
// la barra centrada dentro, para que el cable quede siempre a 15px de su
// propio borde superior — la convención que usan TODOS los elementos de
// la escalera, así que basta con alinear cada fila arriba (flex-start)
// para que todo quede a la misma altura sin necesidad de cálculos.
export function TiaLine({ active, size = 20 }) {
  const color = active ? T.tiaLineActive : T.tiaLine;
  return (
    <div style={{ height: 30, display: "flex", alignItems: "center" }}>
      <div style={{ width: size, height: 3, backgroundColor: color, transition: "background-color 0.1s" }} />
    </div>
  );
}

export function TiaContact({ neg, edge, stateObj }) {
  const active = stateObj?.flowIn && stateObj?.state;
  const color = active ? T.tiaLineActive : T.tiaLine;
  const hasFlow = stateObj?.flowIn;
  const sparking = useSpark(active);

  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <TiaLine active={hasFlow} size={8} />
      {/* display:"block" en el svg: por defecto un <svg> es inline, y como
          elemento inline-reemplazado dentro de una fuente con line-height
          alto (la pixel font del proyecto) deja un hueco fantasma debajo de
          su línea base — el contenedor medía ~36px de alto en vez de los
          30 reales del svg, descolgando 3px cualquier hermano centrado con
          alignItems:"center" en esta misma fila. */}
      <div style={{ position: "relative" }}>
        {sparking && <span className="dw-spark" />}
        <svg width="24" height="30" viewBox="0 0 24 30" style={{ overflow: 'visible', display: 'block' }}>
          <line x1="0" y1="15" x2="8" y2="15" stroke={hasFlow ? T.tiaLineActive : T.tiaLine} strokeWidth="3" strokeLinecap="square" />
          <line x1="16" y1="15" x2="24" y2="15" stroke={active ? T.tiaLineActive : T.tiaLine} strokeWidth="3" strokeLinecap="square" />
          <line x1="8" y1="5" x2="8" y2="25" stroke={color} strokeWidth="3" strokeLinecap="square" />
          <line x1="16" y1="5" x2="16" y2="25" stroke={color} strokeWidth="3" strokeLinecap="square" />
          {neg && !edge && <line x1="6" y1="26" x2="18" y2="4" stroke={color} strokeWidth="3" strokeLinecap="square" />}
          {/* Flanco P/N: chapa amarilla con la letra, siempre con los
              mismos colores fijos (no siguen active/hasFlow) para que se
              distinga de un NA a simple vista sin depender del estado —
              antes era un triángulo del mismo color que las barras y se
              confundía con un contacto normal. */}
          {edge && (
            <g>
              <rect x="4" y="0" width="16" height="9" fill={T.dwYellow} stroke={T.dwBlack} strokeWidth="1.5" rx="1" />
              <text x="12" y="7.3" textAnchor="middle" fontSize="8" fontWeight="900" fill={T.dwBlack} fontFamily="Arial, sans-serif">{edge}</text>
            </g>
          )}
        </svg>
      </div>
      <TiaLine active={active} size={8} />
    </div>
  );
}

export function TiaCoil({ active, flowIn }) {
  const color = active && flowIn ? T.tiaLineActive : T.tiaLine;
  const sparking = useSpark(active && flowIn);
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <TiaLine active={flowIn} size={12} />
      <div style={{ position: "relative" }}>
        {sparking && <span className="dw-spark" />}
        <svg width="28" height="30" viewBox="0 0 28 30" style={{ display: "block" }}>
          <line x1="0" y1="15" x2="6" y2="15" stroke={flowIn ? T.tiaLineActive : T.tiaLine} strokeWidth="3" strokeLinecap="square" />
          <line x1="22" y1="15" x2="28" y2="15" stroke={color} strokeWidth="3" strokeLinecap="square" />
          <path d="M 10 5 A 10 10 0 0 0 10 25" fill="none" stroke={color} strokeWidth="3" />
          <path d="M 18 5 A 10 10 0 0 1 18 25" fill="none" stroke={color} strokeWidth="3" />
        </svg>
      </div>
    </div>
  );
}

export function TiaSetReset({ active, flowIn, type }) {
  const color = active && flowIn ? T.tiaLineActive : T.tiaLine;
  const letter = type === "set" ? "S" : "R";
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <TiaLine active={flowIn} size={12} />
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <svg width="28" height="30" viewBox="0 0 28 30" style={{ display: "block" }}>
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

export function TiaTonBox({ active, flowIn, preset, elapsed, label = "TON" }) {
  const color = active && flowIn ? T.tiaLineActive : T.tiaLine;
  return (
    // flex-start (no "center"): el TON es una caja de 50px, más alta que
    // el TiaLine de entrada (30px) — sin esto, bajo el nuevo convenio de
    // alineado arriba de toda la escalera, el conector de entrada
    // quedaría descolgado 10px por debajo de donde entra la línea real.
    <div style={{ display: "flex", alignItems: "flex-start" }}>
      <TiaLine active={flowIn} size={8} />
      <div style={{
        border: `3px solid ${color}`,
        backgroundColor: "#FFF",
        width: 64,
        // La fuente pixel tiene más altura de línea que Courier New: a
        // 50px las 3 filas (TON / IN-Q / PT-ET) se apretaban tanto que se
        // solapaban entre sí y con el texto de preset/elapsed de debajo.
        height: 66,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "2px 4px",
        position: "relative",
        boxShadow: `2px 2px 0px 0px rgba(0,0,0,0.15)`,
      }}>
        {/* lineHeight fijo: la fuente pixel tiene una altura de línea por
            defecto bastante mayor que Courier New, así que sin fijarla
            estas 3 filas se apretaban y acababan solapándose entre sí. */}
        <div style={{ fontSize: 12, lineHeight: 1.2, textAlign: "center", fontWeight: "bold", borderBottom: `1px solid ${color}`, color: T.tiaText }}>{label}</div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, lineHeight: 1, color: T.tiaText }}>
          <div>IN</div>
          <div>Q</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, lineHeight: 1, color: T.tiaText }}>
          <div>PT</div>
          <div>ET</div>
        </div>
        {/* Helper text outside box */}
        <div style={{ position: "absolute", bottom: -19, left: 0, fontSize: 12, lineHeight: 1, color: T.tiaBlue }}>{preset}s</div>
        <div style={{ position: "absolute", bottom: -19, right: 0, fontSize: 12, lineHeight: 1, color: T.tiaText }}>{(elapsed || 0).toFixed(1)}s</div>
      </div>
      <TiaLine active={color === T.tiaLineActive} size={8} />
    </div>
  );
}
