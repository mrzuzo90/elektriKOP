// Constantes de geometría del bloque paralelo (ParallelBlock en
// LogicSeries.jsx), en archivo aparte para no mezclar exports de
// componentes y de constantes en el mismo módulo (rompe fast-refresh).

// Altura de una rama = altura de un contacto (TiaContact/TiaCoil son 30px,
// con el cable siempre centrado a 15px — ver TiaGraphics.jsx). GAP separa
// visualmente una rama de la siguiente; STEP es el paso vertical entre
// ramas consecutivas (coincide con la convención TIA: cada rama nueva un
// paso por debajo de la anterior).
//
// GAP >= 20: el desplegable de dirección de un contacto (TiaSelect) se
// posiciona a `top: -20px` de su propia fila para no competir por sitio con
// el contacto — pero eso significa que invade la fila de la rama de ARRIBA
// en esos mismos 20px. Con un GAP menor (era 2), el desplegable de
// cualquier rama tapaba media fila entera de la rama anterior (botones de
// eliminar contacto/rama incluidos — bug reportado: "no se pueden eliminar
// elementos"). 22 deja justo el margen mínimo sin solape.
export const BRANCH_H = 30;
export const BRANCH_GAP = 22;
export const STEP = BRANCH_H + BRANCH_GAP;
