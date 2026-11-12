import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import SummaryCard from '../components/dashboard/SummaryCard';
import DayStrip from '../components/dashboard/DayStrip';
import UpcomingEvents from '../components/dashboard/UpcomingEvents';
import FixtureCard from '../components/fixture/FixtureCard';
import { Cargando, ErrorCarga } from '../components/fixture/StateMessage';
import { enJuego, proximos, ultimosResultados } from '../utils/fixtureGrouping';
import { hoyEnArgentina } from '../utils/dateFormatter';

const CANTIDAD_PROXIMOS = 12;

export default function Dashboard() {
  const { fixture } = useOutletContext();
  const [params] = useSearchParams();
  const hoy = hoyEnArgentina();

  if (fixture.cargando && !fixture.eventos.length) return <Cargando />;
  if (fixture.error && !fixture.eventos.length) return <ErrorCarga error={fixture.error} onReintentar={fixture.actualizar} />;

  const vivos = enJuego(fixture.eventos);
  const siguientes = proximos(fixture.eventos, hoy).filter((e) => e.estado !== 'EN_JUEGO');
  const destacado = vivos[0] || siguientes[0];
  const resultados = ultimosResultados(fixture.eventos);

  return (
    <>
      {fixture.error && (
        <p className="aviso" role="status">No se pudo actualizar: {fixture.error.message}. Se muestran los últimos datos cargados.</p>
      )}

      <section className="portada" aria-labelledby="portada-titulo">
        <div className="portada__texto">
          <h1 id="portada-titulo" className="portada__titulo">
            {destacado
              ? destacado.estado === 'EN_JUEGO' ? 'Se está jugando' : 'Próximo encuentro'
              : 'No hay encuentros próximos'}
          </h1>
          {destacado
            ? <FixtureCard evento={destacado} destacada mostrarFecha />
            : <p className="portada__vacio">Cuando JEBO-2026 programe nuevos encuentros para esta selección, van a aparecer acá.</p>}
        </div>
        <div className="portada__datos">
          <DayStrip eventos={fixture.eventos} hoy={hoy} />
          <SummaryCard resumen={fixture.resumen} />
        </div>
      </section>

      {vivos.length > 1 && (
        <UpcomingEvents titulo="En juego ahora" eventos={vivos.slice(1)} vacio="" />
      )}

      <UpcomingEvents
        titulo="Próximos encuentros"
        eventos={siguientes.filter((e) => e !== destacado).slice(0, CANTIDAD_PROXIMOS)}
        vacio="No hay más encuentros programados para esta selección."
      />

      {siguientes.length > CANTIDAD_PROXIMOS + 1 && (
        <p className="ver-mas">
          <Link to={{ pathname: '/programacion', search: params.toString() }}>Ver la programación completa</Link>
        </p>
      )}

      {resultados.length > 0 && (
        <section className="seccion" aria-labelledby="seccion-resultados">
          <h2 id="seccion-resultados" className="seccion__titulo">Últimos resultados</h2>
          <div className="lista-fichas">
            {resultados.map((e) => <FixtureCard key={e.clave} evento={e} mostrarFecha />)}
          </div>
        </section>
      )}
    </>
  );
}
