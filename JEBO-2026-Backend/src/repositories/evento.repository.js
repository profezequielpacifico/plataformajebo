const knex = require('../config/knex');

/**
 * Ledger de eventos del partido.
 *
 * El INSERT del evento NO se arma con `knex('evento_partido').insert(...)` a
 * mano por dos motivos:
 *
 * 1. El numero de evento (`numero_evento`) y el tiempo de partido
 *    (`segundos_partido`) tienen que salir de la MISMA lectura del reloj que
 *    la base usa para `hora_real`. Si `segundos_partido` se calculara en Node
 *    con `Date.now()` y `hora_real` lo pone `CURRENT_TIMESTAMP`, cada partido
 *    tendria dos relojes distintos, con la deriva del servidor incluida.
 *
 * 2. `numero_evento` sale de un MAX() + 1, que tiene una carrera clasica: dos
 *    arbitros registrando en paralelo leen el mismo MAX. Por eso
 *    `registrar` corre dentro de una transaccion que toma
 *    `pg_advisory_xact_lock` sobre el id de partido, que serializa las
 *    escrituras de un mismo partido sin bloquear los de otros. El unique de
 *    (id_partido, numero_evento) queda como red: si algo se escapa, la
 *    transaccion falla en vez de duplicar numeros en silencio.
 *
 * `numero_evento`, `segundos_partido` y `hora_real` no se aceptan desde el
 * body: los deriva esta misma sentencia. Un arbitro no puede retroadatar un
 * gol ni pedir que le toque el numero 14.
 */

const baseQuery = () =>
  knex('evento_partido as e')
    .select(
      'e.*',
      'eq.nombre as equipo_nombre',
      'ua.nombre as arbitro_nombre',
      'ur.nombre as registrado_por_nombre',
      'uan.nombre as anulado_por_nombre',
      'sp.rol as arbitro_rol'
    )
    .join('equipo as eq', 'e.id_equipo', 'eq.id_equipo')
    .leftJoin('usuario as ua', 'e.id_usuario_arbitro', 'ua.id_usuario')
    .leftJoin('usuario as ur', 'e.registrado_por', 'ur.id_usuario')
    .leftJoin('usuario as uan', 'e.anulado_por', 'uan.id_usuario')
    .leftJoin('staff_partido as sp', function () {
      this.on('sp.id_partido', 'e.id_partido').andOn('sp.id_usuario', 'e.id_usuario_arbitro');
    });

module.exports = {
  findByPartido: ({ id_partido, page = 1, limit = 50 } = {}) => {
    const q = baseQuery()
      .where('e.id_partido', id_partido)
      .orderBy('e.numero_evento', 'desc');
    return knex.paginate(q, { page, limit });
  },

  findById: (id_evento) =>
    baseQuery()
      .where('e.id_evento', id_evento)
      .first(),

  /**
   * Registra un evento. Toda la lectura de reloj y la numeracion ocurren en una
   * sola sentencia SQL, y el caller debe haber abierto la transaccion.
   */
  registrar: async (knexTx, { id_partido, id_equipo, id_usuario_arbitro, registrado_por, idempotency_key }) =>
    knexTx.raw(
      `
      WITH reloj AS (
        SELECT
          p.id_partido,
          CASE
            WHEN p.reloj_estado = 'EN_CURSO' AND p.reloj_iniciado_en IS NOT NULL
              THEN p.reloj_acumulado_seg
                   + FLOOR(EXTRACT(EPOCH FROM (now() - p.reloj_iniciado_en)))::int
            ELSE p.reloj_acumulado_seg
          END AS segundos
        FROM partido p
        WHERE p.id_partido = ?
      ),
      numero AS (
        SELECT COALESCE(MAX(numero_evento), 0) + 1 AS n
        FROM evento_partido
        WHERE id_partido = ?
      )
      INSERT INTO evento_partido (
        id_partido, numero_evento, tipo_evento, id_equipo,
        id_usuario_arbitro, registrado_por, segundos_partido,
        idempotency_key, estado
      )
      SELECT
        ?, numero.n, 'ANOTACION', ?, ?, ?,
        reloj.segundos, ?, 'CONFIRMADO'
      FROM reloj, numero
      RETURNING *
      `,
      [
        id_partido,
        id_partido,
        id_partido,
        id_equipo,
        id_usuario_arbitro,
        registrado_por,
        idempotency_key || null
      ]
    ).then((r) => r.rows[0]),

  /**
   * Busca un evento previo con la misma clave de idempotencia, para responder
   * con el ya creado en vez de insertar un segundo gol por un doble tap o un
   * retry de red.
   */
  findByIdempotencyKey: (id_partido, idempotency_key) =>
    baseQuery()
      .where('e.id_partido', id_partido)
      .where('e.idempotency_key', idempotency_key)
      .first(),

  /**
   * Anula un evento. Nunca se borra: la trazabilidad vale mas que la
   * comodidad de un DELETE, y el marcador se recalcula solo porque es un COUNT
   * sobre los CONFIRMADOS.
   */
  anular: (id_evento, { anulado_por, motivo_anulacion }) =>
    knex('evento_partido')
      .where('id_evento', id_evento)
      .update({
        estado: 'ANULADO',
        anulado_por,
        anulado_en: knex.fn.now(),
        motivo_anulacion
      })
      .returning('*')
      .then((r) => r[0]),

  countByPartido: (id_partido) =>
    knex('evento_partido')
      .where('id_partido', id_partido)
      .where('estado', 'CONFIRMADO')
      .count('* as n')
      .first()
};
