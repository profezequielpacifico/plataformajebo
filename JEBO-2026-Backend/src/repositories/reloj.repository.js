const knex = require('../config/knex');
const { ESTADOS_RELOJ } = require('../constants');

/**
 * Reloj de partido.
 *
 * El tiempo transcurrido no se guarda: se deriva de `reloj_acumulado_seg` mas
 * el tiempo desde `reloj_iniciado_en`. Eso hace que solo `PAUSAR` tenga que
 * escribir algo, y que un reinicio del proceso no pierda tiempo de juego.
 *
 * Los calculos de `now() - reloj_iniciado_en` van en SQL y no en Node por la
 * misma razon que en `evento.repository.js`: el reloj de la base es el que
 * escribe `hora_real`, y si el tiempo de partido se calculara con el reloj de
 * Node cada evento tendria dos marcas de tiempo de relojes distintos.
 */

/** Segundos transcurridos del reloj, tal como los ve la base. */
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

/**
 * INICIAR: arranca el primer segmento. Solo desde PENDIENTE, para que un doble
 * click en "Comenzar" no reinicie un reloj que ya estaba corriendo.
 */
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

/**
 * PAUSAR: acumula lo corrido hasta ahora y cierra el segmento.
 *
 * El `WHERE reloj_estado = 'EN_CURSO'` es lo que hace que la operacion sea
 * idempotente: un segundo click no encuentra la fila y devuelve undefined en
 * vez de sumar otra vez el tiempo ya acumulado.
 *
 * Va como `knex.raw` y no como `.update(knex.raw(...), [bindings])` porque la
 * firma de `update` es `(columna, valor)`: pasarle un raw y un array los
 * interpreta como dos argumentos y knex termina armando un UPDATE con el
 * cliente de la conexion adentro.
 */
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

/** REANUDAR: abre un segmento nuevo arrancando desde lo acumulado. */
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

/**
 * FINALIZADO: cierra el reloj al cerrar el partido. Si estaba corriendo se
 * acumula el tramo abierto; si estaba pausado ya estaba acumulado y no hay nada
 * que sumar. Por eso se permite desde los dos estados, a diferencia de PAUSAR.
 */
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
