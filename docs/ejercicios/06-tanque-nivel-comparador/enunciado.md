# Ejercicio 6 — Tanque con sensor analógico y comparadores

**Dificultad:** ⭐⭐⭐ Avanzada
**Conceptos:** entrada **analógica (IW)**, instrucción **comparador (CMP)**,
combinación con marcha/paro y marcas — el primer ejercicio que no trabaja
solo con bits (0/1), sino con un valor numérico real

## Objetivo

Un tanque tiene un sensor que mide su nivel de llenado como un porcentaje
(0-100%), no como un simple "lleno/vacío". Mientras el sistema esté en
marcha, una bomba debe llenar el tanque automáticamente en cuanto el nivel
baje del 30%. Una alarma de nivel alto, independiente de si el sistema está
en marcha o parado, debe saltar si el nivel llega al 90% — una alarma de
seguridad vigila siempre, no solo mientras el proceso está activo.

## Entradas / Salidas

| Dirección | Símbolo            | Dispositivo                | Notas                                              |
| --------- | ------------------- | --------------------------- | --------------------------------------------------- |
| `I0.0`    | Marcha              | Pulsador                    | Arranca el sistema                                   |
| `I0.1`    | Paro                | Seta de PARO                | Para el sistema (enclavamiento, igual que Ej. 1)     |
| `IW0`     | Nivel_Tanque        | Sensor analógico (slider)    | 0-100%, se controla con el slider en Proceso simulado |
| `Q0.0`    | Bomba_Llenado       | Motor                       | Llena el tanque mientras el sistema esté activo y el nivel < 30% |
| `Q0.1`    | Alarma_Nivel_Alto   | Alarma                      | Se activa si el nivel llega a 90%, en marcha o parado |
| `M0.0`    | Sistema_Activo      | (marca, no física)          | Bandera interna: ¿está el sistema en marcha?          |

## Enunciado

1. Añade la marca `M0.0` en la Tabla de variables y nómbrala
   `Sistema_Activo`.
2. **Segmento 1 — SISTEMA_ACTIVO**: mismo patrón de enclavamiento que el
   Ejercicio 1 (Marcha en paralelo con la propia marca, en serie con Paro en
   NC), pero escribiendo en `M0.0` en vez de en una `Q`.
3. **Segmento 2 — BOMBA_LLENADO**: en serie,
   - contacto NA sobre `M0.0` (el sistema debe estar activo),
   - un **comparador** (botón "+CMP" en el esquema, junto a "+C") sobre
     `IW0`, con el operador `<` y el valor `30`.
   - Salida: bobina directa `Q0.0`.
4. **Segmento 3 — ALARMA_NIVEL_ALTO**: un único comparador sobre `IW0`, con
   el operador `>=` y el valor `90` → bobina directa `Q0.1`. Sin contacto de
   `Sistema_Activo`: esta alarma no depende de si el sistema está en marcha.

## Pistas

- El comparador es una caja con 3 controles propios: la dirección analógica
  arriba (de momento solo hay una, `IW0`), el operador en el centro —**clic
  para cambiar entre `>=`, `<=`, `==`, `<>`, `<` y `>`**, igual que un
  contacto normal cicla entre NA/NC/P/N— y el valor constante abajo, editable
  como cualquier campo numérico.
- El valor de `IW0` no lo controla el Panel HMI (eso es solo para
  entradas digitales I) — se controla con el **slider** que aparece en
  Proceso simulado en cuanto uses `IW0` en algún comparador.
- Fíjate en que la Bomba se para sola en cuanto el nivel llega a 30% (el
  comparador `<` deja de cumplirse), sin necesidad de ningún otro
  enclavamiento — el propio comparador ya actúa como condición de corte.
- Prueba a subir el nivel hasta 90% con el sistema **parado**: la alarma
  debe saltar igual. Si solo salta con el sistema en marcha, el comparador de
  la alarma está mal — probablemente en serie con `M0.0` por error.

## Solución

`solucion.json` — impórtala y pulsa **RUN**. Pulsa `Marcha` (`I0.0`) y
observa que `Bomba_Llenado` se enciende sola (el nivel empieza en 0%, por
debajo del 30%). Sube el slider de `Nivel_Tanque` en Proceso simulado hasta
pasar el 30% y comprueba que la bomba se para. Súbelo hasta el 90% y
comprueba que `Alarma_Nivel_Alto` se enciende — pulsa `Paro` (`I0.1`) con el
nivel todavía en 90% y comprueba que la alarma sigue encendida aunque el
sistema ya no esté en marcha.
