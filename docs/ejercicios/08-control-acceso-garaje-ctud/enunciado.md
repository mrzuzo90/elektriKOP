# Ejercicio 8 — Control de acceso a garaje con contador bidireccional CTUD

**Dificultad**: ⭐⭐  
**Conceptos**: Contador bidireccional CTUD, variables `CU`, `CD`, `QU`, `QD`, `CV`, `PV`, marcas internas (`M`), barrera y semáforos, telemetría WebSocket en tiempo real.

---

## 🎯 Objetivo

Diseñar el automatismo de control para el aparcamiento de vehículos de un garaje con capacidad máxima de **10 plazas**.

El sistema debe:
1. Contar los coches que entran mediante un sensor/pulsador en la entrada (`I0.1` cableado a la entrada `CU` del CTUD).
2. Contar los coches que salen mediante un sensor/pulsador en la salida (`I0.2` cableado a la entrada `CD` del CTUD).
3. Mantener actualizado el valor de coches presentes en el parking en el valor actual `CV` del contador (0 a 10 plazas).
4. Mientras haya plazas disponibles (`CV < 10` y por tanto `QU = false`):
   - La **barrera de acceso** debe estar abierta/levantada (`Q0.7 = true`).
   - El **semáforo verde** debe estar encendido (`Q0.1 = true`).
   - El **semáforo rojo** debe estar apagado (`Q0.2 = false`).
5. Cuando el parking se llene (`CV >= 10` y por tanto `QU = true` escribiendo en la marca `M0.0`):
   - La **barrera de acceso** se cierra/baja (`Q0.7 = false`).
   - El **semáforo verde** se apaga (`Q0.1 = false`).
   - El **semáforo rojo** se enciende indicando COMPLETO (`Q0.2 = true`).
6. Si un vehículo sale del parking (pulso en `I0.2`), el contador decrementa su valor actual (`CV` pasa de 10 a 9), desactivando `M0.0`, levantando de nuevo la barrera y cambiando el semáforo a verde.

---

## 📋 Asignación de Entradas y Salidas

| Dirección | Tipo / Dispositivo | Símbolo | Función |
|-----------|-------------------|---------|---------|
| `I0.1` | Pulsador / Sensor NA | `Sensor_Entrada_Coche` | Flanco de subida en `CU` (entra un vehículo) |
| `I0.2` | Pulsador / Sensor NA | `Sensor_Salida_Coche` | Flanco de subida en `CD` (sale un vehículo) |
| `M0.0` | Marca interna | `Parking_Completo` | Estado `QU` del contador (`true` cuando `CV >= 10`) |
| `Q0.7` | Actuador puerta / barrera | `Barrera_Acceso` | `true` = Abierta / Levantada, `false` = Cerrada |
| `Q0.1` | Lámpara verde | `Semaforo_Verde` | `true` = Libre (acceso permitido) |
| `Q0.2` | Lámpara roja / alarma | `Semaforo_Rojo` | `true` = Completo (acceso denegado) |

---

## 🪜 Estructura de Segmentos KOP

- **Network 1 (Contador CTUD)**:
  - Entrada de rail `CU`: contacto normalmente abierto de `I0.1`.
  - Entrada `CD`: pin configurado a `I0.2`.
  - Salida `QU`: marca interna `M0.0`.
  - Preset `PV`: `10`.
- **Network 2 (Barrera de Acceso)**:
  - Contacto normalmente cerrado `NOT M0.0` activa la bobina `Q0.7`.
- **Network 3 (Semáforo Verde)**:
  - Contacto normalmente cerrado `NOT M0.0` activa la bobina `Q0.1`.
- **Network 4 (Semáforo Rojo)**:
  - Contacto normalmente abierto `M0.0` activa la bobina `Q0.2`.

---

## 🌐 Telemetría WebSocket en Tiempo Real

El servidor WebSocket (`ws://localhost:8080`) transmite en cada ciclo de scan el estado consolidado de entradas, salidas y contadores:

```json
{
  "type": "sync_outputs",
  "inputs": {
    "I0.1": false,
    "I0.2": false
  },
  "outputs": {
    "Q0.1": true,
    "Q0.2": false,
    "Q0.7": true
  },
  "marks": {
    "M0.0": false
  },
  "counters": {
    "M0.0": {
      "cv": 3,
      "pv": 10,
      "cu": false,
      "cd": false,
      "qu": false,
      "qd": false,
      "type": "ctud",
      "outAddr": "M0.0",
      "cuAddr": "I0.1",
      "cdAddr": "I0.2"
    }
  }
}
```

Cualquier simulador o gemelo digital puede simular el paso de coches enviando:
- Para simular coche entrando: `{ "type": "pulse_input", "addr": "I0.1", "durationMs": 150 }`
- Para simular coche saliendo: `{ "type": "pulse_input", "addr": "I0.2", "durationMs": 150 }`
