import { T } from "../../utils/constants";
import { TiaLine } from "./TiaGraphics";
import { PinWiringSelect } from "./TiaCallBox";

// Instrucción CTU/CTD/CTUD: mismo lenguaje visual de "caja" que TiaTonBox,
// con pines cableados mediante PinWiringSelect (mismo mecanismo que los pines
// IN/OUT de "Llamar a bloque").
// - CTU: rail CU, pin Reset (R), salida Q.
// - CTD: rail CD, pin Carga (LD), salida Q.
// - CTUD: rail CU, pines CD, R, LD, QD; salida principal QU conectada al rail
//         derecho (outAddr) y salida secundaria QD en su propio pin.
// CV es un número interno mostrado como texto junto a PV.
export default function TiaCounterBox({
  rung,
  onChangeResetAddr,
  onChangeCdAddr,
  onChangeLoadAddr,
  onChangeQdAddr,
  addrOptions,
  outputAddrOptions,
  symbols,
  active,
  flowIn,
  count = 0,
  qu,
  qd,
  mem,
}) {
  const isCtud = rung.outType === "ctud";
  const color = active && flowIn ? T.tiaLineActive : T.tiaLine;
  const label = isCtud ? "CTUD" : rung.outType === "ctu" ? "CTU" : "CTD";
  const resetLabel = rung.outType === "ctu" ? "R" : "LD";
  const pulseLabel = rung.outType === "ctu" ? "CU" : "CD";

  const cdActive = rung.cdAddr ? !!mem?.[rung.cdAddr] : false;
  const rActive = rung.resetAddr ? !!mem?.[rung.resetAddr] : false;
  const ldActive = rung.loadAddr ? !!mem?.[rung.loadAddr] : false;
  const quActive = qu ?? (count >= rung.preset);
  const qdActive = qd ?? (count <= 0);

  if (isCtud) {
    return (
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        <TiaLine active={flowIn} size={8} />
        <div
          style={{
            border: `3px solid ${color}`,
            backgroundColor: "#FFF",
            width: 236,
            padding: "2px 6px 6px",
            position: "relative",
            boxShadow: `2px 2px 0px 0px rgba(0,0,0,0.15)`,
          }}
        >
          <div
            style={{
              fontSize: 12,
              lineHeight: 1.2,
              textAlign: "center",
              fontWeight: "bold",
              borderBottom: `1px solid ${color}`,
              color: T.tiaText,
              padding: "2px 0",
            }}
          >
            {label}
          </div>

          {/* Fila 1: CU (izq, rail principal) y QU (der, salida principal outAddr) */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 10,
              lineHeight: 1.6,
              fontWeight: "bold",
            }}
          >
            <div style={{ color: flowIn ? T.tiaLineActive : T.tiaText }}>CU</div>
            <div style={{ color: quActive ? T.tiaLineActive : T.tiaText }}>QU</div>
          </div>

          {/* Fila 2: CD (izq) y QD (der) */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 6,
              marginTop: 2,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: "bold",
                  minWidth: 16,
                  color: cdActive ? T.tiaLineActive : T.tiaText,
                }}
              >
                CD
              </span>
              <PinWiringSelect
                value={rung.cdAddr}
                onChange={onChangeCdAddr}
                options={addrOptions}
                symbols={symbols}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: "bold",
                  minWidth: 16,
                  color: qdActive ? T.tiaLineActive : T.tiaText,
                }}
              >
                QD
              </span>
              <PinWiringSelect
                value={rung.qdAddr}
                onChange={onChangeQdAddr}
                options={outputAddrOptions || addrOptions}
                symbols={symbols}
              />
            </div>
          </div>

          {/* Fila 3: R (Reset) */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: "bold",
                minWidth: 16,
                color: rActive ? T.tiaLineActive : T.tiaText,
              }}
            >
              R
            </span>
            <PinWiringSelect
              value={rung.resetAddr}
              onChange={onChangeResetAddr}
              options={addrOptions}
              symbols={symbols}
            />
          </div>

          {/* Fila 4: LD (Carga) */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: "bold",
                minWidth: 16,
                color: ldActive ? T.tiaLineActive : T.tiaText,
              }}
            >
              LD
            </span>
            <PinWiringSelect
              value={rung.loadAddr}
              onChange={onChangeLoadAddr}
              options={addrOptions}
              symbols={symbols}
            />
          </div>

          {/* Helper text outside box — PV/CV */}
          <div style={{ position: "absolute", bottom: -19, left: 0, fontSize: 12, lineHeight: 1, color: T.tiaBlue }}>
            PV:{rung.preset}
          </div>
          <div style={{ position: "absolute", bottom: -19, right: 0, fontSize: 12, lineHeight: 1, color: T.tiaText }}>
            CV:{count}
          </div>
        </div>
        <TiaLine active={active} size={8} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "flex-start" }}>
      <TiaLine active={flowIn} size={8} />
      <div
        style={{
          border: `3px solid ${color}`,
          backgroundColor: "#FFF",
          width: 96,
          padding: "2px 6px 6px",
          position: "relative",
          boxShadow: `2px 2px 0px 0px rgba(0,0,0,0.15)`,
        }}
      >
        <div style={{ fontSize: 12, lineHeight: 1.2, textAlign: "center", fontWeight: "bold", borderBottom: `1px solid ${color}`, color: T.tiaText, padding: "2px 0" }}>
          {label}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, lineHeight: 1.6, color: T.tiaText }}>
          <div style={{ color: flowIn ? T.tiaLineActive : T.tiaText }}>{pulseLabel}</div>
          <div style={{ color: active ? T.tiaLineActive : T.tiaText }}>Q</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
          <span style={{ fontSize: 10, color: rActive ? T.tiaLineActive : T.tiaText }}>{resetLabel}</span>
          <PinWiringSelect value={rung.resetAddr} onChange={onChangeResetAddr} options={addrOptions} symbols={symbols} />
        </div>
        {/* Helper text outside box — mismo patrón que TiaTonBox para PT/ET */}
        <div style={{ position: "absolute", bottom: -19, left: 0, fontSize: 12, lineHeight: 1, color: T.tiaBlue }}>PV:{rung.preset}</div>
        <div style={{ position: "absolute", bottom: -19, right: 0, fontSize: 12, lineHeight: 1, color: T.tiaText }}>CV:{count}</div>
      </div>
      <TiaLine active={active} size={8} />
    </div>
  );
}
