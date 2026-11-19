const knex = require('../config/knex');

const EN_JUEGO = 'EN_JUEGO';
const CERRADO = 'CERRADO';

const puntosDe = (columnaEquipo, columnaCongelada) => `
  CASE WHEN pp.estado = '${EN_JUEGO}' THEN (
    SELECT count(*) FROM evento_partido e
     WHERE e.id_partido = pp.id_partido AND e.numero_periodo = pp.numero
       AND e.id_equipo = p.${columnaEquipo}
       AND e.estado = 'CONFIRMADO' AND e.tipo_evento = 'ANOTACION'
  ) ELSE pp.${columnaCongelada} END::int`;

const consulta = (db) =>
  db('partido_periodo as pp')
    .join('partido as p', 'p.id_partido', 'pp.id_partido')
    .select(
      'pp.id_partido_periodo',
      'pp.id_partido',
      'pp.numero',
      'pp.estado',
      'pp.id_equipo_ganador',
      'pp.cerrado_por',
      'pp.cerrado_en',
      db.raw(`${puntosDe('id_equipo_local', 'puntos_local')} AS puntos_local`),
      db.raw(`${puntosDe('id_equipo_visitante', 'puntos_visitante')} AS puntos_visitante`)
    );

module.exports = {
  EN_JUEGO,
  CERRADO,

  listar: (id_partido, db = knex) =>
    consulta(db).where('pp.id_partido', id_partido).orderBy('pp.numero'),

  enJuego: (id_partido, db = knex) =>
    consulta(db).where('pp.id_partido', id_partido).where('pp.estado', EN_JUEGO).first(),

  abrir: (id_partido, numero, db = knex) =>
    db('partido_periodo')
      .insert({ id_partido, numero, estado: EN_JUEGO })
      .returning('*')
      .then((r) => r[0]),

  cerrar: (id_partido_periodo, { puntos_local, puntos_visitante, id_equipo_ganador, cerrado_por }, db = knex) =>
    db('partido_periodo')
      .where('id_partido_periodo', id_partido_periodo)
      .where('estado', EN_JUEGO)
      .update({
        estado: CERRADO,
        puntos_local,
        puntos_visitante,
        id_equipo_ganador,
        cerrado_por,
        cerrado_en: knex.fn.now()
      })
      .returning('*')
      .then((r) => r[0]),

  tieneSets: (id_partido, db = knex) =>
    db('partido_periodo')
      .where('id_partido', id_partido)
      .first('id_partido_periodo')
      .then(Boolean),

  contarEventos: (id_partido, db = knex) =>
    db('evento_partido')
      .where('id_partido', id_partido)
      .count('* as n')
      .first()
      .then((r) => Number(r.n))
};
