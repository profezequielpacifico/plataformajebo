const { HTTP_STATUS } = require('../constants');
const equipoService = require('../services/equipo.service');
const inscripcionService = require('../services/inscripcion.service');
const knex = require('../config/knex');
const alcanceService = require('../services/alcance.service');
const autorizacionService = require('../services/autorizacion.service');
const { formatResponse, formatPaginatedResponse, soloCampos, bindAll } = require('../utils');
const { BusinessError } = require('../utils/errors');

// `id_usuario` entra en la lista a propósito: el frontend lo manda y el

const CAMPOS_EQUIPO = [
  'nombre',
  'id_institucion',
  'id_disciplina',
  'id_usuario',
  'id_localidad',
  'colores'
];

class EquipoController {
  constructor() {
    bindAll(this);
  }

  _context(req) {
    return { userId: req.user?.id, rol: req.user?.rol, alcance: req.alcance, ip: req.ip, userAgent: req.headers['user-agent'] };
  }

  _coachConflict(torneo, equipo) {
    if (!equipo.id_usuario) return Promise.resolve(null);
    return knex('posicion as p2')
      .join('equipo as e2', 'p2.id_equipo', 'e2.id_equipo')
      .join('usuario as u2', 'e2.id_usuario', 'u2.id_usuario')
      .select('e2.id_equipo', 'e2.nombre as equipo_nombre', 'u2.nombre as entrenador_nombre')
      .where('p2.id_torneo', torneo.id_torneo)
      .where('e2.id_usuario', equipo.id_usuario)
      .whereNot('e2.id_equipo', equipo.id_equipo)
      .first();
  }

  async findAll(req, res, next) {
    try {
      const { page, limit, id_disciplina, id_institucion, search, filter, id_torneo, id_region, id_distrito, id_localidad } = req.query;
      const result = await equipoService.findAll({
        page, limit, id_disciplina, id_institucion,
        search, filter, id_torneo, id_region, id_distrito, id_localidad,
        // Aislamiento por institución (X-05). El servidor decide qué

        alcance: req.alcance
      });
      res.status(HTTP_STATUS.OK).json(
        formatPaginatedResponse(result.data, result.total, result.page, result.limit)
      );
    } catch (err) {
      next(err);
    }
  }

  async findById(req, res, next) {
    try {
      const data = await equipoService.findById(req.params.id, { alcance: req.alcance });
      res.status(HTTP_STATUS.OK).json(formatResponse(data));
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const payload = soloCampos(req, CAMPOS_EQUIPO);
      if (!payload.id_usuario) payload.id_usuario = req.user.id;
      const data = await equipoService.create(payload, this._context(req));
      res.status(HTTP_STATUS.CREATED).json(formatResponse(data, 'Equipo creado'));
    } catch (err) {
      next(err);
    }
  }

  async enroll(req, res, next) {
    try {
      const { id } = req.params;
      const { id_torneo } = req.body;

      const equipo = await knex('equipo').where('id_equipo', id).first();
      if (!equipo) throw new BusinessError('Equipo no encontrado');

      const torneo = await knex('torneo').where('id_torneo', id_torneo).first();
      if (!torneo) throw new BusinessError('Torneo no encontrado');

      const existing = await knex('posicion').where({ id_equipo: id, id_torneo: id_torneo }).first();
      if (existing) throw new BusinessError('El equipo ya está inscrito en este torneo');

      const conflict = await this._coachConflict(torneo, equipo);
      if (conflict) {
        throw new BusinessError(`El profesor del equipo "${equipo.nombre}" ya es el entrenador del equipo "${conflict.equipo_nombre}" en el torneo "${torneo.nombre}"`);
      }

      const posicion = await knex('posicion').insert({
        id_equipo: parseInt(id),
        id_torneo: parseInt(id_torneo),
        estado_torneo: 'Inscripto'
      }).returning('*').then(r => r[0]);

      res.status(HTTP_STATUS.CREATED).json(formatResponse(posicion, 'Equipo inscrito'));
    } catch (err) {
      next(err);
    }
  }

