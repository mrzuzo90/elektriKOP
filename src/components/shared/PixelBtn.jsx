import { T } from "../../utils/constants";

export default function PixelBtn({ children, onClick, active, color = "yellow", disabled, small, title }) {
  const bg = color === "yellow" ? T.dwYellow : color === "red" ? T.red : T.dwGrey;
  const tc = color === "yellow" ? T.dwBlack : T.text;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="dw-pixel-btn"
      style={{
        fontFamily: T.mono,
        fontWeight: "bold",
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
