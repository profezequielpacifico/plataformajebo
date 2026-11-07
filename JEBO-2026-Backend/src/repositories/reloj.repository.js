const knex = require('../config/knex');
const { ESTADOS_RELOJ } = require('../constants');

const segundosActuales = (id_partido) =>
  knex('partido as p')
    .select(
      'p.reloj_estado',
      'p.reloj_iniciado_en',
      'p.reloj_acumulado_seg',
      knex.raw(`
        CASE
          WHEN p.reloj_estado = 'EN_CURSO' AND p.reloj_iniciado_en IS NOT NULL
            THEN p.reloj_acumulado_seg
                 + FLOOR(EXTRACT(EPOCH FROM (now() - p.reloj_iniciado_en)))::int
          ELSE p.reloj_acumulado_seg
        END AS segundos_actuales
      `)
    )
    .where('p.id_partido', id_partido)
    .first();

const iniciar = (id_partido) =>
  knex('partido')
    .where('id_partido', id_partido)
    .where('reloj_estado', ESTADOS_RELOJ.PENDIENTE)
    .update({
      reloj_estado: ESTADOS_RELOJ.EN_CURSO,
      reloj_iniciado_en: knex.fn.now(),
      reloj_acumulado_seg: 0
    })
    .returning('*')
    .then((r) => r[0]);

const pausar = (id_partido) =>
  knex.raw(
    `
    UPDATE partido
    SET reloj_acumulado_seg = reloj_acumulado_seg
                            + FLOOR(EXTRACT(EPOCH FROM (now() - reloj_iniciado_en)))::int,
        reloj_iniciado_en   = NULL,
        reloj_estado        = ?
    WHERE id_partido = ?
      AND reloj_estado = ?
    RETURNING *
    `,
    [ESTADOS_RELOJ.PAUSADO, id_partido, ESTADOS_RELOJ.EN_CURSO]
  ).then((r) => r.rows[0]);

const reanudar = (id_partido) =>
  knex('partido')
    .where('id_partido', id_partido)
    .where('reloj_estado', ESTADOS_RELOJ.PAUSADO)
    .update({
      reloj_estado: ESTADOS_RELOJ.EN_CURSO,
      reloj_iniciado_en: knex.fn.now()
    })
    .returning('*')
    .then((r) => r[0]);

const finalizar = (id_partido) =>
  knex.raw(
    `
    UPDATE partido
    SET reloj_acumulado_seg = reloj_acumulado_seg
      + CASE
          WHEN reloj_estado = 'EN_CURSO' AND reloj_iniciado_en IS NOT NULL
            THEN FLOOR(EXTRACT(EPOCH FROM (now() - reloj_iniciado_en)))::int
          ELSE 0
        END,
        reloj_iniciado_en = NULL,
        reloj_estado        = ?
    WHERE id_partido = ?
      AND reloj_estado IN (?, ?)
    RETURNING *
    `,
    [ESTADOS_RELOJ.FINALIZADO, id_partido, ESTADOS_RELOJ.EN_CURSO, ESTADOS_RELOJ.PAUSADO]
  ).then((r) => r.rows[0]);

module.exports = {
  segundosActuales,
  iniciar,
  pausar,
  reanudar,
  finalizar
};
