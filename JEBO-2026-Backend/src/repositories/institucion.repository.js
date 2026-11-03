const knex = require('../config/knex');
const { crud } = require('./crud');
const alcance = require('../services/alcance.service');

const baseSelect = () => knex('institucion as i')
  .select('i.*', 'l.nombre as localidad_nombre', 'd.nombre as distrito_nombre', 'r.nombre as region_nombre')
  .leftJoin('localidad as l', 'i.id_localidad', 'l.id_localidad')
  .leftJoin('distrito as d', 'l.id_distrito', 'd.id_distrito')
  .leftJoin('region as r', 'l.id_region', 'r.id_region');

module.exports = {
  // Listar instituciones es el padrón de todas las instituciones del sistema, y

  findAll: ({ alcance: alc } = {}) => {
    const query = baseSelect();
    alcance.filtrarPorInstitucion(query, alc, 'i.id_institucion');
    return query.orderBy('i.nombre');
  },
  findById: (id, { alcance: alc } = {}) => {
    const query = baseSelect();
    alcance.filtrarPorInstitucion(query, alc, 'i.id_institucion');
    return query.where('i.id_institucion', id).first();
  },
  // `findByName` NO lleva filtro a propósito: lo usa el servicio de escritura

  findByName: (nombre) => baseSelect().where('i.nombre', nombre).first(),
  ...crud('institucion', 'id_institucion', ['creado_en', 'actualizado_en'])
};
