import { useState } from 'react';
import HmiEditor from './HmiEditor';
import HmiRuntime from './HmiRuntime';
import './hmi.css';
export default function HmiWorkspace({ hmi, onChange, tags, symbols, undo, redo, canUndo, canRedo, running, onToggleRun }) {
  const [editing, setEditing] = useState(true);
  return <section className="hmi-workspace" aria-label="Diseñador HMI">
    <header className="hmi-toolbar hmi-header"><div><h2>OPERADOR / HMI</h2><span>{editing ? 'Diseño de pantallas' : 'Conectado al PLC simulado'}</span></div>
      <div className="hmi-mode"><button aria-pressed={editing} onClick={() => setEditing(true)}>Editar HMI</button><button aria-pressed={!editing} onClick={() => setEditing(false)}>Ejecutar HMI</button></div>
    </header>
    {editing && <div className="hmi-toolbar"><button onClick={undo} disabled={!canUndo}>⟲ Deshacer</button><button onClick={redo} disabled={!canRedo}>⟳ Rehacer</button><span>Guardado automático en el proyecto</span></div>}
    {editing ? <HmiEditor hmi={hmi} onChange={onChange} tags={tags} symbols={symbols} running={running} onToggleRun={onToggleRun} /> : <HmiRuntime hmi={hmi} tags={tags} running={running} onToggleRun={onToggleRun} />}
  </section>;
}
