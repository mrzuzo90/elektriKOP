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
  @keyframes neonFlicker {
    0%, 100% { opacity: 1; }
    50% { opacity: 1; }
    52% { opacity: 0.4; }
    54% { opacity: 1; }
    76% { opacity: 1; }
    78% { opacity: 0.5; }
    80% { opacity: 1; }
  }
  @keyframes sparkFlash {
    0% { opacity: 0.9; transform: scale(0.4); }
    100% { opacity: 0; transform: scale(2.2); }
  }
  @keyframes arcadeTick {
    0% { transform: scale(1.35); }
    100% { transform: scale(1); }
  }
  @keyframes dwCrtBoot {
    0% { transform: scaleY(1); opacity: 1; background-color: #FFFFFF; }
    15% { transform: scaleY(1); opacity: 1; background-color: #FFFFFF; }
    35% { transform: scaleY(0.006); opacity: 1; background-color: #000000; }
    60% { transform: scaleY(0.006); opacity: 1; background-color: #000000; }
    100% { transform: scaleY(1); opacity: 0; background-color: #000000; }
  }

  /* Botones pixel-art: hundimiento físico al pulsar (mousedown real, no
     solo el estado "active" controlado por prop) + leve realce en hover
     para reforzar la sensación de botón 3D. */
  .dw-pixel-btn:not(:disabled):hover {
    filter: brightness(1.06);
  }
  .dw-pixel-btn:not(:disabled):active {
    transform: translate(3px, 3px) !important;
    box-shadow: inset 4px 4px 0px 0px rgba(0,0,0,0.4) !important;
  }

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

  /* Parpadeo lento tipo neón en acentos amarillos DeWalt, independiente
     de la simulación (puro ambiente retro). */
  .dw-neon-text {
    animation: neonFlicker 5s linear infinite;
  }

  /* Chispazo breve en la transición apagado→encendido de contactos y
     bobinas del editor KOP. */
  .dw-spark {
    position: absolute;
    inset: -6px;
    border-radius: 50%;
    pointer-events: none;
    background: radial-gradient(circle, rgba(255,255,255,0.9) 0%, ${T.dwYellow} 35%, transparent 70%);
    animation: sparkFlash 0.25s ease-out forwards;
  }

  /* Rejilla fina de píxeles sobre la pantalla LCD del HMI, tipo consola
     portátil retro (Game Boy) — se combina con el backgroundColor verde
     inline del componente. */
  .dw-lcd-screen {
    background-image:
      repeating-linear-gradient(0deg, rgba(0,0,0,0.08) 0px, rgba(0,0,0,0.08) 1px, transparent 1px, transparent 3px),
      repeating-linear-gradient(90deg, rgba(0,0,0,0.08) 0px, rgba(0,0,0,0.08) 1px, transparent 1px, transparent 3px);
  }

  /* Efecto "tick" arcade al incrementar el contador de ciclos en la LCD. */
  .dw-tick {
    display: inline-block;
    animation: arcadeTick 0.12s ease-out;
  }

  /* Arranque tipo monitor CRT: flash blanco → colapsa a línea → se abre
     a pantalla completa revelando la app (una sola vez, al cargar). */
  .dw-crt-boot {
    position: fixed;
    inset: 0;
    z-index: 10000;
    pointer-events: none;
    transform-origin: center;
    animation: dwCrtBoot 1.1s ease-in-out forwards;
  }
`;
