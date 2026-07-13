# Ejercicio 1 — Marcha/Paro con enclavamiento

**Dificultad:** ⭐ Básica
**Conceptos:** contacto NA, contacto NC, enclavamiento (self-holding), bobina directa

## Objetivo

Es el circuito más clásico de automatización: un motor que arranca con un
pulsador de **Marcha** y sigue funcionando aunque sueltes el botón, hasta que
pulsas **Paro**. Si no entiendes este circuito, no entiendes KOP — así que
empezamos por aquí.

## Entradas / Salidas

| Dirección | Símbolo    | Dispositivo (Proceso simulado) | Comportamiento                                  |
| --------- | ---------- | ------------------------------- | ------------------------------------------------ |
| `I0.0`    | Marcha_M1  | Pulsador (momentáneo)           | Activo solo mientras lo mantienes pulsado         |
| `I0.1`    | Paro_M1    | Seta de PARO (enclavamiento)    | Clic para enclavar, clic de nuevo para rearmar    |
| `Q0.0`    | Motor_M1   | Motor                           | Se anima mientras está activo                     |

## Enunciado

1. Crea un segmento (`Network 1`) con salida en bobina directa sobre `Q0.0`.
2. La lógica debe cumplir:
   - Al pulsar `I0.0` (Marcha), `Q0.0` se activa.
   - Si sueltas `I0.0`, `Q0.0` **debe seguir activo** (enclavado).
   - Al pulsar `I0.1` (Paro), `Q0.0` se desactiva, y ya no vuelve a activarse
     solo por soltar Paro — hace falta volver a pulsar Marcha.
3. Pulsa **RUN** y compruébalo en el HMI: pulsa Marcha, suelta, comprueba que
   el motor sigue girando en el Proceso simulado, y luego pulsa Paro.

## Pistas

- Necesitas un bloque **paralelo** (`+P`) con dos ramas: una con el contacto
  `I0.0`, otra con un contacto de `Q0.0` (así la propia salida "se mantiene a
  sí misma" una vez activada — esto es el enclavamiento).
- El contacto de `I0.1` va **en serie**, después del paralelo, y debe ser
  **normalmente cerrado (NC)** — haz clic sobre el contacto en el editor para
  invertirlo. Fíjate: el pulsador físico de Paro es normalmente abierto (así
  viene de fábrica el dispositivo `I0.1` en este ejercicio, cableado NA), pero
  en el **programa** usamos un contacto NC. Es la base de KOP: el contacto
  NC del programa corta el paso de corriente cuando su bit está a 1 (pulsado).

## Solución

`solucion.json` — impórtala desde el botón **Importar** de la barra lateral
para comparar tu resultado, o para verla funcionar directamente si te has
quedado atascado.
