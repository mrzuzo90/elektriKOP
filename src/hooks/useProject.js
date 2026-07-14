import { useEffect, useRef, useState } from "react";
import { bumpUidPastImportedBlocks } from "../utils/ladderTree";
import {
  newBlock,
  addBlock as addBlockPure,
  renameBlock as renameBlockPure,
  removeBlock as removeBlockPure,
  setBlockRungs as setBlockRungsPure,
  addParam as addParamPure,
  renameParam as renameParamPure,
  removeParam as removeParamPure,
} from "../utils/blocks";
import { CURRENT_VERSION, migrateProjectData } from "../utils/projectFormat";

const STORAGE_KEY = "elektrikop.autosave.v1";
const HISTORY_LIMIT = 50;
const COALESCE_MS = 600;
const AUTOSAVE_DEBOUNCE_MS = 800;

function initialProject() {
  return {
    projectName: "Proyecto ELEE0109",
    blocks: [newBlock("main")],
    deviceMap: {},
    wiringMap: {},
    symbols: {},
  };
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const migrated = migrateProjectData(JSON.parse(raw));
    if (!migrated) return null;
    return {
      projectName: migrated.projectName || "Proyecto ELEE0109",
      blocks: migrated.blocks,
      deviceMap: migrated.deviceMap || {},
      wiringMap: migrated.wiringMap || {},
      symbols: migrated.symbols || {},
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
    if (loadedOnceRef.current) bumpUidPastImportedBlocks(loadedOnceRef.current.blocks);
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
  const setDeviceType = (addr, type) => applyChange({ deviceMap: { ...projectRef.current.deviceMap, [addr]: type } });
  const setWiringFor = (addr, wiring) => applyChange({ wiringMap: { ...projectRef.current.wiringMap, [addr]: wiring } });
  const setSymbolFor = (addr, name) => applyChange({ symbols: { ...projectRef.current.symbols, [addr]: name } });

  const addBlock = () => applyChange({ blocks: addBlockPure(projectRef.current.blocks) });
  const renameBlock = (blockId, name) => applyChange({ blocks: renameBlockPure(projectRef.current.blocks, blockId, name) });
  const removeBlock = (blockId) => applyChange({ blocks: removeBlockPure(projectRef.current.blocks, blockId) });
  const setBlockRungs = (blockId, rungs) => applyChange({ blocks: setBlockRungsPure(projectRef.current.blocks, blockId, rungs) });
  const addParam = (blockId, direction, name) => applyChange({ blocks: addParamPure(projectRef.current.blocks, blockId, direction, name) });
  const renameParam = (blockId, direction, paramId, name) => applyChange({ blocks: renameParamPure(projectRef.current.blocks, blockId, direction, paramId, name) });
  const removeParam = (blockId, direction, paramId) => applyChange({ blocks: removeParamPure(projectRef.current.blocks, blockId, direction, paramId) });

  const exportProject = () => {
    const data = { version: CURRENT_VERSION, ...project };
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

  // Vacía el proyecto (segmentos, dispositivos, cableado y símbolos) sin
  // tocar el nombre. Mismo tratamiento de historial que importProject: al
  // ser equivalente a abrir un documento nuevo, no debe poder deshacerse
  // hacia lo que había antes.
  const clearProject = () => {
    clearTimeout(debounceRef.current);
    pendingBeforeRef.current = null;
    setPast([]);
    setFuture([]);
    setProjectState((prev) => ({
      projectName: prev.projectName,
      blocks: [newBlock("main")],
      deviceMap: {},
      wiringMap: {},
      symbols: {},
    }));
    setImportError("");
    setRestoredFromAutosave(false);
  };

  const importProject = (file, { onSuccess } = {}) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const migrated = migrateProjectData(JSON.parse(reader.result));
        if (!migrated) {
          throw new Error("El archivo no tiene el formato esperado (falta 'rungs' o 'blocks').");
        }
        bumpUidPastImportedBlocks(migrated.blocks);
        // Importar es como abrir un documento nuevo: no debe poder
        // deshacerse hacia el proyecto que había antes.
        clearTimeout(debounceRef.current);
        pendingBeforeRef.current = null;
        setPast([]);
        setFuture([]);
        setProjectState({
          projectName: migrated.projectName || "Proyecto importado",
          blocks: migrated.blocks,
          deviceMap: migrated.deviceMap || {},
          wiringMap: migrated.wiringMap || {},
          symbols: migrated.symbols || {},
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
    blocks: project.blocks,
    addBlock, renameBlock, removeBlock, setBlockRungs,
    addParam, renameParam, removeParam,
    deviceMap: project.deviceMap, setDeviceType,
    wiringMap: project.wiringMap, setWiringFor,
    symbols: project.symbols, setSymbolFor,
    importError,
    exportProject, importProject, clearProject,
    fileInputRef,
    undo, redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    restoredFromAutosave,
    dismissRestoredNotice: () => setRestoredFromAutosave(false),
  };
}
