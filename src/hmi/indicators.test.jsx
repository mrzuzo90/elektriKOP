import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import HmiComponent from './HmiComponent';
import HmiSiemensFrame from './HmiSiemensFrame';
import { newComponent, newScreen, normalizeHmi } from './model';
import { bindingType } from './bindings';

const render = (type, value, editing = false, tag = 'I0.0') => renderToStaticMarkup(
  <HmiComponent component={{ ...newComponent(type), tag }} tags={{ read: () => value }} screens={[]} editing={editing} />
);
describe('pilotos circulares y alarma', () => {
  it('conserva tipo de alarma, binding y colores al guardar y cargar', () => {
    expect(bindingType('alarm')).toBe('BOOL');
    const screen = newScreen();
    const alarm = { ...newComponent('alarm'), tag: 'M0.0', onColor: '#ee2200', offColor: '#331100' };
    screen.components.push(alarm);
    expect(normalizeHmi(JSON.parse(JSON.stringify({ screens: [screen] }))).screens[0].components[0]).toEqual(alarm);
  });
  it('renderiza el piloto sin placa rectangular y sin parpadeo', () => {
    const markup = render('lamp', true);
    expect(markup).toContain('hmi-indicator');
    expect(markup).toContain('hmi-lens');
    expect(markup).not.toContain('hmi-alarm-active');
  });
  it('solo parpadea la alarma activa en runtime con binding BOOL válido', () => {
    expect(render('alarm', true)).toContain('hmi-alarm-active');
    expect(render('alarm', false)).not.toContain('hmi-alarm-active');
    expect(render('alarm', true, true)).not.toContain('hmi-alarm-active');
    expect(render('alarm', true, false, 'IW0')).not.toContain('hmi-alarm-active');
    expect(render('alarm', true, false, 'IW0')).toContain('TAG ?');
  });
});

describe('componentes de temporizador, contador y barra analógica', () => {
  it('conserva propiedades de temporizador, contador y barra analógica en el modelo', () => {
    expect(bindingType('timer')).toBe('NUMBER');
    expect(bindingType('counter')).toBe('NUMBER');
    expect(bindingType('bar')).toBe('NUMBER');

    const screen = newScreen();
    const timer = { ...newComponent('timer'), tag: 'metric:main:0:ET', barColor: '#123456', mode: 'remaining' };
    const counter = { ...newComponent('counter'), tag: 'metric:main:1:CV', barColor: '#654321' };
    const bar = { ...newComponent('bar'), tag: 'IW0', min: 10, max: 80, orientation: 'vertical', barColor: '#abcdef' };
    screen.components.push(timer, counter, bar);

    const normalized = normalizeHmi(JSON.parse(JSON.stringify({ screens: [screen] }))).screens[0].components;
    expect(normalized[0]).toEqual(timer);
    expect(normalized[1]).toEqual(counter);
    expect(normalized[2]).toEqual(bar);
  });

  it('renderiza temporizador con tiempo transcurrido, consigna y barra de progreso', () => {
    const timerComp = { ...newComponent('timer'), tag: 'metric:main:0:ET', label: 'T_Motor' };
    const tags = {
      read: addr => (addr === 'metric:main:0:ET' ? 2.5 : addr === 'metric:main:0:PT' ? 5.0 : undefined),
      catalog: [{ address: 'metric:main:0:ET', type: 'NUMBER' }],
    };
    const markup = renderToStaticMarkup(<HmiComponent component={timerComp} tags={tags} screens={[]} />);
    expect(markup).toContain('T_Motor');
    expect(markup).toContain('2.5 s');
    expect(markup).toContain('PT: 5.0 s');
    expect(markup).toContain('width:50%');
  });

  it('renderiza contador con conteo actual, consigna y distintivo de límite alcanzado', () => {
    const counterComp = { ...newComponent('counter'), tag: 'metric:main:1:CV', label: 'C_Piezas' };
    const tags = {
      read: addr => (addr === 'metric:main:1:CV' ? 10 : addr === 'metric:main:1:PV' ? 10 : undefined),
      catalog: [{ address: 'metric:main:1:CV', type: 'NUMBER' }],
    };
    const markup = renderToStaticMarkup(<HmiComponent component={counterComp} tags={tags} screens={[]} />);
    expect(markup).toContain('C_Piezas');
    expect(markup).toContain('10');
    expect(markup).toContain('/ 10');
    expect(markup).toContain('hmi-counter-reached');
    expect(markup).toContain('width:100%');
  });

  it('renderiza barra analógica horizontal y vertical con cálculo de rango', () => {
    const barH = { ...newComponent('bar'), tag: 'IW0', label: 'Nivel Tanque', min: 0, max: 100, orientation: 'horizontal' };
    const tags = {
      read: () => 75,
      catalog: [{ address: 'IW0', type: 'NUMBER' }],
    };
    const markupH = renderToStaticMarkup(<HmiComponent component={barH} tags={tags} screens={[]} />);
    expect(markupH).toContain('hmi-bar-h');
    expect(markupH).toContain('Nivel Tanque');
    expect(markupH).toContain('75');
    expect(markupH).toContain('width:75%');

    const barV = { ...newComponent('bar'), tag: 'IW0', label: 'Presión', min: 50, max: 150, orientation: 'vertical' };
    const markupV = renderToStaticMarkup(<HmiComponent component={barV} tags={tags} screens={[]} />);
    expect(markupV).toContain('hmi-bar-v');
    // Value 75 in range 50-150 is 25 / 100 = 25%
    expect(markupV).toContain('height:25%');
  });
});

describe('chasis industrial Siemens SIMATIC HMI', () => {
  it('renderiza el chasis con logotipo Siemens, modelo KTP, LEDs y teclas F1-F4', () => {
    const markup = renderToStaticMarkup(
      <HmiSiemensFrame screenName="PROCESO" running={true} hasAlarm={true} onHome={() => {}}>
        <div id="test-content">Pantalla</div>
      </HmiSiemensFrame>
    );

    expect(markup).toContain('siemens-hmi-chassis');
    expect(markup).toContain('SIEMENS');
    expect(markup).toContain('SIMATIC HMI');
    expect(markup).toContain('KTP-600 COLOR PN');
    expect(markup).toContain('PROCESO');
    expect(markup).toContain('PWR');
    expect(markup).toContain('led-run');
    expect(markup).toContain('led-alarm-active');
    expect(markup).toContain('F1');
    expect(markup).toContain('F2');
    expect(markup).toContain('F3');
    expect(markup).toContain('F4');
    expect(markup).toContain('test-content');
  });
});


