import { CURRENT_VERSION } from "./projectFormat";

// Comparte un proyecto metiendo su JSON entero en un parámetro de la URL
// (mismo formato que exportProject/importProject) — sin backend, sin
// archivo: quien abre el enlace recibe el proyecto ya cargado y autoguardado
// localmente, exactamente como si lo hubiera importado desde un .json.
//
// buildShareUrl/readProjectFromLocation reciben el href/search actuales
// como parámetro (con default a window.location en uso real) en vez de leer
// `window` directamente, para poder testearlos como funciones puras — mismo
// patrón que computeScanTick, que recibe su "mundo exterior" como argumento
// en vez de tocarlo él mismo.
const PARAM = "p";

export function buildShareUrl(project, currentHref = window.location.href) {
  const data = { version: CURRENT_VERSION, ...project };
  const url = new URL(currentHref);
  url.hash = "";
  url.searchParams.set(PARAM, JSON.stringify(data));
  return url.toString();
}

// Lee el proyecto embebido en una URL (o en window.location.search por
// defecto). Devuelve null si no hay parámetro o si su contenido no es JSON
// válido (enlace corrupto/editado a mano) — el llamador cae entonces al
// flujo normal (autoguardado o proyecto en blanco).
export function readProjectFromLocation(search = window.location.search) {
  const raw = new URLSearchParams(search).get(PARAM);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Quita el parámetro de la URL tras cargar el proyecto compartido: a partir
// de ahí es "tu" proyecto (autoguardado local normal), no un enlace que
// siga viviendo pegado a la barra de direcciones.
export function clearShareParam() {
  const url = new URL(window.location.href);
  url.searchParams.delete(PARAM);
  window.history.replaceState({}, "", url.pathname + url.search + url.hash);
}
