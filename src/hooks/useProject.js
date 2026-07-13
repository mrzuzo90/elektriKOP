import { useEffect, useRef, useState } from "react";
import { newRung, bumpUidPastImportedRungs } from "../utils/ladderTree";

const STORAGE_KEY = "elektrikop.autosave.v1";
const HISTORY_LIMIT = 50;
const COALESCE_MS = 600;
const AUTOSAVE_DEBOUNCE_MS = 800;

function initialProject() {
  return {
    projectName: "Proyecto ELEE0109",
    rungs: [newRung(0)],
    deviceMap: {},
    wiringMap: {},
    symbols: {},
  };
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.rungs) || data.rungs.length === 0) return null;
    return {
      projectName: data.projectName || "Proyecto ELEE0109",
      rungs: data.rungs,
      deviceMap: data.deviceMap || {},
      wiringMap: data.wiringMap || {},
      symbols: data.symbols || {},
    };
  } catch {
    return null;
  }
}

// Encapsula el estado "de proyecto" (nombre, segmentos, dispositivos,
// cableado, símbolos), su serialización a/desde JSON, su historial de
// deshacer/rehacer y su autoguardado en localStorage. La simulación
// (inputs/outputs/timers) vive aparte en useSimulation.
export function useProject() {
  // Se lee localStorage una sola vez, de forma síncrona, para poder sembrar
  // tanto el estado inicial como el aviso de "restaurado" sin parpadeo.
  const loadedOnceRef = useRef(undefined);
  if (loadedOnceRef.current === undefined) {
    loadedOnceRef.current = loadFromStorage();
    if (loadedOnceRef.current) bumpUidPastImportedRungs(loadedOnceRef.current.rungs);
  }

  const [project, setProjectState] = useState(() => loadedOnceRef.current || initialProject());
  const [restoredFromAutosave, setRestoredFromAutosave] = useState(() => !!loadedOnceRef.current);
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef(null);

  const projectRef = useRef(project);
  projectRef.current = project;
  const pendingBeforeRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  // Empuja al historial el estado "de antes" de la ráfaga de cambios en
  // curso (ver applyChange) — se llama al vencer el debounce, o a mano
  // justo antes de deshacer/rehacer para no perder una edición a medias.
  const commitPending = () => {
    if (pendingBeforeRef.current !== null) {
      const snapshot = pendingBeforeRef.current;
      pendingBeforeRef.current = null;
      setPast((p) => [...p.slice(-(HISTORY_LIMIT - 1)), snapshot]);
    }
  };

  // Punto único por el que pasa toda mutación del proyecto. Ráfagas rápidas
  // de cambios (p.ej. teclear en el comentario de un segmento) se
  // "coalescen" en un solo paso de historial mientras no pase más de
  // COALESCE_MS entre una y la siguiente.
  const applyChange = (patch) => {
    if (pendingBeforeRef.current === null) pendingBeforeRef.current = projectRef.current;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(commitPending, COALESCE_MS);
    if (future.length) setFuture([]);
    setProjectState((prev) => ({ ...prev, ...patch }));
  };

  const undo = () => {
    commitPending();
    clearTimeout(debounceRef.current);
    if (past.length === 0) return;
    const prevSnapshot = past[past.length - 1];
    setFuture([project, ...future]);
    setPast(past.slice(0, -1));
    setProjectState(prevSnapshot);
  };

  const redo = () => {
    if (future.length === 0) return;
    const nextSnapshot = future[0];
    setPast([...past, project]);
    setFuture(future.slice(1));
    setProjectState(nextSnapshot);
  };

  // Refs con los últimos undo/redo para poder suscribir el listener de
  // teclado una sola vez (igual que el patrón *Ref de useSimulation.js) sin
  // reengancharlo en cada tecla.
  const undoRef = useRef(undo);
  undoRef.current = undo;
  const redoRef = useRef(redo);
  redoRef.current = redo;

  useEffect(() => {
    const onKeyDown = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        undoRef.current();
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        redoRef.current();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Autoguardado: se persiste el proyecto en localStorage tras un breve
  // silencio, para no escribir en cada tecla. Si no hay localStorage
  // disponible (modo privado, cuota superada...) se ignora en silencio.
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
      } catch {
        /* localStorage no disponible */
      }
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [project]);

  const setProjectName = (name) => applyChange({ projectName: name });
  const setRungs = (rungs) => applyChange({ rungs });
  const setDeviceType = (addr, type) => applyChange({ deviceMap: { ...projectRef.current.deviceMap, [addr]: type } });
  const setWiringFor = (addr, wiring) => applyChange({ wiringMap: { ...projectRef.current.wiringMap, [addr]: wiring } });
  const setSymbolFor = (addr, name) => applyChange({ symbols: { ...projectRef.current.symbols, [addr]: name } });

  const exportProject = () => {
    const data = { version: 1, ...project };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(project.projectName || "proyecto").replace(/[^a-z0-9_-]+/gi, "_")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importProject = (file, { onSuccess } = {}) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || !Array.isArray(data.rungs) || data.rungs.length === 0) {
          throw new Error("El archivo no tiene el formato esperado (falta 'rungs').");
        }
        bumpUidPastImportedRungs(data.rungs);
        // Importar es como abrir un documento nuevo: no debe poder
        // deshacerse hacia el proyecto que había antes.
        clearTimeout(debounceRef.current);
        pendingBeforeRef.current = null;
        setPast([]);
        setFuture([]);
        setProjectState({
          projectName: data.projectName || "Proyecto importado",
          rungs: data.rungs,
          deviceMap: data.deviceMap || {},
          wiringMap: data.wiringMap || {},
          symbols: data.symbols || {},
        });
        setImportError("");
        setRestoredFromAutosave(false);
        onSuccess?.();
      } catch (e) {
        setImportError("No se pudo importar: " + e.message);
      }
    };
    reader.onerror = () => setImportError("No se pudo leer el archivo.");
    reader.readAsText(file);
  };

  return {
    projectName: project.projectName, setProjectName,
    rungs: project.rungs, setRungs,
    deviceMap: project.deviceMap, setDeviceType,
    wiringMap: project.wiringMap, setWiringFor,
    symbols: project.symbols, setSymbolFor,
    importError,
    exportProject, importProject,
    fileInputRef,
    undo, redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    restoredFromAutosave,
    dismissRestoredNotice: () => setRestoredFromAutosave(false),
  };
}
