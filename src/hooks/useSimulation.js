import { useEffect, useRef, useState } from "react";
import { OUTPUT_ADDR, SCAN_MS } from "../utils/constants";
import { applyWiring } from "../utils/plcIO";
import { computeScanTick } from "../utils/scanCycle";

function zeroOutputs() {
  return Object.fromEntries(OUTPUT_ADDR.map((a) => [a, false]));
}

// Encapsula el ciclo de scan del PLC: lee entradas + salidas previas,
// ejecuta los segmentos en orden y escribe las salidas resultantes. Se
// dispara tanto desde el intervalo de RUN como desde el botón de PASO
// (stepOnce) — misma lógica, distinto disparador.
export function useSimulation({ inputs, rungs, deviceMap, wiringMap, soundOn }) {
  const [running, setRunning] = useState(false);
  const [outputs, setOutputs] = useState(zeroOutputs);
  const [timerDisplay, setTimerDisplay] = useState({});
  const [scanCount, setScanCount] = useState(0);

  const inputsRef = useRef(inputs);
  inputsRef.current = inputs;
  const rungsRef = useRef(rungs);
  rungsRef.current = rungs;
  const deviceMapRef = useRef(deviceMap);
  deviceMapRef.current = deviceMap;
  const wiringMapRef = useRef(wiringMap);
  wiringMapRef.current = wiringMap;
  const soundOnRef = useRef(soundOn);
  soundOnRef.current = soundOn;

  const outputsRef = useRef(outputs);
  const timersRef = useRef({});
  const audioCtxRef = useRef(null);
  const prevAlarmRef = useRef({});

  const ensureAudio = () => {
    if (!audioCtxRef.current) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtxRef.current = new AC();
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  };

  const beep = () => {
    if (!soundOnRef.current) return;
    const ctx = ensureAudio();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = 880;
      gain.gain.value = 0.05;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      /* audio no disponible en este entorno, se ignora en silencio */
    }
  };

  const checkAlarms = (nextOutputs) => {
    Object.keys(nextOutputs).forEach((addr) => {
      if (deviceMapRef.current[addr] === "alarma") {
        const wasOn = prevAlarmRef.current[addr] || false;
        const isOn = nextOutputs[addr];
        if (isOn && !wasOn) beep();
        prevAlarmRef.current[addr] = isOn;
      }
    });
  };

  const runScanTick = () => {
    const mem = { ...applyWiring(inputsRef.current, wiringMapRef.current), ...outputsRef.current };
    const { outputs: nextOutputs, timers: nextTimerDisplay } = computeScanTick(rungsRef.current, mem, timersRef.current);

    timersRef.current = nextTimerDisplay;
    outputsRef.current = nextOutputs;
    setOutputs(nextOutputs);
    setTimerDisplay(nextTimerDisplay);
    setScanCount((n) => n + 1);
    checkAlarms(nextOutputs);
  };

  const stepOnce = () => {
    setRunning(false);
    ensureAudio();
    runScanTick();
  };

  // Scan Cycle
  useEffect(() => {
    if (!running) return;
    const id = setInterval(runScanTick, SCAN_MS);
    return () => clearInterval(id);
  }, [running]);

  const resetSimulation = () => {
    setRunning(false);
    const zeroOut = zeroOutputs();
    setOutputs(zeroOut);
    outputsRef.current = zeroOut;
    timersRef.current = {};
    setTimerDisplay({});
    setScanCount(0);
    prevAlarmRef.current = {};
  };

  // Al borrar un segmento hay que limpiar también su temporizador TON
  // acumulado, para que no quede memoria residual si más adelante se
  // reutiliza el mismo id.
  const clearTimer = (rungId) => {
    delete timersRef.current[rungId];
  };

  return { running, setRunning, outputs, timerDisplay, scanCount, stepOnce, resetSimulation, clearTimer };
}
