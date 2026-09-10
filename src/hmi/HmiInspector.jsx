import { bindingType, tagCatalog } from './bindings';
import { clampGeometry } from './model';
export default function HmiInspector({ component: c, screens, symbols, catalog, onChange, onDelete }) {
  if (!c) return <aside className="hmi-inspector"><h3>Propiedades</h3><p>Selecciona un componente del lienzo.</p></aside>;
  const type = bindingType(c.type);
  const options = (catalog || tagCatalog(symbols)).filter(t => {
    if (t.type !== type) return false;
    if (c.type === 'setpoint' && t.writable === false) return false;
    if (c.type === 'timer') return t.group === 'Temporizadores';
    if (c.type === 'counter') return t.group === 'Contadores';
    return true;
  });
  const source = options.find(t => t.address === c.tag);
  return <aside className="hmi-inspector" aria-label="Propiedades del componente">
    <h3>Propiedades</h3>
    <label>Etiqueta<input value={c.label} onChange={e => onChange({ label: e.target.value })} /></label>
    <div className="hmi-geometry">{[['x', 'X'], ['y', 'Y'], ['width', 'Ancho'], ['height', 'Alto']].map(([key, name]) =>
      <label key={key}>{name}<input type="number" value={c[key]} onChange={e => {
        if (e.target.value !== '') onChange(clampGeometry({ ...c, [key]: Number(e.target.value) }));
      }} /></label>)}</div>
    {type && <label>Tag ({type})<select value={c.tag} onChange={e => onChange({ tag: e.target.value })}>
      <option value="">Sin asignar</option>
      {c.tag && !options.some(t => t.address === c.tag) && <option value={c.tag}>{c.tag} (incompatible)</option>}
      {[...new Set(options.map(t => t.group))].map(group => <optgroup key={group} label={group}>
        {options.filter(t => t.group === group).map(t => <option key={t.address} value={t.address}>{t.label}</option>)}
      </optgroup>)}
    </select></label>}
    {c.type === 'number' && <>
      <label>Decimales<select value={c.decimals ?? 'auto'} onChange={e => onChange({ decimals: e.target.value === 'auto' ? null : Number(e.target.value) })}>
        <option value="auto">Automático</option>{[0, 1, 2, 3].map(n => <option key={n} value={n}>{n}</option>)}
      </select></label>
      <label>Unidad<input value={c.unit || ''} placeholder={source?.unit || 'Ej. piezas, %'} onChange={e => onChange({ unit: e.target.value })} /></label>
      {source?.writable === false && <p className="hmi-source-description">{source.label}<br />Solo lectura. «—» indica que no se ha ejecutado en el último scan o se ha reiniciado la simulación.</p>}
    </>}
    {c.type === 'bar' && <>
      <div className="hmi-geometry">
        <label>Mínimo<input type="number" value={c.min ?? 0} onChange={e => onChange({ min: Number(e.target.value) })} /></label>
        <label>Máximo<input type="number" value={c.max ?? 100} onChange={e => onChange({ max: Number(e.target.value) })} /></label>
      </div>
      <label>Orientación<select value={c.orientation || 'horizontal'} onChange={e => onChange({ orientation: e.target.value })}>
        <option value="horizontal">Horizontal</option>
        <option value="vertical">Vertical</option>
      </select></label>
    </>}
    {c.type === 'alarm' && <p>Parpadea mientras el tag esté activo en Ejecutar HMI.</p>}
    {c.type === 'setpoint' && <p>Rango: 0–100. Enter o salir del campo para aplicar.</p>}
    {c.type === 'timer' && <p>Muestra el tiempo transcurrido (ET) y la consigna (PT) con barra de avance gráfico.</p>}
    {c.type === 'counter' && <p>Muestra el valor de conteo (CV) y objetivo (PV) con indicador de límite alcanzado.</p>}
    {['Q', 'M'].some(prefix => c.tag.startsWith(prefix)) && ['toggle', 'momentary'].includes(c.type) && <p>El programa puede sobrescribir este tag en el siguiente scan.</p>}
    {c.type === 'navigation' && <label>Pantalla destino<select value={c.targetScreenId} onChange={e => onChange({ targetScreenId: e.target.value })}>
      <option value="">Sin asignar</option>
      {c.targetScreenId && !screens.some(s => s.id === c.targetScreenId) && <option value={c.targetScreenId}>Pantalla eliminada</option>}
      {screens.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
    </select></label>}
    {[
      ['foreground', 'Texto'],
      ['background', ['lamp', 'alarm'].includes(c.type) ? 'Aro' : 'Fondo'],
      ...(['lamp', 'alarm', 'toggle'].includes(c.type) ? [['offColor', 'Apagado'], ['onColor', 'Encendido']] : []),
      ...(['timer', 'counter', 'bar'].includes(c.type) ? [['barColor', 'Barra']] : [])
    ].map(([key, name]) =>
      <label className="hmi-color" key={key}>{name}<input type="color" value={c[key]} onChange={e => onChange({ [key]: e.target.value })} /></label>)}
    <button className="hmi-danger" onClick={onDelete}>Eliminar componente</button>
  </aside>;
}
