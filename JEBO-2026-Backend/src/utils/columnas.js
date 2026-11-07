const knex = require('../config/knex');
const { ValidationError } = require('./errors');

const TTL_MS = 5 * 60 * 1000;
const cache = new Map();

const columnasDe = async (tabla) => {
  const cached = cache.get(tabla);
  if (cached && Date.now() - cached.tiempo < TTL_MS) return cached.columnas;

  const filas = await knex('information_schema.columns')
    .select('column_name')
    .where('table_schema', 'public')
    .andWhere('table_name', tabla);

  const columnas = new Set(filas.map((f) => f.column_name));
  cache.set(tabla, { columnas, tiempo: Date.now() });
  return columnas;
};

const limpiarCache = () => cache.clear();

const COLUMNAS_SISTEMA = new Set([
  'password',
  'password_hash',
  'id_rol',
  'rol',
  'estado',
  'ultimo_acceso',
  'created_at',
  'updated_at'
]);

const validarColumnas = async (tabla, data, { pk, bloquear = [] } = {}) => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return data;

  const permitidas = await columnasDe(tabla);
  const desconocidas = Object.keys(data).filter((k) => !permitidas.has(k));

  if (desconocidas.length) {
    throw new ValidationError(
      `Campo${desconocidas.length > 1 ? 's' : ''} no válido${desconocidas.length > 1 ? 's' : ''} ` +
      `para ${tabla}: ${desconocidas.join(', ')}`
    );
  }

  if (pk && Object.prototype.hasOwnProperty.call(data, pk)) {
    throw new ValidationError(`El campo ${pk} no se puede enviar; lo asigna el sistema`);
  }

  if (bloquear.length) {
    const prohibidas = bloquear.filter((k) => Object.prototype.hasOwnProperty.call(data, k));
    if (prohibidas.length) {
      throw new ValidationError(
        `El campo${prohibidas.length > 1 ? 's' : ''} ` +
        `${prohibidas.join(', ')} no se puede enviar; lo asigna el sistema`
      );
    }
  }

  return data;
};

module.exports = { columnasDe, validarColumnas, limpiarCache, COLUMNAS_SISTEMA };
