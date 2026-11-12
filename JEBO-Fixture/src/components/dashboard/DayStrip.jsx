import { colorDisciplina } from '../../utils/fixtureFormatter';
import { formatearDiaCorto, formatearDiaLargo, sumarDias } from '../../utils/dateFormatter';

const DIAS_ANTES = 3;
const DIAS = 14;

export default function DayStrip({ eventos, hoy }) {
  const desde = sumarDias(hoy, -DIAS_ANTES);
  const dias = Array.from({ length: DIAS }, (_, i) => sumarDias(desde, i)).map((fecha) => {
    const delDia = eventos.filter((e) => e.fecha === fecha);
    const porDisciplina = new Map();
    for (const e of delDia) {
      const actual = porDisciplina.get(e.disciplina.id) || { nombre: e.disciplina.nombre, cantidad: 0 };
      actual.cantidad += 1;
      porDisciplina.set(e.disciplina.id, actual);
    }
    return { fecha, total: delDia.length, segmentos: [...porDisciplina.entries()] };
  });

  const maximo = Math.max(1, ...dias.map((d) => d.total));
  const disciplinas = new Map(eventos.map((e) => [e.disciplina.id, e.disciplina.nombre]));

  return (
    <figure className="tira">
      <ol className="tira__dias">
        {dias.map(({ fecha, total, segmentos }) => {
          const descripcion = `${formatearDiaLargo(fecha, hoy)}: ${total === 0 ? 'sin encuentros' : `${total} ${total === 1 ? 'encuentro' : 'encuentros'}`}`;
          return (
            <li key={fecha} className={`tira__dia${fecha === hoy ? ' tira__dia--hoy' : ''}${fecha < hoy ? ' tira__dia--pasado' : ''}`} aria-label={descripcion} title={descripcion}>
              <span className="tira__total" aria-hidden="true">{total || ''}</span>
              <span className="tira__barra" style={{ '--alto': `${(total / maximo) * 100}%` }} aria-hidden="true">
                {segmentos.map(([id, s]) => (
                  <span key={id} className={`tira__segmento color--${colorDisciplina(id)}`} style={{ flexGrow: s.cantidad }} />
                ))}
              </span>
              <span className="tira__etiqueta" aria-hidden="true">
                <span>{formatearDiaCorto(fecha).inicial}</span>
                <span className="tira__numero">{formatearDiaCorto(fecha).numero}</span>
              </span>
            </li>
          );
        })}
      </ol>
      {disciplinas.size > 0 && (
        <figcaption className="tira__leyenda">
          {[...disciplinas.entries()].map(([id, nombre]) => (
            <span key={id}><i className={`color--${colorDisciplina(id)}`} aria-hidden="true" />{nombre}</span>
          ))}
        </figcaption>
      )}
    </figure>
  );
}
