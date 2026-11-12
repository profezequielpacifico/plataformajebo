import { etiquetaRol } from '../../utils/fixtureFormatter';

export default function ParticipationCard({ evento }) {
  if (evento.equipos.length === 0) {
    return <p className="participacion participacion--vacia">Participantes a confirmar</p>;
  }
  return (
    <ul className="participacion">
      {evento.equipos.map((equipo) => (
        <li key={equipo.id} className="participacion__item">
          <span className="participacion__nombre">{equipo.nombre}</span>
          <span className="participacion__detalle">
            {[etiquetaRol(equipo.rol), equipo.institucion !== equipo.nombre ? equipo.institucion : null].filter(Boolean).join(', ')}
          </span>
        </li>
      ))}
    </ul>
  );
}
