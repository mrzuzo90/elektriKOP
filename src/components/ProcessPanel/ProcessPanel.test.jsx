import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ProcessPanel from "./ProcessPanel";
import { DeviceIcon } from "./DeviceIcons";
import { DEVICE_TYPES } from "./deviceTypes";

function renderPanel({ inputs = {}, outputs = {}, analogInputs = {}, wiringMap = {} } = {}) {
  return renderToStaticMarkup(
    <ProcessPanel
      addresses={["I0.0", "IW0", "Q0.0"]}
      deviceMap={{ "I0.0": "sensor", "Q0.0": "cinta" }}
      wiringMap={wiringMap}
      inputs={inputs}
      outputs={outputs}
      analogInputs={analogInputs}
      onChangeType={() => {}}
      onChangeWiring={() => {}}
      onChangeAnalog={() => {}}
      visible
      onToggle={() => {}}
    />
  );
}

describe("assets del proceso simulado", () => {
  it("representa por separado la entrada física y la salida del scan", () => {
    const stopped = renderPanel({ inputs: { "I0.0": true }, outputs: { "Q0.0": false } });
    expect(stopped).toContain('role="img" aria-label="Sensor detectando"');
    expect(stopped).toContain('role="img" aria-label="Cinta transportadora detenida"');

    const running = renderPanel({ inputs: { "I0.0": false }, outputs: { "Q0.0": true } });
    expect(running).toContain('role="img" aria-label="Sensor en reposo"');
    expect(running).toContain('role="img" aria-label="Cinta transportadora en marcha"');
  });

  it("conserva la lectura invertida NC sin invertir el dibujo físico", () => {
    const markup = renderPanel({ inputs: { "I0.0": true }, wiringMap: { "I0.0": "NC" } });
    expect(markup).toContain('role="img" aria-label="Sensor detectando"');
    expect(markup).toContain("PLC ve: 0");
  });

  it("muestra el nivel real de la entrada analógica", () => {
    const markup = renderPanel({ analogInputs: { IW0: 75 } });
    expect(markup).toContain('role="img" aria-label="Sensor analógico: 75 de 100"');
  });

  it("ofrece un asset y una descripción de estado para cada dispositivo disponible", () => {
    for (const { id } of DEVICE_TYPES) {
      const off = renderToStaticMarkup(<DeviceIcon type={id} active={false} />);
      const on = renderToStaticMarkup(<DeviceIcon type={id} active={true} />);
      expect(off).toContain('<svg');
      expect(off).toContain('role="img"');
      expect(on).toContain('<svg');
      if (id !== "none") expect(on).not.toEqual(off);
    }
  });
});
