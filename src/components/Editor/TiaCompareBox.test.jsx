import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TiaCompareBox } from "./TiaGraphics";
import { counterOperands } from "../../utils/counterOperands";

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
  it("señala una referencia eliminada en vez de mostrar IW0 como si estuviera seleccionado", () => {
    const html = renderToStaticMarkup(<TiaCompareBox addr="CV:deleted" op="==" value={0} addrOptions={["IW0"]} />);
    expect(html).toContain('<option value="CV:deleted" selected="">Contador no disponible</option>');
  });
});
