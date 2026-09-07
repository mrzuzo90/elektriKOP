# Master Prompt: ElektriKOP Pixel Twin (Simulador de Garaje con CTUD)

Copia y pega todo el contenido de este archivo en el primer mensaje de la nueva sesión:

---

```markdown
# PROYECTO: ElektriKOP Pixel Twin (Simulador Visual 2D Isometric Pixel Art - Escena Garaje)

Quiero crear un nuevo proyecto web llamado `elektrikop-pixel-twin` (usando Vite + React o Canvas HTML5 ligero con sprites). Es un simulador visual interactivo estilo "gemelo digital retro" que se comunica en tiempo real por WebSocket con nuestro emulador de PLC **ElektriKOP** a través de su bridge (`ws://localhost:8080`).

---

## 🎯 1. EL PROYECTO REAL DE PLC QUE ESTAMOS REPLICANDO

En ElektriKOP ya tenemos programada la lógica Ladder (KOP) del garaje con un contador bidireccional **CTUD**:

### Estructura de Segmentos en ElektriKOP:
- **Network 1 (Contador CTUD)**:
  - **CU (Cuenta Arriba)**: Pin principal cableado a `I0.1` (Sensor / Pulsador de Entrada).
  - **CD (Cuenta Abajo)**: Pin cableado a `I0.2` (Sensor / Pulsador de Salida).
  - **PV (Preset Value)**: `10` (Capacidad máxima de plazas).
  - **QU (Salida Contador Lleno)**: Escribe en la marca interna `M0.0`.
  - **CV (Current Value)**: Plazas ocupadas actuales (0 a 10).
- **Network 2 (Barrera de Acceso)**:
  - Contacto normalmente cerrado `NOT M0.0` activa la bobina `Q0.7` (Barrera de acceso).
  - Mientras `M0.0` está en 0 (hay plazas): `Q0.7 = true` ➔ **Barrera ABIERTA**.
  - Si `M0.0` está en 1 (lleno): `Q0.7 = false` ➔ **Barrera CERRADA**.
- **Network 3 (Semáforo Verde)**:
  - Contacto normalmente cerrado `NOT M0.0` activa la bobina `Q0.1` (Semáforo Verde).
  - Mientras `M0.0` está en 0 (hay plazas): `Q0.1 = true` ➔ **Semáforo VERDE ENCENDIDO**.
- **Network 4 (Semáforo Rojo)**:
  - Contacto normalmente abierto `M0.0` activa la bobina `Q0.2` (Semáforo Rojo).
  - Si `M0.0` está en 1 (lleno): `Q0.2 = true` ➔ **Semáforo ROJO ENCENDIDO (COMPLETO)**.

---

## 🎨 2. ESTÉTICA VISUAL: ESTILO HABBO HOTEL
- **Perspectiva**: Isométrica retro (proyección dimétrica 2:1 clásica de Habbo Hotel y juegos de los 2000).
- **Estilo**: Pixel art 32-bit nítido, con contornos oscuros (dark outlines), colores vivos y planos, sombreado simple sin degradados suaves ni antialiasing borroso (`image-rendering: pixelated; image-rendering: crisp-edges;`).
- **Cero formas geométricas por código**: Los coches, la barrera, el semáforo, el fondo y el cartel deben ser **sprites PNG con fondo transparente** generados con IA (Nano Banana 2).

---

## 🔌 3. PROTOCOLO WEBSOCKET BIDIRECCIONAL (`ws://localhost:8080`)

### A) Recibir datos de ElektriKOP (Telemetría en tiempo real):
El bridge envía a todos los clientes conectados el siguiente JSON en cada scan cycle:
```json
{
  "type": "sync_outputs",
  "outputs": {
    "Q0.1": true,  // Semáforo VERDE (true = encendido)
    "Q0.2": false, // Semáforo ROJO (true = encendido / parking lleno)
    "Q0.7": true   // Barrera de acceso (true = levantada/abierta, false = bajada/cerrada)
  },
  "marks": {
    "M0.0": false  // Estado QU del contador (false = plazas disponibles, true = completo)
  },
  "counters": {
    "M0.0": {
      "cv": 3,     // <--- CURRENT VALUE: plazas ocupadas actuales (mostrar en el cartel)
      "pv": 10,    // <--- PRESET VALUE: plazas totales
      "qu": false, // true si cv >= pv
      "qd": false, // true si cv <= 0
      "type": "ctud"
    }
  },
  "timestamp": 1725732000000
}
```

