const knex = require('../config/knex');
const { validarColumnas } = require('../utils/columnas');

/**
 * create / update / delete para un repositorio de catálogo.
 *
 * Los 13 repositorios de catálogo repetían las mismas tres funciones con solo
 * dos diferencias: el nombre de la tabla y la PK. El riesgo de la copia no es
 * el volumen, es la deriva: cuando se agrega una columna bloqueada a un
 * repositorio y se olvida en otro, la validación de columnas queda
 * asimétrica sin que ningún test lo note.
 *
 * `bloquear` se pasa tal cual a `validarColumnas`, que ya aplica `[]` como
 * default: los repositorios que hoy no bloquean nada siguen sin bloquear nada.
 *
 *   ...crud('region', 'id_region')
 *   ...crud('partido', 'id_partido', ['resultado_cargado', 'creado_en', 'actualizado_en'])
 */
const crud = (tabla, pk, bloquear) => {
  const config = { pk, bloquear };

  return {
    create: async (data) => {
      await validarColumnas(tabla, data, config);
      return knex(tabla).insert(data).returning('*').then((r) => r[0]);
    },
    update: async (id, data) => {
      await validarColumnas(tabla, data, config);
      return knex(tabla).where(pk, id).update(data).returning('*').then((r) => r[0]);
    },
    delete: (id) => knex(tabla).where(pk, id).del().returning(pk).then((r) => r[0])
  };
};

module.exports = { crud };
