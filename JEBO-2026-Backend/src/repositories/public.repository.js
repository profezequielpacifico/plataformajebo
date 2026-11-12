const knex = require('../config/knex');

const ZONA_HORARIA = 'America/Argentina/Buenos_Aires';

const equiposDeRegion = (idRegion) => knex('equipo as er')
  .select('er.id_equipo')
  .leftJoin('institucion as ir', 'er.id_institucion', 'ir.id_institucion')
  .join('localidad as lr', 'lr.id_localidad', knex.raw('COALESCE(er.id_localidad, ir.id_localidad)'))
  .where('lr.id_region', idRegion);

const instanciasDeRegion = (idRegion) => knex('etapa_instancia_territorio as eit')
  .select('eit.id_etapa_instancia')
  .where('eit.id_region', idRegion);

const partidoEnRegion = (alias, idRegion) => function () {
  this.whereIn(`${alias}.id_equipo_local`, equiposDeRegion(idRegion))
    .orWhereIn(`${alias}.id_equipo_visitante`, equiposDeRegion(idRegion))
    .orWhereIn(`${alias}.id_etapa_instancia`, instanciasDeRegion(idRegion));
};

const presentacionEnRegion = (alias, idRegion) => function () {
  this.whereIn(`${alias}.id_etapa_instancia`, instanciasDeRegion(idRegion))
    .orWhereExists(function () {
      this.select(1).from('presentacion_participante as ppr')
        .whereRaw(`ppr.id_presentacion = ${alias}.id_presentacion`)
        .whereIn('ppr.id_equipo', equiposDeRegion(idRegion));
    });
};

const torneoConEventosEnRegion = (idRegion) => function () {
  this.whereExists(function () {
    this.select(1).from('partido as pr')
      .whereRaw('pr.id_torneo = t.id_torneo')
      .where(partidoEnRegion('pr', idRegion));
  }).orWhereExists(function () {
    this.select(1).from('presentacion as ps')
      .whereRaw('ps.id_torneo = t.id_torneo')
      .where(presentacionEnRegion('ps', idRegion));
  });
};

const unirCancha = (query, columnaDisponibilidad) => query
  .leftJoin('disponibilidad_cancha as dc', columnaDisponibilidad, 'dc.id_disponibilidad')
  .leftJoin('cancha as c', 'dc.id_cancha', 'c.id_cancha')
  .leftJoin('fecha_horario as fh', 'dc.fecha_horario', 'fh.fecha_horario')
  .leftJoin('fecha_cancha as fc', 'fh.id_fecha_cancha', 'fc.id_fecha_cancha')
  .leftJoin('horarios_cancha as hc', 'fh.id_horario_cancha', 'hc.id_horario_cancha');

const COLUMNAS_COMUNES = [
  't.id_torneo',
  't.nombre as torneo_nombre',
  't.categoria as torneo_categoria',
  'd.id_disciplina',
  'd.nombre as disciplina_nombre',
  'd.tipo_competencia',
  'et.id_etapa',
  'et.nombre as etapa_nombre',
  'et.orden as etapa_orden',
  'c.id_cancha',
  'c.nombre as cancha_nombre',
  'c.ubicacion as cancha_ubicacion',
  'c.link_maps as cancha_link_maps'
];

const partidos = ({ id_region, id_disciplina, id_torneo, id_etapa, desde, hasta } = {}) => {
  const query = knex('partido as p')
    .select(
      'p.id_partido as id',
      'p.estado',
      'p.resultado_cargado',
      ...COLUMNAS_COMUNES,
      'el.id_equipo as local_id',
      'el.nombre as local_nombre',
      'il.nombre as local_institucion',
      'ev.id_equipo as visitante_id',
      'ev.nombre as visitante_nombre',
      'iv.nombre as visitante_institucion',
      knex.raw('fc.fecha::text as fecha'),
      knex.raw("to_char(hc.hora_inicio, 'HH24:MI') as hora"),
      knex.raw('COALESCE(m.puntos_local, 0)::int as puntos_local'),
      knex.raw('COALESCE(m.puntos_visitante, 0)::int as puntos_visitante')
    )
    .join('torneo as t', 'p.id_torneo', 't.id_torneo')
    .join('disciplina as d', 't.id_disciplina', 'd.id_disciplina')
    .join('equipo as el', 'p.id_equipo_local', 'el.id_equipo')
    .join('equipo as ev', 'p.id_equipo_visitante', 'ev.id_equipo')
    .leftJoin('institucion as il', 'el.id_institucion', 'il.id_institucion')
    .leftJoin('institucion as iv', 'ev.id_institucion', 'iv.id_institucion')
    .leftJoin('etapa as et', 'p.id_etapa', 'et.id_etapa')
    .leftJoin('v_marcador_partido as m', 'p.id_partido', 'm.id_partido');
  unirCancha(query, 'p.id_disponibilidad');

  if (id_disciplina) query.where('t.id_disciplina', id_disciplina);
  if (id_torneo) query.where('p.id_torneo', id_torneo);
  if (id_etapa) query.where('p.id_etapa', id_etapa);
  if (desde) query.where('fc.fecha', '>=', desde);
  if (hasta) query.where('fc.fecha', '<=', hasta);
  if (id_region) query.where(partidoEnRegion('p', id_region));
  return query;
};

