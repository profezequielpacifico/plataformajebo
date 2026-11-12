const Equipo = ({ equipo, lado }) => (
  <div className={`enfrentamiento__equipo enfrentamiento__equipo--${lado}`}>
    <span className="enfrentamiento__nombre">{equipo.nombre}</span>
    {equipo.institucion && equipo.institucion !== equipo.nombre && (
      <span className="enfrentamiento__institucion">{equipo.institucion}</span>
    )}
  </div>
);

export default function MatchCard({ evento }) {
  const [local, visitante] = evento.equipos;
  const { resultado } = evento;
  const etiqueta = resultado
    ? `${local.nombre} ${resultado.local}, ${visitante.nombre} ${resultado.visitante}`
    : `${local.nombre} contra ${visitante.nombre}`;

  return (
    <div className="enfrentamiento" aria-label={etiqueta}>
      <Equipo equipo={local} lado="local" />
      <div className={`enfrentamiento__centro${resultado ? ' enfrentamiento__centro--marcador' : ''}`} aria-hidden="true">
        {resultado ? (
          <>
            <span>{resultado.local}</span>
            <span className="enfrentamiento__guion">–</span>
            <span>{resultado.visitante}</span>
          </>
        ) : (
          <span className="enfrentamiento__vs">vs</span>
        )}
      </div>
      <Equipo equipo={visitante} lado="visitante" />
    </div>
  );
}
