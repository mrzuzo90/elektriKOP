import { useEffect, useState } from "react";
import { T } from "../../utils/constants";
import { pixelSelectStyle } from "../../styles/pixelStyles";
import { runChallenge } from "../../utils/challengeRunner";
import { CHALLENGES } from "../../challenges/challenges";
import PixelBtn from "../shared/PixelBtn";

// Vive como sección dentro del menú de pausa (PauseMenu) — ya no es un
// panel colapsable propio, así que no lleva su propia card/borde ni
// visible/onToggle: el menú entero ya cumple ese papel.
export default function ChallengePanel({ rungs, wiringMap, onResultChange }) {
  const [selectedId, setSelectedId] = useState(CHALLENGES[0].id);
  const [result, setResult] = useState(null);

  // Si se cambia de ejercicio, el resultado anterior deja de ser válido —
  // se lo comunicamos también al padre para que el distintivo flotante no
  // muestre un ✅/❌ que ya no corresponde al ejercicio seleccionado.
  useEffect(() => {
    onResultChange?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const challenge = CHALLENGES.find((c) => c.id === selectedId);

  const check = () => {
    const r = runChallenge(rungs, wiringMap, challenge.steps);
    setResult(r);
    onResultChange?.({ title: challenge.title, pass: r.pass });
  };

  return (
    <div>
      <p style={{ fontSize: 12, color: "#666", marginTop: 0 }}>
        Comprueba tu solución contra el enunciado de un ejercicio de <code>docs/ejercicios/</code>. Usa las mismas
        direcciones I/Q que indica el enunciado — el desafío las reconoce por dirección, no por nombre simbólico.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "stretch" }}>
        <select
          value={selectedId}
          title={challenge?.title}
          onChange={(e) => { setSelectedId(e.target.value); setResult(null); }}
          style={pixelSelectStyle({ width: "100%", fontSize: 13, fontFamily: T.mono, color: T.tiaText, padding: "4px 24px 4px 8px" })}
        >
          {CHALLENGES.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
        <PixelBtn small color="dwGrey" onClick={check}>▶ Comprobar</PixelBtn>
      </div>

      {result && (
        <div style={{ marginTop: 14 }}>
          <div style={{
            padding: "6px 10px",
            fontWeight: "bold",
            fontSize: 13,
            color: result.pass ? "#0B6B2C" : "#8B0000",
            background: result.pass ? "#E3F7E8" : "#FDEAEA",
            border: `1px solid ${result.pass ? "#4CAF50" : "#E53935"}`,
          }}>
            {result.pass
              ? "✅ ¡Correcto! Tu solución cumple el desafío."
              : `❌ Tu solución no pasa el desafío (${result.results.filter((r) => r.pass).length} de ${result.results.length} pasos correctos).`}
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0", display: "flex", flexDirection: "column", gap: 4 }}>
            {result.results.map((r, i) => (
              <li key={i} style={{ fontSize: 12, color: r.pass ? "#333" : "#8B0000", display: "flex", gap: 6 }}>
                <span>{r.pass ? "✅" : "❌"}</span>
                <span>
                  {r.label}
                  {!r.pass && <> — esperado <strong>{String(r.expected)}</strong> en {r.addr}, obtenido <strong>{String(r.actual)}</strong></>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
