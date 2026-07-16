import { describe, expect, it } from "vitest";
import { buildShareUrl, readProjectFromLocation } from "./shareLink";

const project = {
  projectName: "Mi proyecto",
  blocks: [{ id: "main", kind: "main", name: "Main", rungs: [], interface: { in: [], out: [] } }],
  deviceMap: { "I0.0": "pulsador" },
  wiringMap: {},
  symbols: { "I0.0": "Marcha" },
};

describe("buildShareUrl + readProjectFromLocation", () => {
  it("una URL construida con buildShareUrl se decodifica de vuelta al mismo proyecto", () => {
    const url = buildShareUrl(project, "https://kop.elektrizia.com/");
    const search = new URL(url).search;
    const decoded = readProjectFromLocation(search);
    expect(decoded.projectName).toBe("Mi proyecto");
    expect(decoded.blocks).toEqual(project.blocks);
    expect(decoded.deviceMap).toEqual(project.deviceMap);
    expect(decoded.symbols).toEqual(project.symbols);
  });

  it("no pisa otros parámetros de la URL ni deja rastro del hash", () => {
    const url = buildShareUrl(project, "https://kop.elektrizia.com/?foo=bar#viejo");
    expect(url).toContain("foo=bar");
    expect(url).not.toContain("#");
  });
});

describe("readProjectFromLocation con URL sin parámetro o inválida", () => {
  it("devuelve null si no hay parámetro 'p'", () => {
    expect(readProjectFromLocation("?otro=1")).toBeNull();
  });

  it("devuelve null si el parámetro 'p' no es JSON válido", () => {
    expect(readProjectFromLocation("?p=no-es-json")).toBeNull();
  });
});
