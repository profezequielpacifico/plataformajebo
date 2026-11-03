const knex = require('../config/knex');
const { ValidationError } = require('./errors');

const TTL_MS = 5 * 60 * 1000;
const cache = new Map();

/**
 * Columnas reales de una tabla, leídas de information_schema y cacheadas.
 *
 * La fuente de verdad es la base y no `src/models/*.model.js`: los modelos
 * tienen drift (varias columnas existen en la base y no están declaradas, y al
 * revés), así que filtrar por el modelo descartaría campos válidos en silencio.
 */
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

/**
 * Columnas que un cliente nunca debe poder escribir, aunque existan en la
 * tabla. No basta con bloquear la PK: `password_hash`, `id_rol` o `estado`
 * también son columnas válidas, y escribirlas desde el body evita por completo
 * la validación de contraseña o el control de rol.
 *
 * Se aplican en el borde (middleware), no acá: los servicios construyen sus
 * propios payloads con `id_rol` y `estado` legítimamente, así que filtrar en
 * el repositorio rompería la creación de usuarios.
 */
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

/**
 * Rechaza claves que no son columnas reales de la tabla, y la PK.
 *
 * Los repositorios hacen `knex(tabla).insert(data)`, así que cualquier clave
 * extra del body terminaba en el INSERT. Eso rompía con 500 ante un campo
 * desconocido y, peor, permitía escribir columnas que el cliente no debería
 * controlar. La PK se bloquea aparte porque sí es una columna válida: sin esto,
 * un `PUT` podía renumerar una fila y dejar referencias colgadas.
 */
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
