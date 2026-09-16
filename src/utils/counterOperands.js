// La referencia usa el id estable del segmento: renombrar o reordenar no la rompe.
export function counterOperands(rungs) {
  return rungs.flatMap((rung, index) =>
    ["ctu", "ctd", "ctud"].includes(rung.outType)
      ? [{ id: rung.id, addr: `CV:${rung.id}`, label: `CV · ${index + 1}: ${rung.title || rung.outType.toUpperCase()}` }]
      : []
  );
}
