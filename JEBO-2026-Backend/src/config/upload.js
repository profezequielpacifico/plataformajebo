const path = require('path');
const fs = require('fs');
const multer = require('multer');

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
const REGLAMENTOS_DIR = path.join(UPLOADS_DIR, 'reglamentos');

fs.mkdirSync(REGLAMENTOS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, REGLAMENTOS_DIR),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.jpg', '.jpeg', '.png'];

// La extensión sola no dice nada: un .jpg puede contener HTML. Se valida

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png'
];

const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext) || !ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    const err = new Error('Tipo de archivo no permitido. Use PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG o PNG.');
    err.statusCode = 400;
    err.isOperational = true;
    return cb(err);
  }
  cb(null, true);
};

// Techo de 8 MB, no de 10: es el limite recomendado para subidas de archivo

const MAX_FILE_BYTES = 8 * 1024 * 1024;
// Multipart envuelve el archivo en campos y boundaries, asi que el body llega

const MAX_BODY_BYTES = MAX_FILE_BYTES + 64 * 1024;
const MAX_FIELD_BYTES = 64 * 1024;
const MAX_FIELDS = 20;
const MAX_PARTS = MAX_FIELDS + 1;

// El mensaje sale de la constante y no al reves: con el texto escrito a mano,
// bajar el limite dejaba diciendo "10 MB" a un upload que corta en 8 (S5693 se

const ERROR_TAMANO = `El archivo supera el tamano maximo permitido (${MAX_FILE_BYTES / (1024 * 1024)} MB).`;
const errorTamano = () => {
  const err = new Error(ERROR_TAMANO);
  err.statusCode = 413;
  err.isOperational = true;
  return err;
};

// multer Limita el archivo, pero el body igual se lee entero antes de que

const limitarCuerpo = (req, res, next) => {
  const declarado = Number.parseInt(req.headers['content-length'], 10);

  if (Number.isFinite(declarado) && declarado > MAX_BODY_BYTES) {
    return next(errorTamano());
  }

  if (Number.isNaN(declarado) && req.headers['transfer-encoding']?.includes('chunked')) {
    let recibidos = 0;
    req.on('data', (chunk) => {
      recibidos += chunk.length;
      if (recibidos > MAX_BODY_BYTES) {
        req.destroy();
        next(errorTamano());
      }
    });
  }

  return next();
};

const uploadReglamento = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_BYTES,
    fieldSize: MAX_FIELD_BYTES,
    fields: MAX_FIELDS,
    parts: MAX_PARTS
  }
});

module.exports = {
  UPLOADS_DIR,
  REGLAMENTOS_DIR,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  MAX_FILE_BYTES,
  uploadReglamento,
  limitarCuerpo
};
