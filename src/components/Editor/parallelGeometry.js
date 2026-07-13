// Constantes de geometría del bloque paralelo (ParallelBlock en
// LogicSeries.jsx), en archivo aparte para no mezclar exports de
// componentes y de constantes en el mismo módulo (rompe fast-refresh).

// Altura de una rama = altura de un contacto (TiaContact/TiaCoil son 30px,
// con el cable siempre centrado a 15px — ver TiaGraphics.jsx). GAP separa
// visualmente una rama de la siguiente; STEP es el paso vertical entre
// ramas consecutivas (coincide con la convención TIA: cada rama nueva un
// paso por debajo de la anterior).
export const BRANCH_H = 30;
export const BRANCH_GAP = 2;
export const STEP = BRANCH_H + BRANCH_GAP;
