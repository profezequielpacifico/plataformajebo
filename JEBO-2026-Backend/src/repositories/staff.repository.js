const knex = require('../config/knex');

module.exports = {
  findByPartido: (id_partido) => knex('staff_partido as sp')
    .select('sp.*', 'u.nombre as usuario_nombre', 'u.email')
    .join('usuario as u', 'sp.id_usuario', 'u.id_usuario')
    .where('sp.id_partido', id_partido),
  /**
   * Asigna un arbitro al partido.
   *
   * `rol` es opcional y el default de la base es ASISTENTE. Cuando el cliente
   * NO manda roles pero manda una lista de arbitros, el primero se guarda como
   * PRINCIPAL: es lo que el dominio espera de una lista de arbitros, y dejarlo
   * todo en ASISTENTE haria que un partido recien creado no tuviera principal
   * hasta que alguien lo corrigiera a mano.
   */
  create: (id_partido, id_usuario, rol) => knex('staff_partido')
    .insert({ id_partido, id_usuario, ...(rol ? { rol } : {}) })
    .returning('*').then(r => r[0]),
  delete: (id_partido, id_usuario) => knex('staff_partido')
    .where({ id_partido, id_usuario }).del().returning('id_partido_usuario').then(r => r[0]),
  deleteByPartido: (id_partido) => knex('staff_partido')
    .where('id_partido', id_partido).del().returning('id_partido_usuario')
};
