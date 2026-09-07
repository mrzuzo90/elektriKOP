# Bridge ElektriKOP ⇄ Factory I/O

Este módulo permite conectar **ElektriKOP** (que corre en tu navegador) con el simulador 3D industrial **Factory I/O** (que corre en Windows o máquina virtual) mediante un puente **WebSocket ⇄ Modbus TCP**.

---

## 🚀 Inicio Rápido

### 1. Instalar dependencias del Bridge
Desde la carpeta raíz del proyecto:
```bash
cd bridge
npm install
```

---

## 🧪 Modo Simulación (Mock) — ¡Pruébalo en Mac sin Windows!

Si estás en macOS o aún no tienes Factory I/O instalado, puedes arrancar el puente en **modo Mock**:
```bash
npm run mock
```

En este modo:
- El bridge simula una escena 3D con una **cinta transportadora** controlada por `Q0.0` y un **sensor óptico** en `I0.1`.
- Cuando ElektriKOP activa la bobina `Q0.0`, el simulador avanza una caja virtual.
- A los ~2 segundos de movimiento, el sensor `I0.1` se activa automáticamente (¡caja detectada!) y se apaga cuando pasa de largo.
- Todo se refleja en vivo en la consola y en ElektriKOP.

---

## 🏭 Modo Real: Conexión con Factory I/O

### 1. Configurar Factory I/O (en Windows o Máquina Virtual)

1. Abre **Factory I/O**.
2. Abre cualquier escena (ej. *From A to B*, *Sorting by Height*, o una escena propia).
3. Ve a **File > Drivers** (`F4`).
4. En el desplegable de drivers, selecciona **Modbus TCP/IP Server**.
5. Pulsa en **Configuration**:
   - **Host**: `0.0.0.0` (o `127.0.0.1` si el bridge corre en la misma máquina).
   - **Port**: `502` (puerto estándar Modbus).
   - **Digital Inputs (Discrete Inputs)**: `10` (Offset: 0).
   - **Digital Outputs (Coils)**: `10` (Offset: 0).
   - **Analog Inputs (Input Registers)**: `1` (Offset: 0) — opcional para `IW0`.
6. Vuelve a la pantalla de Drivers y arrastra los elementos:
   - En **Coils** (Salidas que ElektriKOP enviará a Factory I/O):
     - `0`: Cinta transportadora (`Conveyor`) ➔ Corresponde a `Q0.0`.
     - `1`: Empujador / Actuador ➔ Corresponde a `Q0.1`.
     - `2..9`: Otras salidas (`Q0.2` a `Q1.1`).
   - En **Discrete Inputs** (Sensores que Factory I/O enviará a ElektriKOP):
     - `0`: Pulsador Marcha ➔ Corresponde a `I0.0`.
     - `1`: Sensor óptico / presencia ➔ Corresponde a `I0.1`.
     - `2..9`: Otros sensores o finales de carrera (`I0.2` a `I1.1`).
7. Haz clic en el botón de **Play** de Factory I/O para iniciar la simulación de la planta.

---

### 2. Iniciar el Bridge

#### Si Factory I/O está en la misma máquina:
```bash
npm start
```

#### Si Factory I/O está en una Máquina Virtual (Parallels / UTM / VMware) o en otro PC:
Pasa la IP de la máquina Windows mediante el argumento `--modbus-host`:
```bash
node index.js --modbus-host 192.168.1.50
```
*(o define la variable de entorno `MODBUS_HOST=192.168.1.50 npm start`)*.

---

### 3. Conectar en ElektriKOP

1. Abre ElektriKOP en tu navegador.
2. Abre el **Menú de pausa** (clic en el logo ElektriKOP) o el botón **🔌 Factory I/O** en la barra lateral.
3. Comprueba que la dirección sea `ws://localhost:8080` y pulsa **Conectar**.
4. Verás el indicador en verde: **🟢 Conectado**.
5. ¡Pon el PLC en **RUN** y programa tus segmentos Ladder!
