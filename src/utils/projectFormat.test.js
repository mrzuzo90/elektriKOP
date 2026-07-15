import { describe, expect, it } from "vitest";
import { migrateProjectData, CURRENT_VERSION } from "./projectFormat";

function v1Data(extra = {}) {
  return {
    version: 1,
    projectName: "Proyecto v1",
    rungs: [{ id: 0, title: "N1", comment: "", logic: [], outAddr: "Q0.0", outType: "coil", preset: 2 }],
    deviceMap: { "I0.0": "pulsador" },
    wiringMap: {},
    symbols: { "I0.0": "Marcha" },
    ...extra,
  };
}

describe("migrateProjectData", () => {
  it("envuelve un proyecto v1 (con 'rungs') en blocks: [main]", () => {
    const migrated = migrateProjectData(v1Data());
    expect(migrated.blocks).toHaveLength(1);
    expect(migrated.blocks[0]).toEqual({
      id: "main",
      kind: "main",
      name: "Main",
      rungs: v1Data().rungs,
      interface: { in: [], out: [] },
    });
    expect(migrated.projectName).toBe("Proyecto v1");
    expect(migrated.deviceMap).toEqual({ "I0.0": "pulsador" });
    expect(migrated.symbols).toEqual({ "I0.0": "Marcha" });
    expect(migrated.rungs).toBeUndefined();
  });

  it("migra igual un objeto sin campo 'version' (forma real del autoguardado)", () => {
    const { version, ...withoutVersion } = v1Data();
    void version;
    const migrated = migrateProjectData(withoutVersion);
    expect(migrated.blocks[0].id).toBe("main");
    expect(migrated.blocks[0].rungs).toEqual(withoutVersion.rungs);
  });

  it("un objeto ya v2 (con 'blocks') pasa intacto", () => {
    const v2 = {
      version: CURRENT_VERSION,
      projectName: "Proyecto v2",
      blocks: [{ id: "main", kind: "main", name: "Main", rungs: [], interface: { in: [], out: [] } }],
      deviceMap: {},
      wiringMap: {},
      symbols: {},
    };
    expect(migrateProjectData(v2)).toBe(v2);
  });

  it("devuelve null para un objeto sin 'rungs' ni 'blocks'", () => {
    expect(migrateProjectData({ projectName: "vacío" })).toBeNull();
    expect(migrateProjectData({ rungs: [] })).toBeNull();
    expect(migrateProjectData({ blocks: [] })).toBeNull();
    expect(migrateProjectData(null)).toBeNull();
  });
});
