const knex = require('../config/knex');
const { crud } = require('./crud');
const alcanceService = require('../services/alcance.service');

function baseQuery() {
  return knex('partido as p')
    .select(
      'p.*',
      'el.nombre as equipo_local_nombre',
      'ev.nombre as equipo_visitante_nombre',
      'il.nombre as institucion_local_nombre',
      'iv.nombre as institucion_visitante_nombre',
      'ul.nombre as equipo_local_coach',
      'uv.nombre as equipo_visitante_coach',
      'c.nombre as cancha_nombre',
      'c.link_maps',
      'c.ubicacion as cancha_ubicacion',
      // La cancha no es una columna de `partido`: vive en el slot de

      'dc.id_cancha as id_cancha',
      't.nombre as torneo',
      't.id_disciplina',
      'd.nombre as disciplina_nombre',
      knex.raw("COALESCE(fc.fecha::text, '') as fecha"),
      knex.raw("COALESCE(hc.hora_inicio::text, '') as hora"),
      knex.raw("(SELECT COALESCE(json_agg(json_build_object('id', u.id_usuario, 'nombre', u.nombre, 'rol', sp.rol)), '[]'::json) FROM staff_partido sp JOIN usuario u ON sp.id_usuario = u.id_usuario WHERE sp.id_partido = p.id_partido) as arbitros"),
      // El marcador sale del ledger, no de `p.goles_*`. `v_marcador_partido` es

      knex.raw('COALESCE(m.puntos_local, 0)::int as puntos_local'),
      knex.raw('COALESCE(m.puntos_visitante, 0)::int as puntos_visitante'),
      knex.raw(
        "CASE WHEN p.estado = 'Finalizado' OR p.resultado_cargado = true " +
        'THEN COALESCE(m.puntos_local, 0)::int::text || \' - \' || COALESCE(m.puntos_visitante, 0)::int::text ' +
        'ELSE NULL END as resultado'
      ),
      'p.reloj_estado',
      'p.reloj_iniciado_en',
      'p.reloj_acumulado_seg'
    )
    .leftJoin('v_marcador_partido as m', 'p.id_partido', 'm.id_partido')
    .join('equipo as el', 'p.id_equipo_local', 'el.id_equipo')
    .join('equipo as ev', 'p.id_equipo_visitante', 'ev.id_equipo')
    .join('torneo as t', 'p.id_torneo', 't.id_torneo')
    .leftJoin('disciplina as d', 't.id_disciplina', 'd.id_disciplina')
    .leftJoin('institucion as il', 'el.id_institucion', 'il.id_institucion')
    .leftJoin('institucion as iv', 'ev.id_institucion', 'iv.id_institucion')
    .leftJoin('usuario as ul', 'el.id_usuario', 'ul.id_usuario')
    .leftJoin('usuario as uv', 'ev.id_usuario', 'uv.id_usuario')
    .leftJoin('disponibilidad_cancha as dc', 'p.id_disponibilidad', 'dc.id_disponibilidad')
    .leftJoin('fecha_horario as fh', 'dc.fecha_horario', 'fh.fecha_horario')
    .leftJoin('cancha as c', 'dc.id_cancha', 'c.id_cancha')
    .leftJoin('fecha_cancha as fc', 'fh.id_fecha_cancha', 'fc.id_fecha_cancha')
    .leftJoin('horarios_cancha as hc', 'fh.id_horario_cancha', 'hc.id_horario_cancha');
}

module.exports = {
  findAll: ({ page = 1, limit = 10, id_torneo, id_equipo, fecha_desde, fecha_hasta, estado, id_disciplina, id_usuario_arbitro, alcance } = {}) => {
    const query = baseQuery();

    // Aislamiento por institución (X-05). Un partido enfrenta dos equipos, y

    alcanceService.filtrarPorEquipos(query, alcance, ['p.id_equipo_local', 'p.id_equipo_visitante']);

    if (id_torneo) query.where('p.id_torneo', id_torneo);
    if (id_disciplina) query.where('t.id_disciplina', id_disciplina);
    if (id_equipo) {
      query.where(function () {
        this.where('p.id_equipo_local', id_equipo)
          .orWhere('p.id_equipo_visitante', id_equipo);
      });
    }
    if (id_usuario_arbitro) {
      query.whereExists(function () {
        this.select(1)
          .from('staff_partido as sp2')
          .whereRaw('sp2.id_partido = p.id_partido')
          .where('sp2.id_usuario', id_usuario_arbitro);
      });
    }
    if (fecha_desde) query.where('p.creado_en', '>=', fecha_desde);
    if (fecha_hasta) query.where('p.creado_en', '<=', fecha_hasta);
    if (estado) {
      if (Array.isArray(estado)) {
        query.whereIn('p.estado', estado);
      } else {
        query.where('p.estado', estado);
      }
    }
    query.orderBy('p.creado_en', 'desc');
    return knex.paginate(query, { page, limit });
  },
  findById: (id, { alcance } = {}) =>
    alcanceService
      .filtrarPorEquipos(baseQuery(), alcance, ['p.id_equipo_local', 'p.id_equipo_visitante'])
      .where('p.id_partido', id)
      .first(),
  updateStatus: (id, estado) => knex('partido')
    .where('id_partido', id)
    .update({ estado })
    .returning('*').then(r => r[0]),
  /**
   * Fecha de hoy en la hora en la que se juega el partido.
   *
   * Va en la base a proposito y no en Node: el contenedor de la API corre en
   * UTC y la sesion de Postgres tambien, asi que entre las 21:00 y las 24:00
   * un `new Date()` ya es el dia siguiente. Con eso, el partido programado para
   * HOY se rechazaria todas las noches. `AT TIME ZONE` lleva el instante a la
   * zona del partido, que es la que mira el arbitro.
   *
   * Sale como texto `YYYY-MM-DD` para compararlo contra `fecha_cancha.fecha`,
   * que tambien es texto. Comparar dos fechas de calendario asi evita por
   * completo el corrimiento de zona horaria.
   */
  fechaDeHoy: () => knex.raw(
    "SELECT (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date::text AS hoy"
  ).then(r => r.rows[0].hoy),
  /**
   * Sella el resultado al cerrar el partido, copiandolo del ledger.
   *
   * `goles_local`/`goles_visitante` quedan como foto congelada para los
   * reportes que ya los leen, pero el valor sale de `v_marcador_partido` y no
   * de lo que mande el cliente. Es la UNICA escritura de estas columnas en todo
   * el sistema: por eso van tambien en la lista de `bloquear` de mas abajo,
   * para que ningun PUT las reintroduzca por la puerta de atras.
   */
  cerrarResultado: (id) => knex.raw(`
    UPDATE partido p
    SET goles_local     = COALESCE(m.puntos_local, 0),
        goles_visitante = COALESCE(m.puntos_visitante, 0),
        resultado_cargado = true
    FROM v_marcador_partido m
    WHERE m.id_partido = p.id_partido
      AND p.id_partido = ?
    RETURNING p.*
  `, [id]).then(r => r.rows[0]),
  ...crud('partido', 'id_partido', [
    'resultado_cargado',
    'creado_en',
    'actualizado_en',
    // El marcador no se escribe desde el cliente: se deriva del ledger.
    'goles_local',
    'goles_visitante',
    // El reloj solo se mueve por `RelojRepository`, que acumula en PAUSAR.
    'reloj_estado',
    'reloj_iniciado_en',
    'reloj_acumulado_seg'
  ])
};
