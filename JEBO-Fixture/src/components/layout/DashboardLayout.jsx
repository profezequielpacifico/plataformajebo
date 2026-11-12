import { Outlet } from 'react-router-dom';
import Header from './Header';
import FilterBar from '../filters/FilterBar';
import { useFilters } from '../../hooks/useFilters';
import { useFixture } from '../../hooks/useFixture';

export default function DashboardLayout() {
  const { filtros, cambiar, limpiar } = useFilters();
  const fixture = useFixture(filtros);

  return (
    <div className="aplicacion">
      <a className="saltar" href="#contenido">Ir al contenido</a>
      <Header
        ultimaActualizacion={fixture.ultimaActualizacion}
        actualizando={fixture.actualizando}
        onActualizar={fixture.actualizar}
      />
      <FilterBar filtros={filtros} onCambiar={cambiar} onLimpiar={limpiar} />
      <main id="contenido" className="contenido">
        <Outlet context={{ filtros, fixture }} />
      </main>
      <footer className="pie">
        <p>Juegos Escolares Bonaerenses. La información se toma de la plataforma JEBO-2026 y se actualiza sola cada minuto.</p>
      </footer>
    </div>
  );
}
