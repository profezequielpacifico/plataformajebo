import { NavLink, useLocation } from 'react-router-dom';
import logo from '../../assets/logo-jebo.webp';
import { formatearHoraDeInstante } from '../../utils/dateFormatter';

const conFiltros = (search, pathname) => {
  const params = new URLSearchParams(search);
  params.delete('vista');
  const texto = params.toString();
  return { pathname, search: texto ? `?${texto}` : '' };
};

export default function Header({ ultimaActualizacion, actualizando, onActualizar }) {
  const { search } = useLocation();
  return (
    <header className="encabezado">
      <div className="encabezado__interior">
        <NavLink to={conFiltros(search, '/')} className="encabezado__marca" aria-label="JEBO Fixture, inicio">
          <img src={logo} alt="" width="120" height="34" />
          <span className="encabezado__producto">Fixture</span>
        </NavLink>
        <nav className="encabezado__nav" aria-label="Secciones">
          <NavLink to={conFiltros(search, '/')} end>Inicio</NavLink>
          <NavLink to={conFiltros(search, '/programacion')}>Programación</NavLink>
        </nav>
        <div className="encabezado__estado">
          <span className="encabezado__hora" aria-live="polite">
            {actualizando
              ? 'Actualizando…'
              : ultimaActualizacion
                ? `Actualizado ${formatearHoraDeInstante(ultimaActualizacion)}`
                : ''}
          </span>
          <button type="button" className="boton-actualizar" onClick={onActualizar} disabled={actualizando}>
            <svg viewBox="0 0 20 20" aria-hidden="true" className={actualizando ? 'girando' : undefined}>
              <path d="M16 10a6 6 0 1 1-1.76-4.24M16 4v3.5h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Actualizar
          </button>
        </div>
      </div>
    </header>
  );
}
