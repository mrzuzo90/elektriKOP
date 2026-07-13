import { useState } from "react";
import { T } from "../../utils/constants";
import { pixelSelectStyle } from "../../styles/pixelStyles";
import { runChallenge } from "../../utils/challengeRunner";
import { CHALLENGES } from "../../challenges/challenges";
import PixelBtn from "../shared/PixelBtn";

export default function ChallengePanel({ rungs, wiringMap, visible, onToggle }) {
  const [selectedId, setSelectedId] = useState(CHALLENGES[0].id);
  const [result, setResult] = useState(null);

  const check = () => {
    const challenge = CHALLENGES.find((c) => c.id === selectedId);
    setResult(runChallenge(rungs, wiringMap, challenge.steps));
  };

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
        <span style={{ fontWeight: "bold", color: T.tiaText }}>🎯 Modo Desafío</span>
        <span style={{ color: "#888", fontSize: 12 }}>{visible ? "▲ ocultar" : "▼ mostrar"}</span>
      </div>
      {visible && (
        <div style={{ padding: 14 }}>
          <p style={{ fontSize: 12, color: "#666", marginTop: 0 }}>
            Comprueba tu solución contra el enunciado de un ejercicio de <code>docs/ejercicios/</code>. Usa las mismas
            direcciones I/Q que indica el enunciado — el desafío las reconoce por dirección, no por nombre simbólico.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "stretch" }}>
            <select
              value={selectedId}
              title={CHALLENGES.find((c) => c.id === selectedId)?.title}
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
      )}
    </div>
  );
}
