// La referencia usa el id estable del segmento: renombrar o reordenar no la rompe.
export function counterOperands(rungs) {
  return rungs.flatMap((rung, index) =>
    ["ctu", "ctd", "ctud"].includes(rung.outType)
      ? [{ id: rung.id, addr: `CV:${rung.id}`, label: `CV · ${index + 1}: ${rung.title || rung.outType.toUpperCase()}` }]
      : []
  );
}

export function timerOperands(rungs) {
  return rungs.flatMap((rung, index) =>
    ["ton", "tonr", "tof", "tp"].includes(rung.outType)
      ? [
          { id: rung.id, addr: `ET:${rung.id}`, label: `ET · ${index + 1}: ${rung.title || rung.outType.toUpperCase()}` },
          { id: rung.id, addr: `PT:${rung.id}`, label: `PT · ${index + 1}: ${rung.title || rung.outType.toUpperCase()}` },
        ]
      : []
  );
}

export function comparatorOperands(rungs) {
  return [...counterOperands(rungs), ...timerOperands(rungs)];
}
