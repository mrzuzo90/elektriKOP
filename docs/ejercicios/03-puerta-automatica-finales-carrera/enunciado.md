# Ejercicio 3 — Puerta automática con finales de carrera

**Dificultad:** ⭐⭐⭐ Avanzada
**Conceptos:** enclavamiento cruzado (interbloqueo), finales de carrera,
cableado físico NA/NC real, inversión de giro de motor

## Objetivo

Controlar una puerta automática (tipo persiana industrial) con dos motores
(o un mismo motor en dos sentidos, según prefieras pensarlo): uno para abrir
y otro para cerrar. La puerta debe pararse sola al llegar a cada extremo, y
nunca deben poder estar los dos motores activos a la vez.

Este ejercicio junta todo lo visto en los dos anteriores (enclavamiento,
temporización si quieres ampliarlo) y añade el concepto que hace único a
este emulador frente a "solo dibujar contactos": el **cableado físico
NA/NC**, en el panel *Proceso simulado*, que es independiente del contacto
que dibujes en el segmento.

## Entradas / Salidas

| Dirección | Símbolo      | Dispositivo | Cableado físico | Notas                                    |
| --------- | ------------ | ----------- | ---------------- | ----------------------------------------- |
| `I0.0`    | Abrir        | Pulsador    | NA (por defecto)  | Orden de abrir                            |
| `I0.1`    | Cerrar       | Pulsador    | NA (por defecto)  | Orden de cerrar                           |
| `I0.2`    | FC_Abierta   | Sensor / fin de carrera | **NC** | Detecta que la puerta llegó al tope abierto |
| `I0.3`    | FC_Cerrada   | Sensor / fin de carrera | **NC** | Detecta que la puerta llegó al tope cerrado |
| `Q0.0`    | Motor_Abrir  | Motor       | —                 | Gira en sentido de apertura                |
| `Q0.1`    | Motor_Cerrar | Motor       | —                 | Gira en sentido de cierre                  |
| `Q0.2`    | Aviso_Movimiento | Alarma  | —                 | Zumbador/baliza mientras la puerta se mueve |

## Por qué los finales de carrera van cableados en NC

En una instalación real, un final de carrera de seguridad casi siempre se
cablea **normalmente cerrado**: en reposo (lejos del tope) deja pasar
corriente, y **al llegar al tope, abre y corta** la señal. La ventaja es que
si se rompe o se desconecta un cable, el PLC lo interpreta igual que si
hubiera llegado al tope — el motor se para en vez de seguir empujando la
puerta contra el límite mecánico sin control. Esa es la razón de que en
este ejercicio marques `I0.2` e `I0.3` como **NC** en el panel *Proceso
simulado* (los botones NA/NC, no el contacto del segmento).

Como consecuencia, en el editor **el contacto del segmento va sin invertir**
(NA en el dibujo): el cableado físico ya hace la inversión por ti antes de
que la señal llegue al programa. Fíjate en el indicador "PLC ve: 0/1" del
panel *Proceso simulado* para comprobarlo mientras activas y desactivas el
sensor.

## Enunciado

1. Segmento **MOTOR_ABRIR** (`Q0.0`): arranca con `I0.0`, se enclava, y se
   para al llegar al final de carrera abierta (`I0.2`) — o si se ordena
   cerrar.
2. Segmento **MOTOR_CERRAR** (`Q0.1`): arranca con `I0.1`, se enclava, y se
   para al llegar al final de carrera cerrada (`I0.3`) — o si se ordena
   abrir.
3. **Interbloqueo**: nunca deben poder estar `Q0.0` y `Q0.1` activos a la
   vez. Además, si la puerta está abriendo y pulsas Cerrar (o viceversa),
   debe **invertir el sentido inmediatamente**, no solo ignorar la orden
   contraria.
4. Opcional: añade un tercer segmento `Q0.2` que se active mientras
   cualquiera de los dos motores esté en marcha, a modo de baliza/zumbador
   de aviso.

## Pistas

- Cada motor sigue el mismo patrón de enclavamiento del Ejercicio 1 (arrancar
  + auto-mantenerse), con dos condiciones extra en serie: el contacto del
  final de carrera correspondiente, y un contacto **NC del otro motor**
  (`Q0.1` negado en el segmento de `Q0.0`, y viceversa) — así nunca se
  pueden solapar.
- Para que el botón contrario **corte** el motor en marcha (y no solo
  bloquee que arranque el otro), añade también un contacto **NC del pulsador
  contrario** en serie (`I0.1` negado en el segmento de `Q0.0`, y viceversa).
  Es el mismo truco que usa un arrancador inversor de motor real.
- Recuerda: `Q0.2` (si lo añades) es simplemente `Q0.0` OR `Q0.1` — un
  bloque paralelo con una rama para cada motor.

## Solución

`solucion.json` — impórtala y prueba: pulsa Abrir, suéltalo (debe seguir
abriendo), y mientras abre pulsa Cerrar — la puerta debe invertir el sentido
en el acto. Simula la llegada a cada tope activando `I0.2` / `I0.3` en el
HMI.
