import MatchCard from './MatchCard';
import ParticipationCard from './ParticipationCard';
import StatusBadge from './StatusBadge';
import EventPlace from './EventPlace';
import { colorDisciplina, esPartido, nombreTorneo } from '../../utils/fixtureFormatter';
import { formatearDiaLargo } from '../../utils/dateFormatter';

export default function FixtureCard({ evento, destacada = false, mostrarFecha = false }) {
  const color = colorDisciplina(evento.disciplina.id);
  const Cuerpo = esPartido(evento) ? MatchCard : ParticipationCard;

  return (
    <article className={`ficha ficha--${color}${destacada ? ' ficha--destacada' : ''}`} data-tipo={evento.tipo}>
      <div className="ficha__tiempo">
        {mostrarFecha && <span className="ficha__dia">{formatearDiaLargo(evento.fecha)}</span>}
        <time className="ficha__hora" dateTime={evento.fecha && evento.hora ? `${evento.fecha}T${evento.hora}` : undefined}>
          {evento.hora || '--:--'}
        </time>
      </div>
      <div className="ficha__cuerpo">
        <header className="ficha__encabezado">
          <h3 className="ficha__torneo">{nombreTorneo(evento.torneo)}</h3>
          {evento.etapa && <span className="ficha__etapa">{evento.etapa.nombre}</span>}
        </header>
        <Cuerpo evento={evento} />
        <footer className="ficha__pie">
          <EventPlace cancha={evento.cancha} />
          <StatusBadge estado={evento.estado} />
        </footer>
      </div>
    </article>
  );
}
