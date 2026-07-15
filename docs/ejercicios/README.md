# Ejercicios propuestos

Ejercicios de dificultad creciente para practicar lógica de escalera (KOP)
con ElektriKOP. Cada carpeta tiene:

- `enunciado.md` — el objetivo, las E/S a usar y pistas para resolverlo sin
  darte la solución directamente.
- `solucion.json` — un proyecto completo, listo para importar desde el botón
  **Importar** de la barra lateral, con la lógica resuelta y las direcciones
  ya asignadas a dispositivos del *Proceso simulado*.

| # | Ejercicio | Dificultad | Conceptos nuevos |
| - | --------- | ---------- | ----------------- |
| 1 | [Marcha/Paro con enclavamiento](01-marcha-paro-enclavamiento/enunciado.md) | ⭐ | Contacto NA/NC, enclavamiento, bobina directa |
| 2 | [Semáforo con temporizadores](02-semaforo-temporizadores/enunciado.md) | ⭐⭐ | Temporizador TON, encadenado de temporizadores, marcas auxiliares en `Q` |
| 3 | [Puerta automática con finales de carrera](03-puerta-automatica-finales-carrera/enunciado.md) | ⭐⭐⭐ | Interbloqueo cruzado, finales de carrera, cableado físico NA/NC real |
| 4 | [Dos cintas transportadoras con arranque temporizado (bloque FC)](04-cintas-transportadoras-fc/enunciado.md) | ⭐⭐⭐ | Bloques FC, interfaz IN/OUT, instrucción Llamar, temporizadores independientes por sitio de llamada |

## Cómo usarlos

1. Lee el `enunciado.md` del ejercicio.
2. Intenta resolverlo tú mismo en el editor antes de mirar la solución —
   es la parte que realmente enseña.
3. Si te atascas, importa `solucion.json` para compararlo con tu intento, o
   para verlo funcionar y entender el porqué.

## Progresión pensada

Los cuatro ejercicios están diseñados para construirse uno sobre otro:

- El **Ejercicio 1** enseña el enclavamiento con un contacto NC *lógico*
  (dibujado en el segmento) sobre un pulsador cableado NA por defecto — la
  base de KOP.
- El **Ejercicio 2** reutiliza ese mismo patrón de enclavamiento para
  encadenar temporizadores, mostrando cómo montar una secuencia sin bloques
  de función dedicados.
- El **Ejercicio 3** introduce el cableado físico NC *real* (en el panel
  *Proceso simulado*, no en el segmento) — la diferencia entre "cómo está
  cableado el sensor en la instalación" y "qué contacto dibujas en el
  programa" es una de las características distintivas de este emulador
  frente a un simple editor de diagramas.
- El **Ejercicio 4** da el salto a los **bloques FC**: en vez de duplicar
  lógica idéntica para dos máquinas iguales, la escribes una vez y la llamas
  dos veces, comprobando que cada llamada mantiene su propio temporizador
  interno de forma independiente.

## ¿Tienes un ejercicio propio?

Los *pull requests* añadiendo ejercicios (propuestos y, si puede ser,
también resueltos) son bienvenidos. Ideas de temática industrial real
(cintas transportadoras, dosificadoras, cámaras frigoríficas con
histéresis...) son especialmente valiosas para el objetivo didáctico del
proyecto.
