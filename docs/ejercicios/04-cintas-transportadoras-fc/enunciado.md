# Ejercicio 4 — Dos cintas transportadoras con arranque temporizado (bloque FC)

**Dificultad:** ⭐⭐⭐ Avanzada
**Conceptos:** bloques FC (funciones reutilizables), interfaz de parámetros
IN/OUT, instrucción **Llamar**, temporizadores TON independientes por sitio
de llamada (repaso del Ejercicio 2)

## Objetivo

Hasta ahora todo el programa vivía en un único bloque Main. Este ejercicio
introduce los **bloques FC**: en vez de copiar y pegar la misma lógica dos
veces para dos cintas transportadoras idénticas, la escribes **una sola
vez** en un FC y la **llamas** desde Main tantas veces como haga falta —
exactamente como se hace en una instalación industrial real con varias
máquinas iguales.

Vas a construir un FC "Arranque_Temporizado" (una cinta que arranca 3
segundos después de pulsar su marcha) y llamarlo **dos veces** desde Main,
una por cada cinta física. El punto clave a comprobar: aunque ambas llamadas
ejecutan exactamente el mismo bloque, cada una mantiene **su propia cuenta
de tiempo**, totalmente independiente de la otra.

## Entradas / Salidas

| Dirección | Símbolo         | Dispositivo | Notas                                    |
| --------- | --------------- | ----------- | ----------------------------------------- |
| `I0.0`    | Marcha_Sistema  | Interruptor | Habilita ambas llamadas (condición EN)   |
| `I0.1`    | Marcha_Cinta1   | Pulsador    | Arranca la cuenta atrás de la cinta 1     |
| `I0.2`    | Marcha_Cinta2   | Pulsador    | Arranca la cuenta atrás de la cinta 2     |
| `Q0.0`    | Motor_Cinta1    | Cinta transportadora | Se activa 3s después de `Marcha_Cinta1` |
| `Q0.1`    | Motor_Cinta2    | Cinta transportadora | Se activa 3s después de `Marcha_Cinta2` |

## Enunciado

1. Crea un nuevo **FC** (menú de pausa → Bloques FC → "+ Nuevo FC") con:
   - Un parámetro **IN**, por ejemplo `Marcha`.
   - Un parámetro **OUT**, por ejemplo `Motor`.
   - Un único segmento dentro del FC: un contacto sobre `#Marcha` alimentando
     un temporizador **TON** de **3 segundos** cuya salida sea `#Motor`
     (usa el desplegable de dirección del contacto/salida — tus parámetros
     locales aparecen ahí junto a las direcciones físicas, con el prefijo
     `#`).
2. Vuelve a **Main** y añade **dos segmentos**, ambos con la instrucción
   **Llamar** (arrástrala o haz clic en ella, igual que con Bobina/SET/TON):
   - Los dos deben apuntar al **mismo FC** que acabas de crear.
   - La condición de entrada (EN) de ambos segmentos: contacto sobre
     `I0.0`.
   - Primer segmento: cablea `Marcha` → `I0.1` y `Motor` → `Q0.0`.
   - Segundo segmento: cablea `Marcha` → `I0.2` y `Motor` → `Q0.1`.

## Pistas

- La condición **EN** de la instrucción Llamar (`I0.0`) decide si esa
  llamada se ejecuta *este ciclo*; el cableado de parámetros (`Marcha` →
  `I0.1`, etc.) decide *qué valores* recibe el FC cuando se ejecuta. Son dos
  cosas distintas — no hace falta repetir `I0.1`/`I0.2` en la condición EN,
  ya se lee dentro del propio FC a través del parámetro `Marcha`.
- Si activas `Marcha_Cinta1` (`I0.1`) y esperas 3 segundos, `Motor_Cinta1`
  arranca. Si en ese momento activas también `Marcha_Cinta2` (`I0.2`),
  `Motor_Cinta1` **no se ve afectado** — sigue encendido — y
  `Motor_Cinta2` empieza a contar sus propios 3 segundos desde cero. Ese es
  justo el comportamiento que demuestra que las dos llamadas al mismo FC no
  comparten memoria de temporizador.
- Intenta también borrar el FC desde el menú mientras alguno de los dos
  segmentos "Llamar" siga apuntando a él: el botón de eliminar debería
  aparecer deshabilitado, con un aviso de que el bloque está en uso.

## Solución

`solucion.json` — impórtala y pulsa **RUN**. Activa `I0.0`, luego `I0.1` y
espera 3 segundos para ver arrancar `Motor_Cinta1`; activa `I0.2` en
cualquier momento (antes o después) y comprueba que `Motor_Cinta2` arranca
3 segundos después **de su propio** `I0.2`, sin importar cuándo arrancó
`Motor_Cinta1`. Cambia a la pestaña del FC en el editor para ver su lógica
interna, y fíjate en el contador de "T. ACTIVOS" del panel HMI: sube a 2
en cuanto ambas cintas están contando a la vez, cada una con su propio
tiempo transcurrido.
