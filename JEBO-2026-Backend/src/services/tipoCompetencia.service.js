const knex = require('../config/knex');
const { BusinessError } = require('../utils/errors');

/**
 * Tipo de competencia de un torneo: `MARCADOR` o `EVALUACION`.
 *
 * Vive en `disciplina.tipo_competencia` y decide de qué modelo se compite:
 *
 *   - `MARCADOR`   → fútbol, futsal, voley. Se juega un `partido` entre dos
 *                    equipos, con marcador, reloj y arbitraje.
 *   - `EVALUACION` → Gimnasia Artística. No hay partido: hay un encuentro
 *                    (`presentacion`) donde un equipo se presenta solo y lo
 *                    evalúa un jurado con una planilla.
 *
 * Que la columna exista no alcanza: hace falta que todos los caminos de
 * escritura la respeten, y no alcanzaba. `POST /matches` y el generador de
 * fixture aceptaban cualquier torneo, así que con dos tríos inscriptos se
 * armaba un round-robin de local/visitante para un torneo de Gimnasia. Este
 * módulo es el punto único donde se resuelve el tipo, para que la validación
 * sea la misma en todos lados y el mensaje sea el mismo.
 *
 * Devuelve `null` si el torneo no existe o no tiene disciplina. Los llamadores
 * NO deben tratar eso como error: la FK o el `NotFoundError` del torneo ya se
 * encargan, y tirar acá un "tipo desconocido" taparía el mensaje real.
 */
async function tipoDeTorneo(idTorneo) {
  if (!idTorneo) return null;

  return knex('torneo as t')
    .leftJoin('disciplina as d', 'd.id_disciplina', 't.id_disciplina')
    .select('t.nombre as torneo_nombre', 'd.tipo_competencia', 'd.nombre as disciplina_nombre')
    .where('t.id_torneo', idTorneo)
    .first();
}

/**
 * Corta la escritura de un `partido` en un torneo que no se juega con marcador.
 *
 * Va en el servicio y no solo en el trigger de la base porque el trigger
 * devuelve un error de Postgres opaco; acá el mensaje dice qué hacer en su
 * lugar. Los dos existen: el trigger para scripts y SQL directo, este para la
 * aplicación.
 *
 * @throws {BusinessError} 409 si el torneo es de tipo EVALUACION.
 */
async function assertTorneoAceptaPartidos(idTorneo) {
  const info = await tipoDeTorneo(idTorneo);
  if (!info || info.tipo_competencia !== 'EVALUACION') return info;

  throw new BusinessError(
    `El torneo "${info.torneo_nombre}" es de ${info.disciplina_nombre} y no tiene partidos: ` +
    'sus encuentros se cargan en Presentaciones, donde cada equipo se presenta solo y lo evalúa un jurado.'
  );
}

module.exports = {
  tipoDeTorneo,
  assertTorneoAceptaPartidos,
};
