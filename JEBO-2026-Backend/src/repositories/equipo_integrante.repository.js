const knex = require('../config/knex');

const TABLE = 'equipo_integrante';

module.exports = {
  findByEquipo: (id_equipo) =>
    knex(`${TABLE} as ei`)
      .select('ei.*', 'u.nombre', 'u.documento', 'u.email')
      .join('usuario as u', 'ei.id_usuario', 'u.id_usuario')
      .where('ei.id_equipo', id_equipo)
      .orderBy('ei.rol'),

  findById: (id_equipo, id_usuario) =>
    knex(TABLE).where({ id_equipo, id_usuario }).first(),

  create: (data) => knex(TABLE).insert(data).returning('*').then(r => r[0]),

  bulkCreate: (integrantes) => knex(TABLE).insert(integrantes).returning('*'),

  update: (id_equipo, id_usuario, data) =>
    knex(TABLE).where({ id_equipo, id_usuario }).update(data).returning('*').then(r => r[0]),

  delete: (id_equipo, id_usuario) =>
    knex(TABLE).where({ id_equipo, id_usuario }).del(),

  deleteByEquipo: (id_equipo) =>
    knex(TABLE).where('id_equipo', id_equipo).del(),

  /**
   * Validar composición de trío.
   *
   * Solo se verifica la cantidad de integrantes. La regla del reglamento pide
   * además 1 de un género y 2 del otro, pero el modelo de datos no guarda el
   * género: no hay columna `genero` en `usuario` ni en ninguna otra tabla, y las
   * consultas que la usaban reventaban con "column u.genero does not exist",
   * dejando toda alta de presentación con trío en error.
   *
   * Para cubrir la regla hace falta agregar la columna (migración + campo en el
   * alta de usuario) y recién ahí recuperar el conteo por género.
   */
  validarTrio: async (id_equipo) => {
    const [{ cantidad }] = await knex(TABLE)
      .where('id_equipo', id_equipo)
      .count({ cantidad: 'id_usuario' });
    if (Number(cantidad) !== 3) {
      return { valido: false, motivo: 'Debe tener exactamente 3 integrantes' };
    }
    return { valido: true, genero: 'no-verificable' };
  }
};