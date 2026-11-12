import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="mensaje">
      <p className="mensaje__titulo">Esta página no existe</p>
      <p>Puede que el enlace esté mal escrito o que la página se haya movido.</p>
      <Link className="boton" to="/">Volver al inicio</Link>
    </div>
  );
}