### B) Enviar acciones a ElektriKOP (Simulador ➔ PLC):
Cuando un coche entra o sale en el simulador, envía un pulso limpio al bridge:
- **Coche entra (CU)**:
  ```json
  { "type": "pulse_input", "addr": "I0.1", "durationMs": 150 }
  ```
- **Coche sale (CD)**:
  ```json
  { "type": "pulse_input", "addr": "I0.2", "durationMs": 150 }
  ```
*(El bridge y ElektriKOP activan la entrada `I0.1` o `I0.2` a `true` y la apagan a los 150ms, disparando el flanco de subida del CTUD de forma fiable)*.

---

## 🚗 4. DINÁMICA DE LA SIMULACIÓN VISUAL

1. **Cartel Digital de Plazas**:
   - Muestra el valor en vivo de `counters["M0.0"].cv` y `counters["M0.0"].pv`.
   - Ejemplo: `"PLAZAS: 3 / 10"` o `"LIBRES: 7"`. Si está lleno (`M0.0 == true`), muestra `"COMPLETO"` parpadeando.
2. **Semáforo**:
   - Sprite verde cuando `outputs["Q0.1"] === true`.
   - Sprite rojo cuando `outputs["Q0.2"] === true`.
3. **Barrera**:
   - Sprite levantada cuando `outputs["Q0.7"] === true`.
   - Sprite bajada cuando `outputs["Q0.7"] === false`.
4. **Flujo de Coches**:
   - Botón interactivo "Entrar coche" (o spawn automático si la barrera está abierta):
     - Un coche avanza por la rampa isométrica.
     - Al cruzar la barrera, dispara el pulso `{ "type": "pulse_input", "addr": "I0.1" }`.
     - El PLC actualiza `cv` de 3 a 4, y el cartel sube a 4.
     - Si llega al tope (10): el PLC apaga `Q0.7` y `Q0.1`, enciende `Q0.2`. La barrera baja y el semáforo se pone rojo. Si llegan más coches, se paran en cola.
   - Botón interactivo "Salir coche":
     - Un coche sale del interior del garaje por el carril de salida.
     - Dispara el pulso `{ "type": "pulse_input", "addr": "I0.2" }`.
     - El PLC decrementa `cv` de 10 a 9. `M0.0` se apaga, `Q0.7` vuelve a `true` (barrera sube), `Q0.1` vuelve a verde y el primer coche en espera puede entrar.

---

## 🖼️ 5. PROMPTS PARA NANO BANANA 2 (SPRITES PNG TRANSPARENTES)

Guárdalos en `/public/sprites/garage/`:

1. **Escenario / Entrada Garaje (`background.png`)**:
   > `Habbo Hotel style isometric parking garage entrance with security booth, asphalt ramp, lane dividers, concrete wall, retro 32-bit pixel art, 2:1 dimetric projection, vibrant nostalgic palette, clean dark outlines, transparent background`

2. **Barrera de Acceso (`barrier_open.png` y `barrier_closed.png`)**:
   > `Habbo hotel style parking boom barrier gate, 32-bit isometric pixel art, red and white striped arm, orange motor cabinet, 2 states: open vertical and closed horizontal, dark outlines, transparent background`

3. **Semáforo (`traffic_green.png`, `traffic_red.png`)**:
   > `Habbo hotel style parking traffic light post with glowing green lens and glowing red lens, isometric pixel art, metallic housing, dark outlines, transparent background`

4. **Coches (`car_in_blue.png`, `car_in_red.png`, `car_out_yellow.png`)**:
   > `Habbo hotel style retro boxy isometric cars, 2:1 perspective facing southeast for entering, northwest for exiting, cute glossy finish, dark outlines, transparent background`

5. **Cartel Contador LED (`led_display_panel.png`)**:
   > `Habbo hotel style digital parking LED sign board showing numbers, dark metal frame, retro green 7-segment display, isometric pixel art, transparent background`

---

## 🛠️ 6. PASOS DE DESARROLLO
1. Scaffolding del proyecto con Vite (`npm create vite@latest elektrikop-pixel-twin`).
2. Configurar cliente WebSocket a `ws://localhost:8080` que lea `outputs`, `marks`, `counters` y envíe `pulse_input`.
3. Motor de renderizado con capas de sprites en coordenadas isométricas.
4. Incluir sprites placeholders temporales (siluetas pixel art) para que todo sea interactivo y comprobable antes de añadir los PNGs de Nano Banana 2.
5. Panel lateral con botones manuales para forzar entrada/salida y ver el JSON del PLC en vivo.
```
