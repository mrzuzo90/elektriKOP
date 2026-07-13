import { useRef, useState } from "react";
import { newRung, bumpUidPastImportedRungs } from "../utils/ladderTree";

// Encapsula el estado "de proyecto" (nombre, segmentos, dispositivos,
// cableado, símbolos) y su serialización a/desde JSON. La simulación
// (inputs/outputs/timers) vive aparte en useSimulation — al importar, quien
// llama a importProject decide cómo resetearla via onSuccess.
export function useProject() {
  const [projectName, setProjectName] = useState("Proyecto ELEE0109");
  const [rungs, setRungs] = useState([newRung(0)]);
  const [deviceMap, setDeviceMap] = useState({});
  const [wiringMap, setWiringMap] = useState({});
  const [symbols, setSymbols] = useState({});
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef(null);

  const setDeviceType = (addr, type) => setDeviceMap((prev) => ({ ...prev, [addr]: type }));
  const setWiringFor = (addr, wiring) => setWiringMap((prev) => ({ ...prev, [addr]: wiring }));
  const setSymbolFor = (addr, name) => setSymbols((prev) => ({ ...prev, [addr]: name }));

  const exportProject = () => {
    const data = { version: 1, projectName, rungs, deviceMap, wiringMap, symbols };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(projectName || "proyecto").replace(/[^a-z0-9_-]+/gi, "_")}.json`;
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
        setProjectName(data.projectName || "Proyecto importado");
        setRungs(data.rungs);
        setDeviceMap(data.deviceMap || {});
        setWiringMap(data.wiringMap || {});
        setSymbols(data.symbols || {});
        setImportError("");
        onSuccess?.();
      } catch (e) {
        setImportError("No se pudo importar: " + e.message);
      }
    };
    reader.onerror = () => setImportError("No se pudo leer el archivo.");
    reader.readAsText(file);
  };

  return {
    projectName, setProjectName,
    rungs, setRungs,
    deviceMap, setDeviceType,
    wiringMap, setWiringFor,
    symbols, setSymbolFor,
    importError,
    exportProject, importProject,
    fileInputRef,
  };
}
