import { normalizeHmi } from "../hmi/model";

export const CURRENT_VERSION = 3;

// v1 used rungs, v2 uses blocks, v3 also includes HMI definitions.
// Legacy autosaves have no version: infer their shape and keep accepting them.
export function migrateProjectData(data) {
  if (!data) return null;
  if (Array.isArray(data.blocks) && data.blocks.length > 0) return { ...data, hmi: normalizeHmi(data.hmi) };
  if (Array.isArray(data.rungs) && data.rungs.length > 0) {
    const { rungs, ...rest } = data;
    return {
      ...rest,
      hmi: normalizeHmi(data.hmi),
      blocks: [{ id: "main", kind: "main", name: "Main", rungs, interface: { in: [], out: [] } }],
    };
  }
  return null;
}
