const { HTTP_STATUS, MENSAJES } = require('../constants');
const { BusinessError, ValidationError } = require('../utils/errors');
const logger = require('../config/logger');

const POR_CODIGO = {
  '23502': { status: HTTP_STATUS.BAD_REQUEST, mensaje: 'Falta un campo obligatorio' },
  '23503': { status: HTTP_STATUS.CONFLICT, mensaje: 'La referencia indicada no existe o el recurso sigue en uso' },
  '23505': { status: HTTP_STATUS.CONFLICT, mensaje: 'Ya existe un registro con esos datos' },
  '23514': { status: HTTP_STATUS.BAD_REQUEST, mensaje: 'Los datos no cumplen una regla de validación' },
  '22P02': { status: HTTP_STATUS.BAD_REQUEST, mensaje: 'Alguno de los valores enviados tiene un formato inválido' },
  '22001': { status: HTTP_STATUS.BAD_REQUEST, mensaje: 'Algún valor excede el largo permitido' },
  '22003': { status: HTTP_STATUS.BAD_REQUEST, mensaje: 'Algún valor numérico está fuera de rango' },
  '22007': { status: HTTP_STATUS.BAD_REQUEST, mensaje: 'Alguna fecha no tiene un formato válido' },
  '22008': { status: HTTP_STATUS.BAD_REQUEST, mensaje: 'Alguna fecha está fuera de rango' },
  '22012': { status: HTTP_STATUS.BAD_REQUEST, mensaje: 'Se produjo un desbordamiento al procesar un valor' }
};

const FK_CONSTRAINT_MESSAGES = {
  torneo: 'No se puede eliminar el torneo porque tiene partidos, equipos o posiciones asociadas. Eliminá primero esos registros.',
  disciplina: 'No se puede eliminar la disciplina porque tiene torneos, equipos o canchas asociadas.',
  equipo: 'No se puede eliminar el equipo porque tiene partidos o posiciones asociadas.',
  cancha: 'No se puede eliminar la cancha porque tiene partidos asociados.',
  region: 'No se puede eliminar la región porque tiene distritos asociados.',
  distrito: 'No se puede eliminar el distrito porque tiene instituciones asociadas.',
  institucion: 'No se puede eliminar la institución porque tiene equipos asociados.',
  instancia: 'No se puede eliminar la instancia porque tiene torneos asociados.',
  usuario: 'No se puede eliminar el usuario porque tiene registros asociados.'
};

const FK_GENERICO = 'No se puede eliminar porque tiene registros asociados. Eliminá primero los registros dependientes.';

const FK_REFERENCIA = (tabla) =>
  tabla
    ? `El registro relacionado en "${tabla}" no existe`
    : 'La referencia indicada no existe';

const esClaseDeIntegridad = (codigo) => /^23/.test(codigo);
const esClaseDeDatos = (codigo) => /^22/.test(codigo);

const extractTableName = (err) => {
  const detail = err.detail || '';
  const match = detail.match(/table\s+"([^"]+)"/);
  if (match) return match[1];
  const constraint = err.constraint || '';
  const tableMatch = constraint.match(/^(.+?)_/);
  if (tableMatch) return tableMatch[1];
  return null;
};

const traducirErrorDePostgres = (err, req = {}) => {
  const codigo = err.code;
  if (!codigo) return null;

  if (codigo === '23503') {
    const esBorrado = req.method === 'DELETE';
    const mensaje = esBorrado
      ? (FK_CONSTRAINT_MESSAGES[extractTableName(err)] || FK_GENERICO)
      : FK_REFERENCIA(err.table);
    return new BusinessError(mensaje);
  }

  const conocido = POR_CODIGO[codigo];
  if (conocido) {
    const detalle = conocido.mensaje + (err.constraint ? ` (${err.constraint})` : '');
    return conocido.status === HTTP_STATUS.CONFLICT
      ? new BusinessError(detalle)
      : new ValidationError(detalle);
  }

  if (esClaseDeIntegridad(codigo)) {
    return new BusinessError('La operación infringe una restricción de integridad');
  }
  if (esClaseDeDatos(codigo)) {
    return new ValidationError('Alguno de los valores enviados no es válido para este recurso');
  }

  return null;
};

const TRADUCCIONES_BODY_PARSER = {
  'entity.parse.failed': {
    status: HTTP_STATUS.BAD_REQUEST,
    mensaje: 'El cuerpo de la petición no es un JSON válido'
  },
  'entity.too.large': {
    status: HTTP_STATUS.PAYLOAD_TOO_LARGE,
    mensaje: 'El cuerpo de la petición excede el tamaño permitido'
  },
  'encoding.unsupported': {
    status: HTTP_STATUS.BAD_REQUEST,
    mensaje: 'La codificación del cuerpo de la petición no está soportada'
  },
  'charset.unsupported': {
    status: HTTP_STATUS.BAD_REQUEST,
    mensaje: 'El charset declarado no está soportado; use UTF-8'
  }
};

const errorHandler = (err, req, res, _next) => {
  const deBodyParser = err && TRADUCCIONES_BODY_PARSER[err.type];
  if (deBodyParser) {

    logger.debug('Cuerpo rechazado por el parser (' + err.type + '): ' + err.message);
    return res.status(deBodyParser.status).json({
      success: false,
      error: deBodyParser.mensaje
    });
  }

  if (err.isOperational || (err.statusCode && err.statusCode < 500)) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message
    });
  }

  const traducido = traducirErrorDePostgres(err, req);
  if (traducido) {
    logger.warn('Error de datos traducido a ' + traducido.statusCode + ': ' + err.message);
    return res.status(traducido.statusCode).json({
      success: false,
      error: traducido.message
    });
  }

  logger.error('Error inesperado:', err);

  return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    error: MENSAJES.ERROR_GENERICO
  });
};

module.exports = errorHandler;
module.exports.traducirErrorDePostgres = traducirErrorDePostgres;
module.exports.POR_CODIGO = POR_CODIGO;
module.exports.FK_CONSTRAINT_MESSAGES = FK_CONSTRAINT_MESSAGES;
