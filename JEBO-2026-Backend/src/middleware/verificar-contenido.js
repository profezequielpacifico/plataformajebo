const { validarArchivoSubido, borrarSiExiste } = require('../utils/archivos');
const { HTTP_STATUS } = require('../constants');

const verificarContenido = async (req, res, next) => {
  try {
    if (!req.file) {
      return next();
    }

    const resultado = await validarArchivoSubido(req.file);
    if (resultado.ok) return next();

    await borrarSiExiste(req.file);
    req.file = undefined;

    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: resultado.motivo
    });
  } catch (err) {
    await borrarSiExiste(req.file);
    req.file = undefined;
    return next(err);
  }
};

module.exports = { verificarContenido };
