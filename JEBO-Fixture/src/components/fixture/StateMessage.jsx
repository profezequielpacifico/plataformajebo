export function Cargando({ texto = 'Cargando la programación…' }) {
  return (
    <div className="mensaje mensaje--cargando" role="status">
      <span className="barras-carga" aria-hidden="true"><i /><i /><i /><i /></span>
      {texto}
    </div>
  );
}

export function SinResultados({ titulo, texto, accion }) {
  return (
    <div className="mensaje">
      <p className="mensaje__titulo">{titulo}</p>
      {texto && <p>{texto}</p>}
      {accion}
    </div>
  );
}

export function ErrorCarga({ error, onReintentar }) {
  return (
    <div className="mensaje mensaje--error" role="alert">
      <p className="mensaje__titulo">No se pudo cargar la programación</p>
      <p>{error?.message || 'Error desconocido'}. Revisá tu conexión y volvé a intentar.</p>
      <button type="button" className="boton" onClick={onReintentar}>Reintentar</button>
    </div>
  );
}
