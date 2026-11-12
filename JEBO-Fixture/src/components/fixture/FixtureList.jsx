import FixtureCard from './FixtureCard';
import { agruparPorDia } from '../../utils/fixtureGrouping';
import { formatearDiaLargo, formatearFecha } from '../../utils/dateFormatter';

export default function FixtureList({ eventos, agrupar = true }) {
  if (!agrupar) {
    return (
      <div className="lista-fichas">
        {eventos.map((e) => <FixtureCard key={e.clave} evento={e} mostrarFecha />)}
      </div>
    );
  }

  return (
    <div className="programa">
      {agruparPorDia(eventos).map(({ fecha, eventos: delDia }) => (
        <section key={fecha || 'sin-fecha'} className="programa__dia" aria-labelledby={`dia-${fecha || 'sin-fecha'}`}>
          <h3 id={`dia-${fecha || 'sin-fecha'}`} className="programa__titulo">
            {formatearDiaLargo(fecha)}
            {fecha && <span className="programa__fecha">{formatearFecha(fecha)}</span>}
          </h3>
          <div className="lista-fichas">
            {delDia.map((e) => <FixtureCard key={e.clave} evento={e} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
