# Ejercicio 7 — Alternador con bloque FB (memoria STATIC)

**Dificultad:** ⭐⭐⭐ Avanzada
**Conceptos:** bloque **FB** (Function Block), parámetro **STATIC**, contraste
directo con un FC — el primer ejercicio donde un bloque recuerda algo por su
cuenta, sin necesidad de una marca (M) externa

## Objetivo

Dos lámparas, cada una con su propio pulsador. Cada vez que se pulsa,
la lámpara correspondiente **cambia de estado** (si estaba apagada se
enciende, si estaba encendida se apaga) — un interruptor de tipo alternador,
como el de una escalera. Las dos lámparas deben comportarse de forma
totalmente independiente entre sí, aunque las dos usen exactamente el mismo
bloque de programa.

## Por qué un FC no basta aquí

Ya conoces los **FC** (Ejercicio 4): funciones reutilizables con su propia
interfaz IN/OUT, pero **sin memoria propia** — sus variables se recalculan
enteras en cada ciclo de scan. Un FC puede tener un temporizador o un
contador con cuenta propia por sitio de llamada (eso ya lo viste), pero no
tiene forma de guardar un simple bit "¿estoy encendida o apagada ahoraʔ" de
un ciclo al siguiente, salvo escribiéndolo en una marca (M) física... y una
marca es **global**: si la reutilizaras para las dos lámparas, dejarían de
ser independientes.

Un **FB** (Function Block) es igual que un FC — misma instrucción "Llamar",
misma interfaz IN/OUT — pero añade una tercera categoría de parámetro:
**STATIC**. A diferencia de IN/OUT, STATIC **no se reinicia en cada
llamada**: conserva su valor de un ciclo de scan al siguiente, y cada sitio
de llamada tiene el suyo propio, totalmente aislado del resto — sin que
tengas que gestionar ningún "DB de instancia" a mano, como sí haría falta en
TIA Portal real.

## Entradas / Salidas

| Dirección | Símbolo      | Dispositivo | Notas                          |
| --------- | ------------ | ----------- | ------------------------------- |
| `I0.0`    | Pulsador_L1  | Pulsador    | Alterna la lámpara 1             |
| `I0.1`    | Pulsador_L2  | Pulsador    | Alterna la lámpara 2, independiente de la 1 |
| `Q0.0`    | Lampara_1    | Lámpara     |                                  |
| `Q0.1`    | Lampara_2    | Lámpara     |                                  |

## Enunciado

1. Abre el menú de pausa → **Bloques (FC / FB)** → sección "Bloques FB" →
   **+ Nuevo FB**. Renómbralo `Alternador`.
2. Dale esta interfaz:
   - **IN**: `Activar`.
   - **OUT**: `Salida`.
   - **STATIC**: `Estado`.
3. Dentro del FB `Alternador`, monta la lógica de un alternador con **un
   único segmento SR** (no dos SET/RESET separados — mira la pista de abajo
   para saber por qué):
   - **Segmento 1 (SR)**: rama **S**, en serie: contacto de **flanco P**
     sobre `#Activar` + contacto **NC** sobre `#Estado`. Rama **R1**, en
     serie: el mismo contacto de **flanco P** sobre `#Activar` + contacto
     **NA** sobre `#Estado`. Salida: `#Estado`.
   - **Segmento 2**: bobina directa, contacto NA sobre `#Estado` → salida
     `#Salida`.
4. Vuelve a `Main` y crea **dos** segmentos "Llamar" al mismo FB
   `Alternador`:
   - **LAMPARA_1**: condición `I0.0`, cablea `Activar`→`I0.0` y
     `Salida`→`Q0.0`.
   - **LAMPARA_2**: condición `I0.1`, cablea `Activar`→`I0.1` y
     `Salida`→`Q0.1`.

## Pistas

- ¿Por qué **un** segmento SR y no dos (SET + RESET) por separado? Porque
  dentro del mismo ciclo de scan, el segmento SET escribiría primero
  `#Estado`, y el segmento RESET —evaluado justo después— **volvería a leer
  ese valor ya cambiado**, deshaciendo el toggle en el mismo ciclo. El
  bloque SR evalúa S y R contra el mismo valor de `#Estado` (el que tenía al
  *empezar* el ciclo) antes de escribir ninguno de los dos, así que no hay
  ambigüedad: si estaba a 0 se pone a 1 (S gana), si estaba a 1 se pone a 0
  (R gana) — nunca los dos a la vez.
- `#Estado` nunca aparece en Proceso simulado ni en la Tabla de variables:
  es memoria **interna** del FB, invisible desde fuera — solo `Activar` y
  `Salida`, las direcciones físicas cableadas al llamarlo, son visibles.
- Prueba a pulsar `Pulsador_L1` varias veces seguidas: `Lampara_1` debe ir
  alternando ON/OFF/ON/OFF... mientras `Lampara_2` no se mueve para nada, y
  viceversa — esa independencia total, sin haber escrito ninguna marca (M),
  es el punto entero del ejercicio.
- Si conectas `Activar` a un pulsador momentáneo, el flanco P solo dispara
  una vez por pulsación (no sigue alternando mientras lo mantengas
  pulsado) — igual que cualquier otro contacto de flanco que ya conoces.

## Solución

`solucion.json` — impórtala y pulsa **RUN**. Pulsa `Pulsador_L1` (`I0.0`)
varias veces y observa cómo `Lampara_1` (`Q0.0`) va encendiéndose y
apagándose a cada pulsación, sin que `Lampara_2` (`Q0.1`) se vea afectada en
ningún momento. Haz lo mismo con `Pulsador_L2` (`I0.1`) y comprueba que pasa
exactamente igual, en sentido contrario — cada lámpara "recuerda" su propio
estado por sí sola.
