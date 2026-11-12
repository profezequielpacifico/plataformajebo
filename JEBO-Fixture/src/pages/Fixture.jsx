import { useOutletContext, useSearchParams } from 'react-router-dom';
import FixtureList from '../components/fixture/FixtureList';
import { Cargando, ErrorCarga, SinResultados } from '../components/fixture/StateMessage';
import { agruparPorDisciplina } from '../utils/fixtureGrouping';
import { colorDisciplina } from '../utils/fixtureFormatter';

const VISTAS = [
  { id: 'fecha', texto: 'Por fecha' },
  { id: 'disciplina', texto: 'Por disciplina' }
];

export default function Fixture() {
  const { fixture } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const vista = params.get('vista') === 'disciplina' ? 'disciplina' : 'fecha';

  const elegirVista = (id) => setParams((actual) => {
    const siguiente = new URLSearchParams(actual);
    if (id === 'fecha') siguiente.delete('vista');
    else siguiente.set('vista', id);
    return siguiente;
  }, { replace: true });

  let cuerpo;
  if (fixture.cargando && !fixture.eventos.length) cuerpo = <Cargando />;
  else if (fixture.error && !fixture.eventos.length) cuerpo = <ErrorCarga error={fixture.error} onReintentar={fixture.actualizar} />;
  else if (!fixture.eventos.length) cuerpo = <SinResultados titulo="No hay encuentros para esta selección" texto="Probá con otra región, torneo o etapa." />;
  else if (vista === 'fecha') cuerpo = <FixtureList eventos={fixture.eventos} />;
  else {
    cuerpo = agruparPorDisciplina(fixture.eventos).map(({ disciplina, eventos }) => (
      <section key={disciplina.id} className={`disciplina disciplina--${colorDisciplina(disciplina.id)}`} aria-labelledby={`disc-${disciplina.id}`}>
        <h2 id={`disc-${disciplina.id}`} className="disciplina__titulo">
          {disciplina.nombre}
          <span className="disciplina__cantidad">{eventos.length} {eventos.length === 1 ? 'encuentro' : 'encuentros'}</span>
        </h2>
        <FixtureList eventos={eventos} />
      </section>
    ));
  }

  return (
    <>
      <div className="pagina__encabezado">
        <h1 className="pagina__titulo">Programación general</h1>
        <div className="selector-vista" role="group" aria-label="Organizar programación">
          {VISTAS.map((v) => (
            <button key={v.id} type="button" aria-pressed={vista === v.id} onClick={() => elegirVista(v.id)}>{v.texto}</button>
          ))}
        </div>
      </div>
      {fixture.truncado && (
        <p className="aviso" role="status">Se muestran los primeros {fixture.eventos.length} de {fixture.total} encuentros. Elegí un torneo o una etapa para ver el resto.</p>
      )}
      {cuerpo}
    </>
  );
}
