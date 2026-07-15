# Ejercicio 5 — Contador de piezas con marca interna

**Dificultad:** ⭐⭐ Intermedia
**Conceptos:** contador **CTU**, pin de Reset de un contador, **marcas (M)**
como bandera interna, interbloqueo de un motor a partir de una marca

## Objetivo

Una cinta transportadora tiene un sensor que detecta cada pieza que pasa.
Cuando se han contado 5 piezas (un "lote"), se enciende una alarma y la
cinta **se detiene** hasta que un operario pulsa Reset. Aquí no hay ninguna
`Q` libre haciendo de bandera interna (como en el Ejercicio 2) — se usa una
**marca (M)** de verdad, que es justo lo que están pensadas para hacer: una
bandera interna del programa, invisible en el Proceso simulado (no es un
dispositivo físico) pero disponible para cualquier segmento, con su propio
nombre en la Tabla de variables.

## Entradas / Salidas

| Dirección | Símbolo             | Dispositivo          | Notas                                      |
| --------- | ------------------- | -------------------- | -------------------------------------------- |
| `I0.0`    | Sensor_Pieza        | Sensor / fin de carrera | Un pulso por cada pieza que pasa           |
| `I0.1`    | Reset_Contador      | Pulsador              | Reinicia el contador y libera la alarma      |
| `Q0.0`    | Alarma_Lote_Completo | Alarma               | Se activa al llegar a 5 piezas               |
| `Q0.1`    | Motor_Cinta         | Cinta transportadora | En marcha salvo mientras el lote esté completo |
| `M0.0`    | Lote_Completo       | (marca, no física)   | Bandera interna: ¿ya se contaron las 5 piezas? |

## Enunciado

1. Añade la marca `M0.0` en la Tabla de variables (menú de pausa →
   "+ Añadir variable") y nómbrala `Lote_Completo`.
2. **Segmento 1** — instrucción **CTU** (Contador, botón "Cont. CTU"):
   - Pulso de cuenta (`CU`, el rail principal del segmento): contacto sobre
     `I0.0`.
   - Pin **R** (Reset): cablea `I0.1`.
   - **PV** (cuenta a alcanzar): `5`.
   - Salida: `M0.0` (¡no una `Q`! el contador puede escribir en una marca
     exactamente igual que en una salida física).
3. **Segmento 2** — bobina directa: contacto sobre `M0.0` (normal, NA) →
   salida `Q0.0`.
4. **Segmento 3** — bobina directa: contacto sobre `M0.0`, pero en modo
   **NC** (clic sobre el contacto para alternar NA→NC) → salida `Q0.1`.

## Pistas

- El contador solo cuenta en el **flanco de subida** del pulso de `CU` —
  mantener `I0.0` pulsado no sigue sumando, tienes que soltarlo y volver a
  pulsarlo por cada pieza (igual que un sensor real, que solo dispara un
  pulso al detectar el borde de la pieza pasando).
- El pin `R` tiene prioridad: si lo activas a la vez que llega un pulso de
  cuenta, gana el reset (la cuenta se va a 0 ese mismo ciclo).
- No hace falta ningún segmento extra para "apagar" `M0.0` al pulsar Reset —
  en cuanto `I0.1` pone la cuenta (`CV`) a 0, la propia condición del
  contador (`CV >= PV`) deja de cumplirse ese mismo ciclo, así que `M0.0` se
  suelta sola.
- El Segmento 3 es el mismo patrón de interbloqueo que ya viste con los
  finales de carrera del Ejercicio 3, pero ahora la condición no viene de un
  sensor físico sino de una marca interna — así es como en un programa real
  se detiene una máquina en respuesta a una condición interna (lote
  completo, fallo detectado, etc.) sin depender de un cableado físico
  adicional.

## Solución

`solucion.json` — impórtala y pulsa **RUN**. Pulsa `Sensor_Pieza` (`I0.0`)
cinco veces (clic para activar, clic para soltar, en cada pieza) y observa
cómo `Alarma_Lote_Completo` se enciende y `Motor_Cinta` se para justo en la
quinta. Pulsa `Reset_Contador` (`I0.1`) y comprueba que la alarma se apaga,
el motor vuelve a arrancar, y el punto de estado de `Lote_Completo` en la
Tabla de variables (menú de pausa) se pone en gris — puedes verlo cambiar
en vivo sin necesidad de montar ningún contacto de prueba.
