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

  it("un objeto con blocks conserva el programa y recibe HMI vacío", () => {
    const v2 = {
      version: 2,
      projectName: "Proyecto v2",
      blocks: [{ id: "main", kind: "main", name: "Main", rungs: [], interface: { in: [], out: [] } }],
      deviceMap: {},
      wiringMap: {},
      symbols: {},
    };
    expect(migrateProjectData(v2)).toEqual({ ...v2, hmi: { version: 1, initialScreenId: null, screens: [] } });
  });

  it("un proyecto antiguo v1 sin HMI recibe estructura HMI vacía válida y usable", () => {
    const v1 = v1Data();
    delete v1.hmi;
    const migrated = migrateProjectData(v1);
    expect(migrated.hmi).toEqual({ version: 1, initialScreenId: null, screens: [] });
    expect(migrated.blocks).toHaveLength(1);
    expect(migrated.deviceMap).toEqual({ "I0.0": "pulsador" });
  });

  it("un proyecto v3 con HMI configurado exporta e importa todas las pantallas y componentes intactos", () => {
    const fullProject = {
      version: CURRENT_VERSION,
      projectName: "Proyecto Completo con HMI",
      blocks: [{ id: "main", kind: "main", name: "Main", rungs: [], interface: { in: [], out: [] } }],
      deviceMap: { "I0.0": "pulsador" },
      wiringMap: {},
      symbols: { "I0.0": "Marcha", "IW0": "Nivel" },
      hmi: {
        version: 1,
        initialScreenId: "screen-1",
        screens: [
          {
            id: "screen-1",
            name: "Planta Principal",
            width: 640,
            height: 360,
            background: "#1e2b22",
            components: [
              {
                id: "comp-1",
                type: "timer",
                label: "T_Arranque",
                x: 20,
                y: 30,
                width: 180,
                height: 76,
                tag: "metric:main:0:ET",
                targetScreenId: "",
                foreground: "#ffffff",
                background: "#262626",
                offColor: "#555555",
                onColor: "#ffcc00",
                barColor: "#00b000",
                mode: "elapsed",
              },
              {
                id: "comp-2",
                type: "bar",
                label: "Nivel Tanque",
                x: 20,
                y: 120,
                width: 200,
                height: 40,
                tag: "IW0",
                min: 0,
                max: 100,
                orientation: "horizontal",
                barColor: "#0099cc",
                targetScreenId: "",
                foreground: "#ffffff",
                background: "#262626",
                offColor: "#555555",
                onColor: "#ffcc00",
              },
            ],
          },
        ],
      },
    };

    // Simula exportación a JSON y posterior importación
    const exportedJson = JSON.stringify(fullProject, null, 2);
    const parsed = JSON.parse(exportedJson);
    const reimported = migrateProjectData(parsed);

    expect(reimported.version).toBe(3);
    expect(reimported.hmi.screens).toHaveLength(1);
    expect(reimported.hmi.screens[0].name).toBe("Planta Principal");
    expect(reimported.hmi.screens[0].components).toHaveLength(2);
    expect(reimported.hmi.screens[0].components[0].type).toBe("timer");
    expect(reimported.hmi.screens[0].components[0].barColor).toBe("#00b000");
    expect(reimported.hmi.screens[0].components[1].type).toBe("bar");
    expect(reimported.hmi.screens[0].components[1].orientation).toBe("horizontal");
  });

  it("devuelve null para un objeto sin 'rungs' ni 'blocks'", () => {
    expect(migrateProjectData({ projectName: "vacío" })).toBeNull();
    expect(migrateProjectData({ rungs: [] })).toBeNull();
    expect(migrateProjectData({ blocks: [] })).toBeNull();
    expect(migrateProjectData(null)).toBeNull();
  });
});
