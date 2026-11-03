const { validarArchivoSubido, borrarSiExiste } = require('../utils/archivos');
const { HTTP_STATUS } = require('../constants');

/**
 * Valida el contenido de un archivo subido, DESPUES de que multer lo guardo.
 *
 * Va en la cadena de la ruta, entre multer y el controlador:
 *
 *   router.post('/:id/reglamento', authenticate, requireAdminOrAbove,
 *     limitarCuerpo, uploadReglamento.single('reglamento'),
 *     verificarContenido, controlador.uploadReglamento)
 *
 * Va ahi y no dentro de `fileFilter` porque `fileFilter` decide antes de que
 * exista el archivo en disco: solo ve la extension, el MIME y el nombre que
 * declara el cliente. Los magic bytes necesitan el archivo. Este es el unico
 * punto donde el archivo existe y todavia no se le dijo al cliente que se
 * acepto.
 *
 * Lo mas importante: BORRA el archivo cuando lo rechaza. Sin eso, cada intento
 * fallido dejaba un `.pdf` en `uploads/reglamentos/` y un attacker que sube
 * archivos a razon de 10 por minuto llena el volumen sin levantar un solo error.
 * El nombre del archivo lo genera multer (`${Date.now()}-${safeName}`), asi que
 * nunca colisiona con uno legitimo y el borrado no puede tocar un reglamento que
 * ya estaba en uso.
 *
 * El 400 responde con un mensaje generico, sin decir cual era la firma esperada
 * ni cual se leyo. Confirmar "empezaba con 25 50 44 46 en vez de 46 46" le dice
 * al atacante exactamente que buscar.
 */
const verificarContenido = async (req, res, next) => {
  try {
    if (!req.file) {
      // Sin archivo no hay nada que verificar. Lo deja pasar al controlador,
      // que ya responde "No se envío ningún archivo" con 400: el mensaje vive
      // ahi desde antes y duplicarlo aca seria una segunda fuente de verdad.
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
    // Un fallo inesperado en la validacion tiene que borrar el archivo igual:
    // si no, se acepta por la puerta de atrás cualquier archivo cuya
    // validacion reviente.
    await borrarSiExiste(req.file);
    req.file = undefined;
    return next(err);
  }
};

module.exports = { verificarContenido };
