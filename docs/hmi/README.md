# Diseñador HMI

Arranca con `npm run dev -- --host 0.0.0.0 --port 5173` y abre http://localhost:5173.

En el centro, pulsa **HMI → Editar HMI → + Pantalla**. La paleta añade componentes; selecciónalos en el lienzo o en la lista inferior. Arrastra para mover y usa el tirador inferior derecho para redimensionar. El inspector permite editar etiqueta, posición, dimensiones, binding y colores. Las pantallas y cambios se incluyen en Deshacer/Rehacer.

**Ejecutar HMI** conecta los controles al simulador. RUN/STOP sigue siendo independiente. El panel izquierdo conserva la depuración física y las teclas 0–9. Al escribir en un campo los dígitos se introducen normalmente. Los momentáneos se liberan al soltar fuera, cancelar, perder el foco, cambiar de pantalla, modo o vista.

## Ejemplo

Desde el logo ElektriKOP abre **Importar** y selecciona `docs/hmi/demo.json`. Cierra el menú y abre **HMI → Ejecutar HMI**. Pulsa RUN: Marcha activa I0.0 y Q0.0; el teclado 0 alterna la misma entrada. La consigna modifica IW0 y se refleja en Nivel actual. Detalle y Volver prueban la navegación.

## Alcance y semántica

- Tags globales I/Q/M booleanos; IW0 numérico 0–100. No se exponen parámetros locales de FC/FB.
- El HMI lee valores lógicos del PLC. Para una entrada NC, el adaptador invierte la escritura física; el panel de depuración sigue mostrando accionamiento físico.
- Las escrituras Q/M son ordinarias: el siguiente scan puede sobrescribirlas si el programa escribe ese tag.
- La consigna aplica con Enter o al salir si el valor es válido; Escape descarta. Vacíos y números fuera de rango no se aplican.
- Formato de proyecto v3, con `hmi` (esquema 1). Se aceptan proyectos antiguos y autosaves sin versión. Autosave, JSON y enlaces conservan pantallas y bindings, no valores vivos.
- Los enlaces existentes incluyen JSON sin comprimir; las pantallas aumentan su longitud. El archivo JSON sigue disponible para proyectos grandes.
- Gestión de alarmas (registro y reconocimiento), tendencias, recetas, usuarios, histórico y nuevas comunicaciones quedan fuera de este editor.

## Módulos y verificación

`src/hmi/model.js` define y normaliza el documento. `bindings.js` adapta los propietarios de estado actuales. `interactions.js` gestiona pulsaciones y teclado. `HmiComponent` renderiza; `HmiRuntime` maneja navegación y lifecycle; `HmiEditor` y `HmiInspector` editan el documento. El scan permanece en su motor actual.

Pruebas unitarias: `npm test`. Comprobaciones: `npm run lint` y `npm run build`.

Con Playwright CLI instalado, la regresión de navegador se ejecuta en una sesión separada (importa el ejemplo y modifica solo el almacenamiento de esa sesión):

```sh
playwright-cli -s=hmi-test open http://localhost:5173
playwright-cli -s=hmi-test resize 1600 1000
playwright-cli -s=hmi-test run-code --filename=scripts/hmi-smoke.js
```

Validación realizada: creación visual de dos pantallas y los siete tipos; vinculación entrada/piloto/botón y salida PLC; RUN con scan; diez atajos; dígitos en consigna; toggle; validación y Escape; liberación fuera/foco/modo; NA/NC; keyup tras cambiar de foco; arrastre/resize; undo/redo inmediato; autosave/recarga; exportación/importación. Las conexiones fallidas a Factory I/O sin puente local son independientes del HMI.

## Pilotos, Temporizadores, Contadores y Barras

- **Piloto booleano:** Luz circular con bisel metálico y etiqueta inferior. El inspector permite configurar tag BOOL, color encendido, apagado y aro.
- **Piloto de alarma:** Parpadea una vez por segundo en rojo mientras el tag sea true en runtime; apagado permanece fijo.
- **Temporizador:** Muestra el tiempo transcurrido (`ET`), la consigna (`PT`) y una barra de progreso que avanza en tiempo real al compás del temporizador del PLC.
- **Contador:** Muestra el valor actual de conteo (`CV`), la capacidad/consigna (`PV`), una barra gráfica de llenado y una alerta visual cuando se alcanza el límite (`MAX`).
- **Barra analógica (Bargraph Siemens):** Representa niveles analógicos (`IW0`, porcentajes o magnitudes continuas) con rango mínimo y máximo configurable, marcas de escala de división y orientación horizontal o vertical.

## Chasis Industrial Siemens SIMATIC HMI

Tanto en modo edición como en ejecución, la pantalla está enmarcada en una carcasa industrial inspirada en los paneles táctiles **Siemens SIMATIC HMI KTP-600** en pixel-art:
- Bisel embutido en 3D con tornillos allen de fijación en las 4 esquinas.
- Logotipo **SIEMENS** y línea azul petróleo corporativa.
- Indicadores LED de hardware: **PWR** (alimentación), **RUN** (sincronizado con el motor del PLC) y **ALARM** (parpadea si hay cualquier alarma disparada).
- Teclado de membrana inferior con teclas de función táctiles:
  - **F1:** Ir a la pantalla inicial.
  - **F2:** Alternar RUN / STOP del PLC directamente desde el panel.
  - **F3 / F4:** Navegar entre pantallas anterior y siguiente.
- Botón en la esquina del chasis para alternar entre "Modo Chasis Siemens" y pantalla sin marco.

