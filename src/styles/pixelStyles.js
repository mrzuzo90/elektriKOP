import { T } from "../utils/constants";

export const pixelBorderStyle = {
  boxShadow: `inset -3px -3px 0px 0px rgba(0,0,0,0.5), inset 3px 3px 0px 0px rgba(255,255,255,0.2)`,
  border: `2px solid ${T.dwBlack}`,
};

// Flecha de desplegable dibujada con dos gradientes CSS (sin imágenes
// externas) para que los <select> nativos dejen de desentonar con el resto
// del pixel-art.
export function pixelSelectStyle(extra = {}) {
  return {
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
    backgroundColor: "#FFF",
    backgroundImage: `linear-gradient(45deg, transparent 50%, ${T.dwBlack} 50%), linear-gradient(135deg, ${T.dwBlack} 50%, transparent 50%)`,
    backgroundPosition: "calc(100% - 10px) calc(50% - 1px), calc(100% - 5px) calc(50% - 1px)",
    backgroundSize: "5px 5px, 5px 5px",
    backgroundRepeat: "no-repeat",
    border: `2px solid ${T.dwBlack}`,
    boxShadow: `2px 2px 0px 0px ${T.dwBlack}`,
    cursor: "pointer",
    ...extra,
  };
}

export const fontStyles = `
  * { box-sizing: border-box; }
  body { margin: 0; background-color: ${T.dwDark}; }
  ::-webkit-scrollbar { width: 12px; height: 12px; }
  ::-webkit-scrollbar-track { background: ${T.dwDark}; border-left: 2px solid ${T.dwBlack}; }
  ::-webkit-scrollbar-thumb { background: ${T.dwYellow}; border: 2px solid ${T.dwBlack}; }
  @keyframes blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes beltMove { from { background-position: 0 0; } to { background-position: 24px 0; } }
  @keyframes pulseGlow { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }

  /* Campos de texto "editables" (título de proyecto, nombre/comentario de
     segmento): sin caja hasta que el usuario interactúa, para no competir
     visualmente con el resto, pero con una pista clara de que se puede
     tocar. */
  .dw-edit-field {
    border: none;
    border-bottom: 2px dashed rgba(255,255,255,0.25);
    background: transparent;
    transition: border-color 0.15s, background-color 0.15s;
  }
  .dw-edit-field:hover { border-bottom-color: rgba(255,255,255,0.5); }
  .dw-edit-field:focus { border-bottom: 2px solid ${T.dwYellow}; background: rgba(255,255,255,0.06); }
  .dw-edit-field-dark { border-bottom-color: rgba(0,0,0,0.25); }
  .dw-edit-field-dark:hover { border-bottom-color: rgba(0,0,0,0.5); }
  .dw-edit-field-dark:focus { background: rgba(0,0,0,0.05); }

  /* Overlay tipo pantalla CRT: líneas de barrido muy sutiles + viñeta,
     puramente decorativo (pointer-events:none) para dar aire de HUD de
     videojuego retro sin estorbar la lectura. */
  .dw-crt-overlay {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 9999;
    background:
      repeating-linear-gradient(0deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 1px, transparent 1px, transparent 3px),
      radial-gradient(ellipse at center, transparent 65%, rgba(0,0,0,0.12) 100%);
    mix-blend-mode: multiply;
    opacity: 0.35;
  }
`;
