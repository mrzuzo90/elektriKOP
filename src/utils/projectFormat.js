export const CURRENT_VERSION = 2;

// Migra datos de proyecto (autoguardado en localStorage, o importados desde
// un .json) a la forma v2 (blocks[]). El autoguardado real en localStorage
// NUNCA ha tenido campo `version` (solo exportProject lo añade al exportar),
// así que el caso "sin version" es la forma real de cualquier proyecto
// autoguardado hoy, no un caso hipotético.
export function migrateProjectData(data) {
  if (!data) return null;
  if (Array.isArray(data.blocks) && data.blocks.length > 0) return data;
  if (Array.isArray(data.rungs) && data.rungs.length > 0) {
    const { rungs, ...rest } = data;
    return {
      ...rest,
      blocks: [{ id: "main", kind: "main", name: "Main", rungs, interface: { in: [], out: [] } }],
    };
  }
  return null;
}
