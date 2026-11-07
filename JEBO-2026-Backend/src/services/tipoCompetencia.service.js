const knex = require('../config/knex');
const { BusinessError } = require('../utils/errors');

async function tipoDeTorneo(idTorneo) {
  if (!idTorneo) return null;

  return knex('torneo as t')
    .leftJoin('disciplina as d', 'd.id_disciplina', 't.id_disciplina')
    .select('t.nombre as torneo_nombre', 'd.tipo_competencia', 'd.nombre as disciplina_nombre')
    .where('t.id_torneo', idTorneo)
    .first();
}

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
