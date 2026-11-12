export default function SelectFilter({ id, etiqueta, valor, opciones, todos, onCambiar, deshabilitado, cargando }) {
  return (
    <div className="filtro">
      <label htmlFor={id}>{etiqueta}</label>
      <select
        id={id}
        value={valor ?? ''}
        disabled={deshabilitado}
        aria-busy={cargando || undefined}
        onChange={(e) => onCambiar(e.target.value ? Number(e.target.value) : undefined)}
      >
        <option value="">{cargando ? 'Cargando…' : todos}</option>
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>{o.texto}</option>
        ))}
      </select>
    </div>
  );
}