const FECHA_PRESENTACION = `COALESCE(to_char(ps.fecha_hora AT TIME ZONE '${ZONA_HORARIA}', 'YYYY-MM-DD'), fc.fecha::text)`;
const HORA_PRESENTACION = `COALESCE(to_char(ps.fecha_hora AT TIME ZONE '${ZONA_HORARIA}', 'HH24:MI'), to_char(hc.hora_inicio, 'HH24:MI'))`;

const presentaciones = ({ id_region, id_disciplina, id_torneo, id_etapa, desde, hasta } = {}) => {
  const query = knex('presentacion as ps')
    .select(
      'ps.id_presentacion as id',
      'ps.estado',
      'ps.orden',
      ...COLUMNAS_COMUNES,
      knex.raw(`${FECHA_PRESENTACION} as fecha`),
      knex.raw(`${HORA_PRESENTACION} as hora`),
      knex.raw(`(
        SELECT COALESCE(json_agg(json_build_object(
          'id', e.id_equipo,
          'nombre', e.nombre,
          'institucion', i.nombre,
          'rol', pp.rol,
          'orden_salida', pp.orden_salida
        ) ORDER BY pp.orden_salida), '[]'::json)
        FROM presentacion_participante pp
        JOIN equipo e ON e.id_equipo = pp.id_equipo
        LEFT JOIN institucion i ON i.id_institucion = e.id_institucion
        WHERE pp.id_presentacion = ps.id_presentacion
      ) as participantes`)
    )
    .join('torneo as t', 'ps.id_torneo', 't.id_torneo')
    .join('disciplina as d', 't.id_disciplina', 'd.id_disciplina')
    .leftJoin('etapa as et', 'ps.id_etapa', 'et.id_etapa');
  unirCancha(query, 'ps.id_disponibilidad');

  if (id_disciplina) query.where('t.id_disciplina', id_disciplina);
  if (id_torneo) query.where('ps.id_torneo', id_torneo);
  if (id_etapa) query.where('ps.id_etapa', id_etapa);
  if (desde) query.whereRaw(`${FECHA_PRESENTACION} >= ?`, [desde]);
  if (hasta) query.whereRaw(`${FECHA_PRESENTACION} <= ?`, [hasta]);
  if (id_region) query.where(presentacionEnRegion('ps', id_region));
  return query;
};

module.exports = {
  regiones: () => knex('region').select('id_region', 'nombre').orderBy('nombre'),

  disciplinas: () => knex('disciplina')
    .select('id_disciplina', 'nombre', 'tipo_competencia')
    .orderBy('nombre'),

  torneos: ({ id_region, id_disciplina } = {}) => {
    const query = knex('torneo as t')
      .select(
        't.id_torneo',
        't.nombre',
        't.categoria',
        't.estado',
        knex.raw('t.fecha_inicio::text as fecha_inicio'),
        knex.raw('t.fecha_fin::text as fecha_fin'),
        'd.id_disciplina',
        'd.nombre as disciplina_nombre',
        'd.tipo_competencia'
      )
      .join('disciplina as d', 't.id_disciplina', 'd.id_disciplina')
      .orderBy([{ column: 'd.nombre' }, { column: 't.nombre' }]);
    if (id_disciplina) query.where('t.id_disciplina', id_disciplina);
    if (id_region) query.where(torneoConEventosEnRegion(id_region));
    return query;
  },

  torneoExiste: (id) => knex('torneo').select('id_torneo').where('id_torneo', id).first(),

  etapas: (idTorneo) => knex('etapa')
    .select(
      'id_etapa',
      'id_torneo',
      'nombre',
      'orden',
      'estado',
      'es_final',
      knex.raw('fecha_inicio::text as fecha_inicio'),
      knex.raw('fecha_fin::text as fecha_fin')
    )
    .where('id_torneo', idTorneo)
    .orderBy('orden'),

  partidos,

  presentaciones
};
