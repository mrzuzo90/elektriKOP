# Ejercicio 2 — Semáforo con temporizadores

**Dificultad:** ⭐⭐ Intermedia
**Conceptos:** temporizador TON, encadenado de temporizadores, reutilizar
direcciones `Q` como marcas auxiliares, enclavamiento (repaso del Ejercicio 1)

## Objetivo

Construir un semáforo de tres colores (rojo → verde → amarillo → rojo...)
que se repite en bucle mientras el sistema está en marcha, usando solo
temporizadores TON y bobinas — el emulador no tiene un bloque de "secuencia"
dedicado, así que hay que construirla a mano encadenando temporizadores. Es
exactamente lo que harías en un PLC real sin usar bloques de función
avanzados.

## Entradas / Salidas

| Dirección | Símbolo       | Dispositivo | Notas                                              |
| --------- | ------------- | ----------- | --------------------------------------------------- |
| `I0.0`    | Marcha_Semaforo | Interruptor | Mientras esté activo, el semáforo funciona en bucle |
| `Q0.0`    | Rojo          | Lámpara     | Fase roja                                            |
| `Q0.1`    | Verde         | Lámpara     | Fase verde                                           |
| `Q0.2`    | Amarillo      | Lámpara     | Fase amarilla                                        |
| `Q0.3`    | T_Rojo_fin    | (sin dispositivo — marca auxiliar) | Bit "fin de temporizador rojo"     |
| `Q0.4`    | T_Verde_fin   | (sin dispositivo — marca auxiliar) | Bit "fin de temporizador verde"    |
| `Q0.5`    | T_Amarillo_fin| (sin dispositivo — marca auxiliar) | Bit "fin de temporizador amarillo" |

> El emulador solo tiene direcciones `I` y `Q` (no hay área `M` de marcas
> internas), así que usamos salidas `Q` libres como "marcas auxiliares" para
> guardar el estado de cada temporizador. Es una técnica habitual cuando no
> tienes memoria interna disponible.

## Enunciado

Diseña la secuencia:

- **Rojo**: 4 segundos.
- **Verde**: 4 segundos.
- **Amarillo**: 2 segundos.
- Y vuelta a empezar, en bucle, mientras `I0.0` esté activo.

Reglas:

1. Solo una lámpara puede estar encendida a la vez (en régimen permanente).
2. Cada fase debe **auto-mantenerse encendida** (enclavamiento, como en el
   Ejercicio 1) hasta que su propio temporizador termine.
3. Necesitarás **6 segmentos**: 3 bobinas de color + 3 temporizadores TON
   (uno por color).

## Pistas

- Empieza por **Rojo**: enciéndelo con una condición simple — "Marcha
  activa Y no estamos en Verde Y no estamos en Amarillo". No necesitas
  enclavamiento explícito aquí: esta condición ya es cierta por defecto en
  cuanto arrancas, y se vuelve falsa sola en cuanto arranca otra fase.
- El temporizador de Rojo (`T_Rojo`, TON, 4s) debe estar **alimentado por el
  propio contacto de Rojo** (`Q0.0`) y su salida ir a la marca `Q0.3`.
- **Verde** es más interesante: se enciende cuando `Q0.0` (Rojo) Y `Q0.3`
  (fin de T_Rojo) están activos a la vez — pero eso solo dura un instante,
  así que Verde necesita **enclavarse a sí mismo** igual que en el Ejercicio
  1, usando un bloque paralelo: una rama "arranca" (`Rojo` Y `T_Rojo_fin`),
  otra rama "se mantiene" (`Verde` Y NO `T_Verde_fin`).
- **Amarillo** sigue el mismo patrón que Verde, pero disparado por
  `Verde` + `T_Verde_fin`, y con su propio temporizador de 2s.
- El cierre del ciclo es automático: en cuanto el temporizador de Amarillo
  termina, la condición de Rojo ("no estamos en Verde ni en Amarillo") vuelve
  a ser cierta sin que tengas que hacer nada explícito para ello.

## Nota curiosa (para quien quiera profundizar)

Si simulas el circuito paso a paso con el botón **1 CICLO**, notarás que en
la transición Rojo→Verde ambos colores están encendidos durante **un único
ciclo de scan** (100 ms), y en la transición Amarillo→Rojo hay un ciclo en
el que ningún color está encendido. Esto no es un error: es una consecuencia
real de cómo un PLC evalúa la lógica de arriba a abajo, un segmento detrás
de otro, dentro del mismo ciclo. Es un efecto totalmente imperceptible a
ojo (100 ms) pero muy típico en programación de PLC con lógica por nivel
(sin flancos). **Reto extra:** ¿puedes rediseñar el segmento de Rojo para
que se autoextinga con su propio temporizador auxiliar, igual que Verde y
Amarillo, y elimines el solape?

## Solución

`solucion.json` — impórtala y pulsa **RUN** para ver el semáforo funcionando
en bucle. Prueba también el modo **1 CICLO** para seguir la secuencia paso a
paso.
