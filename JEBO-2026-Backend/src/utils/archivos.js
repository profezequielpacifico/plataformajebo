const fs = require('fs');
const path = require('path');

const FIRMAS = {
  '.pdf': [[0x25, 0x50, 0x44, 0x46, 0x2d]],
  '.jpg': [[0xff, 0xd8, 0xff]],
  '.jpeg': [[0xff, 0xd8, 0xff]],
  '.png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  '.doc': [[0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]],
  '.xls': [[0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]],
  '.ppt': [[0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]],
  '.docx': [[0x50, 0x4b, 0x03, 0x04]],
  '.xlsx': [[0x50, 0x4b, 0x03, 0x04]],
  '.pptx': [[0x50, 0x4b, 0x03, 0x04]]
};

const MAXIMO_FIRMA = Math.max(...Object.values(FIRMAS).flat().map((f) => f.length));

const enHex = (bytes) => Buffer.from(bytes).toString('hex').toUpperCase();

const verificarFirma = async (ruta, extension) => {
  const firma = FIRMAS[extension.toLowerCase()];
  if (!firma) {
    return { ok: false, motivo: `No se puede verificar el contenido de un archivo ${extension}` };
  }

  let handle;
  try {
    handle = await fs.promises.open(ruta, 'r');
    const buffer = Buffer.alloc(MAXIMO_FIRMA);
    const { bytesRead } = await handle.read(buffer, 0, MAXIMO_FIRMA, 0);

    if (bytesRead === 0) {
      return { ok: false, motivo: 'El archivo está vacío' };
    }

    const cabecera = buffer.subarray(0, bytesRead);
    for (const candidata of firma) {
      if (candidata.length <= bytesRead && cabecera.subarray(0, candidata.length).equals(Buffer.from(candidata))) {
        return { ok: true };
      }
    }

    return {
      ok: false,
      motivo: `El contenido del archivo no corresponde a un ${extension.slice(1).toUpperCase()}`
    };
  } catch (err) {
    return { ok: false, motivo: `No se pudo leer el archivo subido: ${err.message}` };
  } finally {
    if (handle) await handle.close().catch(() => {});
  }
};

const validarArchivoSubido = async (file) => {
  if (!file || !file.path) return { ok: false, motivo: 'No se envió ningún archivo' };

  const stats = await fs.promises.stat(file.path).catch(() => null);
  if (!stats) return { ok: false, motivo: 'El archivo subido no existe en el servidor' };
  if (stats.size === 0) return { ok: false, motivo: 'El archivo está vacío' };

  return verificarFirma(file.path, path.extname(file.originalname || file.filename || ''));
};

const borrarSiExiste = async (file) => {
  if (!file || !file.path) return;
  await fs.promises.unlink(file.path).catch(() => {});
};

module.exports = {
  FIRMAS,
  validarArchivoSubido,
  verificarFirma,
  borrarSiExiste
};
