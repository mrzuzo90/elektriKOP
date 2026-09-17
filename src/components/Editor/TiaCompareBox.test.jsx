import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TiaCompareBox } from "./TiaGraphics";
import { counterOperands, timerOperands } from "../../utils/counterOperands";

describe("selector de operandos del comparador", () => {
  it("muestra CV identificables y conserva seleccionada la referencia después de renombrar", () => {
    const options = ["IW0", ...counterOperands([
      { id: "coil", outType: "coil", title: "Salida" },
      { id: "pieces", outType: "ctud", title: "Piezas" },
    ])];
    const html = renderToStaticMarkup(<TiaCompareBox addr="CV:pieces" op="==" value={5} addrOptions={options} />);
    expect(html).toContain('<option value="CV:pieces" selected="">CV · 2: Piezas</option>');
    expect(html).toContain('<option value="IW0">IW0</option>');
    expect(html).not.toContain('value="CV:coil"');
  });
  it("muestra ET y PT de temporizadores y conserva seleccionada la referencia", () => {
    const options = ["IW0", ...timerOperands([
      { id: "coil", outType: "coil", title: "Salida" },
      { id: "t1", outType: "ton", title: "Retardo" },
    ])];
    const html = renderToStaticMarkup(<TiaCompareBox addr="ET:t1" op=">=" value={2.5} addrOptions={options} />);
    expect(html).toContain('<option value="ET:t1" selected="">ET · 2: Retardo</option>');
    expect(html).toContain('<option value="PT:t1">PT · 2: Retardo</option>');
    expect(html).toContain('<option value="IW0">IW0</option>');
    expect(html).not.toContain('value="ET:coil"');
  });
  it("señala una referencia de contador eliminada en vez de mostrar IW0 como si estuviera seleccionado", () => {
    const html = renderToStaticMarkup(<TiaCompareBox addr="CV:deleted" op="==" value={0} addrOptions={["IW0"]} />);
    expect(html).toContain('<option value="CV:deleted" selected="">Contador no disponible</option>');
  });
  it("señala una referencia de temporizador eliminada en vez de mostrar IW0 como si estuviera seleccionado", () => {
    const html = renderToStaticMarkup(<TiaCompareBox addr="ET:deleted" op="==" value={0} addrOptions={["IW0"]} />);
    expect(html).toContain('<option value="ET:deleted" selected="">Temporizador no disponible</option>');
    const htmlPt = renderToStaticMarkup(<TiaCompareBox addr="PT:deleted" op="==" value={0} addrOptions={["IW0"]} />);
    expect(htmlPt).toContain('<option value="PT:deleted" selected="">Temporizador no disponible</option>');
  });
});
