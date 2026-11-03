const fs = require('fs');
const path = require('path');

/**
 * Validación del CONTENIDO de un archivo subido (X-13 y X-17).
 *
 * El problema: `config/upload.js` valida la extensión y el MIME, y los dos los
 * declara el cliente. Con eso solo, un `.jpg` que en realidad es un script PHP o
 * un `.pdf` que es HTML con `<script>` se guardaban igual. Medido contra el
 * despliegue: ambos devolvían 200 y quedaban en `uploads/reglamentos/`.
 *
 * El comentario de `config/upload.js` afirmaba que la validación de magic bytes
 * se hacia "en el controlador, que es el unico lugar con acceso al stream". No
 * habia ningun controlador que lo hiciera. Este modulo es esa validacion, y el
 * comentario quedo actualizado para apuntar aca.
 *
 * Que son "magic bytes": los primeros bytes de cada formato, que el formato
 * define y que no se pueden cambiar sin convertir el archivo en otra cosa. Un
 * JPEG empieza siempre con `FF D8 FF`; si lo que sigue no es un JPEG, no es un
 * JPEG. Es la unica parte del archivo que no controla el atacante, porque el
 * cliente elige el nombre y el MIME, pero no los bytes que lo hacen ser un PDF.
 *
 * Que NO hace, y conviene saberlo antes de confiar en esto:
 *
 *   - No analiza el archivo entero. Alguien que meta PHP en los ultimos bytes de
 *     un PDF valido pasa esta comprobacion. Para eso esta la segunda capa: el
 *     archivo se sirve con `Content-Disposition: attachment` y `nosniff`, nunca
 *     como HTML, y el servidor no lo ejecuta. Un PDF con PHP adentro no es
 *     ejecutable por el servidor, que no tiene intérprete de PHP.
 *   - No distingue un `.docx` de un `.xlsx`. Los dos son el mismo contenedor
 *     ZIP, y la diferencia esta adentro, en el XML. No hace falta distinguir
 *     para la amenaza que importa: un archivo PHP o HTML no es un ZIP.
 *   - No reemplaza el antivirus. Si se agrega uno, esto sigue siendo la primera
 *     capa, la rapida y la que no depende de un servicio externo.
 */

// Firmas por familia de formato. La clave es la extension en minuscula.
const FIRMAS = {
  '.pdf': [[0x25, 0x50, 0x44, 0x46, 0x2d]], // %PDF-
  '.jpg': [[0xff, 0xd8, 0xff]], // SOI + marcador de inicio
  '.jpeg': [[0xff, 0xd8, 0xff]],
  '.png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  // Office 97-2003 (.doc, .xls, .ppt) es OLE2 / Compound File Binary. Los tres
  // comparten la misma cabecera; es indistinguible sin abrir el directorio.
  '.doc': [[0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]],
  '.xls': [[0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]],
  '.ppt': [[0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]],
  // Office 2007+ (.docx, .xlsx, .pptx) es un ZIP: "local file header". Las
  // otras dos firmas de ZIP —"fin de archivo central" `50 4B 05 06` y "marcador
  // de volumen spanned" `50 4B 07 08`— no se aceptan a proposito: un ZIP
  // vacio no es un documento.
  '.docx': [[0x50, 0x4b, 0x03, 0x04]],
  '.xlsx': [[0x50, 0x4b, 0x03, 0x04]],
  '.pptx': [[0x50, 0x4b, 0x03, 0x04]]
};

// Cuantos bytes hacen falta para comparar la firma mas larga.
const MAXIMO_FIRMA = Math.max(...Object.values(FIRMAS).flat().map((f) => f.length));

const enHex = (bytes) => Buffer.from(bytes).toString('hex').toUpperCase();

/**
 * Compara la cabecera del archivo contra la firma esperada para su extension.
 *
 * Devuelve `{ ok, motivo }` y no lanza: el que decide que hacer con un rechazo
 * es el middleware, que ademas tiene que borrar el archivo del disco.
 */
const verificarFirma = async (ruta, extension) => {
  const firma = FIRMAS[extension.toLowerCase()];
  if (!firma) {
    // Extension sin firma conocida. `fileFilter` de multer ya la rechazo, asi
    // que llegar aca seria un endpoint nuevo que se salteo esa capa. Se falla
    // cerrado: es preferible rechazar un formato que no sabemos verificar.
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
    // No se pudo leer: se rechaza. Un archivo ilegible no es un archivo valido.
    return { ok: false, motivo: `No se pudo leer el archivo subido: ${err.message}` };
  } finally {
    if (handle) await handle.close().catch(() => {});
  }
};

/**
 * Valida un archivo ya guardado en disco por multer.
 *
 * Rechaza, en este orden:
 *   1. que no exista (X-17, parcialmente: un `curl -F "campo=@/dev/null"` sin
 *      nombre de archivo no llega a multer, y eso lo cubre `!req.file`).
 *   2. que pese 0 bytes. Un reglamento de 0 bytes se guardaba y devolvia 200:
 *      el `reglamento` de la disciplina apuntando a un archivo vacio, y un
 *      `GET` de ese reglamento devolvia un PDF que no se podia abrir.
 *   3. que los magic bytes no correspondan a la extension (X-13).
 *
 * `req.file` se devuelve intacto si pasa todo, para que el middleware lo encadene
 * como cualquier otro.
 */
const validarArchivoSubido = async (file) => {
  if (!file || !file.path) return { ok: false, motivo: 'No se envió ningún archivo' };

  const stats = await fs.promises.stat(file.path).catch(() => null);
  if (!stats) return { ok: false, motivo: 'El archivo subido no existe en el servidor' };
  if (stats.size === 0) return { ok: false, motivo: 'El archivo está vacío' };

  return verificarFirma(file.path, path.extname(file.originalname || file.filename || ''));
};

/** Borra un archivo sin que un fallo de permisos tape el error del upload. */
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
