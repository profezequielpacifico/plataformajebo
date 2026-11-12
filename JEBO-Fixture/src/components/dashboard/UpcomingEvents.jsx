import FixtureList from '../fixture/FixtureList';
import { SinResultados } from '../fixture/StateMessage';

export default function UpcomingEvents({ eventos, titulo, vacio }) {
  return (
    <section className="seccion" aria-labelledby={`seccion-${titulo}`}>
      <h2 id={`seccion-${titulo}`} className="seccion__titulo">{titulo}</h2>
      {eventos.length ? <FixtureList eventos={eventos} /> : <SinResultados titulo={vacio} />}
    </section>
  );
}
