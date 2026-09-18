# Guía Didáctica: Funciones de TIA Portal en ElektriKOP

Esta guía explica en detalle y de forma pedagógica las nuevas funciones de **Siemens TIA Portal (STEP 7)** integradas en **ElektriKOP**. Está diseñada para profesores y estudiantes de formación profesional (ciclos de Automatización, Mecatrónica, Mantenimiento Electrónico y certificados como ELEE0109).

---

## Índice

1. [El Inversor de Flujo Lógico: `--[NOT]--`](#1-el-inversor-de-flujo-lógico---not---)
2. [Marcas de Ciclo y de Sistema (`MB1`: Clock & System Bits)](#2-marcas-de-ciclo-y-de-sistema-mb1-clock--system-bits)
3. [Bloque de Organización de Arranque: `Startup [OB100]`](#3-bloque-de-organización-de-arranque-startup-ob100)
4. [Instrucción de Transferencia: `MOVE`](#4-instrucción-de-transferencia-move)
5. [Temporizador Acumulador Retentivo: `TONR`](#5-temporizador-acumulador-retentivo-tonr)
6. [Operaciones Matemáticas: `ADD` y `SUB`](#6-operaciones-matemáticas-add-y-sub)
7. [Tabla Rápida de Equivalencias](#7-tabla-rápida-de-equivalencias)

---

## 1. El Inversor de Flujo Lógico: `--[NOT]--`

### ¿Qué es?
En el lenguaje de contactos (KOP/LAD), la corriente fluye de izquierda a derecha a través de los contactos. Cada punto del circuito tiene un estado lógico denominado **RLO** (*Result of Logic Operation* o Resultado de la Operación Lógica).
La instrucción `--[NOT]--` es un bloque de paso que **invierte el RLO acumulado** en el punto exacto donde se coloca:
- Si a la izquierda del `NOT` llega corriente (flujo activo en verde), a la derecha del `NOT` la corriente **se corta** (negro).
- Si a la izquierda del `NOT` la corriente estaba cortada, el `NOT` **reestablece la corriente** hacia la derecha.

```
                  +-----+
---( Flujo: 1 )---| NOT |---( Flujo: 0 )---
                  +-----+
```

### ¿En qué se diferencia de un contacto normalmente cerrado (NC)?
*   Un **contacto NC (`-|/|-`)** solo invierte el valor de **una variable concreta** (por ejemplo, `%I0.1`).
*   El **inversor `--[NOT]--`** invierte el resultado de **toda una red de condiciones previas**, sin necesidad de asociarlo a ninguna dirección de memoria.

### Caso de uso industrial real
Imagina un circuito donde una cinta transportadora debe pararse si se activa **cualquiera** de tres sensores de seguridad en paralelo (`S1 OR S2 OR S3`).
*   *Sin NOT:* Tendrías que aplicar las leyes de De Morgan y cablear tres contactos NC en serie (`/S1 AND /S2 AND /S3`).
*   *Con NOT:* Cableas los tres sensores en paralelo de forma natural (`+P`) y colocas un único bloque `--[NOT]--` a la salida del paralelo antes de la bobina.

---

## 2. Marcas de Ciclo y de Sistema (`MB1`: Clock & System Bits)

En los autómatas Siemens SIMATIC S7-1200 / S7-1500, la CPU dispone de marcas internas especiales generadas por el propio sistema operativo del autómata. En ElektriKOP se asignan al byte de memoria **`MB1`**, dejando el byte `MB0` (`M0.0` a `M0.7`) completamente libre para marcas de usuario.

### Marcas disponibles y su comportamiento

| Dirección | Símbolo Siemens | Comportamiento | Aplicación en el aula |
| :--- | :--- | :--- | :--- |
| **`M1.0`** | `FirstScan` | Vale **`1`** exclusivamente durante el primer ciclo de scan tras pulsar RUN o Paso. En los ciclos posteriores vale **`0`**. | Cargar recetas, fijar etapas iniciales o encender marcas de puesta en marcha. |
| **`M1.2`** | `AlwaysTRUE` | Siempre vale **`1`** de forma incondicional. | Mantener bloques habilitados o forzar ramas en depuración. |
| **`M1.3`** | `AlwaysFALSE` | Siempre vale **`0`** de forma incondicional. | Deshabilitar segmentos temporalmente sin borrarlos. |
| **`M1.7`** | `Clock_1Hz` | Oscila con período de **1.0 segundo** (500 ms a `1`, 500 ms a `0`). | **Balizas de aviso, lámparas de alarma intermitentes y sirenas.** |
| **`M1.6`** | `Clock_2Hz` | Oscila con período de **0.5 segundos** (250 ms a `1`, 250 ms a `0`). | Intermitencia rápida (fallo crítico o preaviso de arranque). |
| **`M1.5`** | `Clock_0.5Hz` | Oscila con período de **2.0 segundos** (1.0 s a `1`, 1.0 s a `0`). | Intermitencia lenta de baliza informativa o modo espera. |

### Caso de uso industrial real
Para hacer parpadear una luz piloto de alarma (`Q0.0`) cuando se detecta un fallo (`M0.1`):
Basta con poner en serie un contacto de `M0.1` y un contacto de **`M1.7` (`Clock_1Hz`)** hacia la bobina `Q0.0`.
*¡Ya no hace falta programar dos temporizadores TON encadenados solo para hacer parpadear una luz!*

---

## 3. Bloque de Organización de Arranque: `Startup [OB100]`

### ¿Qué es?
En la arquitectura de autómatas Siemens existen distintos tipos de bloques de organización (OB):
*   **`Main [OB1]`**: Es el bloque cíclico principal. Se ejecuta una y otra vez indefinidamente mientras la CPU esté en RUN.
*   **`Startup [OB100]`**: Es el bloque de arranque. Se ejecuta **exactamente una sola vez** cuando la CPU realiza la transición de modo STOP a RUN.

```
 [Pulsar RUN]
      │
      ▼
┌──────────────┐
│ Startup      │  ◄── Se ejecuta 1 vez (Inicialización)
│ [OB100]      │
└──────┬───────┘
       │
       ▼
┌──────────────┐ ◄───┐
│ Main         │     │  Bucle cíclico infinito (Scan normal)
│ [OB1]        │ ────┘
└──────────────┘
```

### ¿Por qué es tan importante en la industria?
En una fábrica real, cuando enciendes la máquina o rearmas el cuadro eléctrico, la máquina debe arrancar en un estado conocido y seguro:
1.  Poner a `1` la etapa inicial del Grafcet (ej. `SET M0.0`).
2.  Resetear contadores o mermas residuales.
3.  Establecer la consigna de velocidad por defecto.

Si programaras estas inicializaciones en `Main [OB1]` con una bobina normal, se sobreescribirían en cada scan de 100 ms impidiendo el funcionamiento normal de la máquina. `OB100` garantiza que la inicialización se hace limpiamente antes del primer scan de `Main`.

---

## 4. Instrucción de Transferencia: `MOVE`

### ¿Qué es?
`MOVE` es la instrucción reina en TIA Portal para manipular datos numéricos. Mientras que las bobinas solo trabajan con bits (`0` o `1`), `MOVE` copia **un número entero o analógico** desde una fuente (`IN`) hasta un destino (`OUT1`).

Tiene dos pines de control:
*   **`EN` (*Enable*)**: Entrada de habilitación conectada al riel izquierdo.
    *   Si `EN = 1`: se lee `IN` y se escribe inmediatamente en `OUT1`.
    *   Si `EN = 0`: **no hace nada**, y `OUT1` conserva el valor que tenía antes.
*   **`ENO` (*Enable Output*)**: Transmite el flujo hacia la derecha si la operación se ejecutó correctamente.

### Parámetros configurables en ElektriKOP:
*   **`IN`**: Puede ser un valor constante fijo (ej. `50`), una entrada analógica (`IW0`), o el valor actual de un contador o temporizador (`CV`, `ET`).
*   **`OUT1`**: La variable de destino, típicamente la salida analógica **`QW0`** (usada en Factory I/O para controlar variadores de frecuencia de cintas transportadoras).

### Caso de uso industrial real: Selección de velocidad de cinta
*   Si el operario pulsa *Velocidad Lenta* (`I0.0`), un bloque `MOVE` con `IN = 25` escribe en `QW0`.
*   Si el operario pulsa *Velocidad Rápida* (`I0.1`), otro bloque `MOVE` con `IN = 80` escribe en `QW0`.
*   El variador de frecuencia conectado a `QW0` adapta inmediatamente la velocidad del motor.

---

## 5. Temporizador Acumulador Retentivo: `TONR`

### ¿Qué es?
En la norma IEC existen 4 temporizadores estándar. ElektriKOP ya contaba con `TON`, `TOF` y `TP`. Ahora se incorpora el cuarto: **`TONR`** (*Time On-Delay Retentive* / Retardo a la conexión con retención).

### ¿En qué se diferencia de un TON ordinario?
*   En un **`TON` normal**: si la señal de entrada cae a `0`, el tiempo transcurrido (`ET`) se borra inmediatamente y vuelve a `0`.
*   En un **`TONR` retentivo**: si la señal de entrada cae a `0`, el temporizador **se pausa** y retiene el tiempo acumulado en memoria. Cuando la entrada vuelve a `1`, continúa contando desde donde se quedó.
*   **Pin de Reset (`R`)**: Al ser retentivo, la única forma de volver `ET` a cero es energizar su entrada secundaria de Reset `R`.

```
                    ┌───────┐
                    │ TONR  │
 Entrada IN ────────┤IN    Q├─── Salida activada al llegar a PT
                    │       │
 Entrada Reset R ───┤R      │
                    │       │
      Tiempo PT ────┤PT   ET├─── Tiempo acumulado (Pausable)
                    └───────┘
```

### Caso de uso industrial real: Horómetro de mantenimiento
Una fresadora industrial debe pasar revisión cada 50 horas de giro del cabezal.
*   La entrada `IN` se conecta al contactor de giro del motor. Cada vez que la máquina mecaniza, acumula tiempo. Cuando el operario para la máquina para cambiar la pieza, el tiempo no se pierde: se queda congelado.
*   Cuando la suma de todos los tiempos alcanza el valor `PT`, la salida `Q` enciende el testigo de "Mantenimiento requerido".
*   El técnico realiza la revisión y pulsa una llave de rearme conectada a la entrada `R`, reseteando el contador a cero para el siguiente ciclo.

---

## 6. Operaciones Matemáticas: `ADD` y `SUB`

### ¿Qué son?
Las cajas aritméticas `ADD` (Suma) y `SUB` (Resta) permiten realizar cálculos numéricos dentro del esquema KOP:
*   **`ADD`**: `OUT = IN1 + IN2`
*   **`SUB`**: `OUT = IN1 - IN2`

Al igual que `MOVE`, disponen de entrada de habilitación `EN`: solo calculan y actualizan el valor de destino cuando la condición previa del segmento es verdadera.

### Caso de uso industrial real: Balance de almacén o producción
1.  **Totalizar producción (`ADD`)**: Un sensor cuenta cajas pequeñas (`CV:1`) y otro sensor cuenta cajas grandes (`CV:2`). Un bloque `ADD` suma ambos contadores para obtener el total de bultos expedidos.
2.  **Stock restante (`SUB`)**: Partiendo de un lote inicial de 100 piezas, cada vez que sale una pieza rechazada o expedida, se resta para conocer en tiempo real las existencias disponibles en tolva.

---

## 7. Tabla Rápida de Equivalencias

| Función en ElektriKOP | Mnemónico TIA Portal | Ubicación en ElektriKOP | Función principal |
| :--- | :--- | :--- | :--- |
| **`+NOT`** | `--[/]--` / `NOT` | Barra de contactos (`+C`, `+NOT`, `+CMP`, `+P`) | Invierte el flujo de corriente en ese punto de la red. |
| **`M1.0`** | `%M1.0` (`FirstScan`) | Memoria de marcas | Bit a 1 solo en el primer ciclo de scan de la CPU. |
| **`M1.7`** | `%M1.7` (`Clock_1Hz`) | Memoria de marcas | Reloj oscilador de 1 segundo (500ms ON / 500ms OFF). |
| **`M1.6`** | `%M1.6` (`Clock_2Hz`) | Memoria de marcas | Reloj oscilador rápido de 0.5 segundos. |
| **`M1.2`** | `%M1.2` (`AlwaysTRUE`) | Memoria de marcas | Señal fija a 1 lógico. |
| **`Startup [OB100]`** | `OB100` (*Startup*) | Árbol de Proyecto / Bloques | Rutina de inicialización ejecutada una única vez al arrancar. |
| **`MOVE`** | `MOVE` | Paleta de salidas del segmento | Copia una constante o variable a otra variable (`QW0`). |
| **`TONR`** | `TONR` | Paleta de salidas del segmento | Temporizador acumulador pausable con pin de Reset. |
| **`ADD` / `SUB`** | `ADD` / `SUB` | Paleta de salidas del segmento | Operaciones aritméticas de suma y resta. |