  async _assertRegistration(reg, seen, seenCoaches) {
    const key = `${reg.id_equipo}-${reg.id_torneo}`;
    if (seen.has(key)) {
      throw new BusinessError('La misma inscripción aparece más de una vez en la lista');
    }
    seen.add(key);

    const equipo = await knex('equipo as e')
      .join('usuario as u', 'e.id_usuario', 'u.id_usuario')
      .select('e.*', 'u.nombre as entrenador_nombre')
      .where('e.id_equipo', reg.id_equipo).first();
    if (!equipo) throw new BusinessError(`El equipo con id ${reg.id_equipo} no existe`);

    const torneo = await knex('torneo').where('id_torneo', reg.id_torneo).first();
    if (!torneo) throw new BusinessError(`El torneo con id ${reg.id_torneo} no existe`);

    const existing = await knex('posicion')
      .where({ id_equipo: reg.id_equipo, id_torneo: reg.id_torneo }).first();
    if (existing) {
      throw new BusinessError(`El equipo "${equipo.nombre}" ya está inscrito en el torneo "${torneo.nombre}"`);
    }

    if (equipo.id_usuario) {
      // La llave lleva el torneo porque la regla es "un entrenador, un equipo por
      // torneo", no "un entrenador, un equipo en la vida": es lo que ya mide

      const llaveCoach = `${equipo.id_usuario}-${reg.id_torneo}`;
      if (seenCoaches.has(llaveCoach)) {
        const prev = seenCoaches.get(llaveCoach);
        throw new BusinessError(`El profesor "${prev.entrenador_nombre}" no puede ser entrenador de más de un equipo en el torneo "${torneo.nombre}"`);
      }
      const conflict = await this._coachConflict(torneo, equipo);
      if (conflict) {
        throw new BusinessError(`El profesor del equipo "${equipo.nombre}" ya es el entrenador del equipo "${conflict.equipo_nombre}" en el torneo "${torneo.nombre}"`);
      }
      seenCoaches.set(llaveCoach, { entrenador_nombre: equipo.entrenador_nombre });
    }
  }

  async enrollBatch(req, res, next) {
    try {
      const { registrations } = req.body;

      // El permiso del lote. Va PRIMERO, antes de cualquier validación de

      await autorizacionService.assertGestionarEquiposPropiosBatch(
        { id: req.user?.id, rol: req.user?.rol },
        registrations.map((r) => r.id_equipo)
      );

      const results = [];
      const seen = new Set();
      const seenCoaches = new Map();

      for (const reg of registrations) {
        await this._assertRegistration(reg, seen, seenCoaches);
      }

      await knex.transaction(async (trx) => {
        for (const reg of registrations) {
          const pos = await trx('posicion').insert({
            id_equipo: reg.id_equipo,
            id_torneo: reg.id_torneo,
            estado_torneo: 'Inscripto'
          }).returning('*').then((r) => r[0]);
          results.push(pos);
        }
      });

      res.status(HTTP_STATUS.CREATED).json(formatResponse(results, `${results.length} equipos inscritos`));
    } catch (err) {
      next(err);
    }
  }

  async findEnrolled(req, res, next) {
    try {
      const { page = 1, limit = 10, id_torneo, id_disciplina, id_region, include_cerradas } = req.query;
      const p = Math.max(parseInt(page, 10) || 1, 1);
      const l = Math.min(parseInt(limit, 10) || 100, 100);
      const offset = (p - 1) * l;

      if (!include_cerradas) {
        await inscripcionService.cerrarVencidas();
      }

      let baseQuery = knex('posicion as pos')
        .select(
          'pos.id_posicion',
          'pos.id_equipo',
          'pos.id_torneo',
          'pos.estado_torneo',
          'pos.puntos',
          'pos.pj', 'pos.pg', 'pos.pe', 'pos.pp', 'pos.gf', 'pos.gc',
          'pos.creado_en',
          'e.nombre as equipo_nombre',
          'e.colores',
          'e.id_localidad',
          'd.nombre as disciplina_nombre',
          'd.id_disciplina',
          't.nombre as torneo_nombre',
          't.fecha_inicio',
          't.fecha_fin',
          'i.nombre as institucion_nombre',
          'l.id_region',
          'r.nombre as region_nombre'
        )
        .join('equipo as e', 'pos.id_equipo', 'e.id_equipo')
        .join('torneo as t', 'pos.id_torneo', 't.id_torneo')
        .join('disciplina as d', 'e.id_disciplina', 'd.id_disciplina')
        .leftJoin('institucion as i', 'e.id_institucion', 'i.id_institucion')
        .leftJoin('localidad as l', 'e.id_localidad', 'l.id_localidad')
        .leftJoin('region as r', 'l.id_region', 'r.id_region');

      // Aislamiento por institución (X-05). Esta consulta vive en el controlador

      alcanceService.filtrarPorEquipos(baseQuery, req.alcance, ['pos.id_equipo']);

      if (id_torneo) baseQuery.where('pos.id_torneo', id_torneo);
      if (id_disciplina) baseQuery.where('e.id_disciplina', id_disciplina);
      if (id_region) baseQuery.where('l.id_region', id_region);

      if (!include_cerradas) {
        baseQuery.where('pos.estado_torneo', 'Inscripto');
      }

      const countQuery = baseQuery.clone().clearSelect().clear('order').count('* as count').first();
      const total = (await countQuery).count;

      const data = await baseQuery.orderBy('t.nombre', 'asc').orderBy('e.nombre', 'asc').offset(offset).limit(l);

      res.status(HTTP_STATUS.OK).json(
        formatPaginatedResponse(data, parseInt(total, 10), p, l)
      );
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const data = await equipoService.update(req.params.id, soloCampos(req, CAMPOS_EQUIPO), this._context(req));
      res.status(HTTP_STATUS.OK).json(formatResponse(data, 'Equipo actualizado'));
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      await equipoService.delete(req.params.id, this._context(req));
      res.status(HTTP_STATUS.OK).json(formatResponse(null, 'Equipo eliminado'));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new EquipoController();
