const path = require('path');
const EventEmitter = require('events');
const upload = require('../../src/config/upload');

const {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  MAX_FILE_BYTES,
  REGLAMENTOS_DIR,
  limitarCuerpo
} = upload;

// El modulo no exporta el margen de multipart, asi que se recalcula igual que
// en la fuente para poder cortar el limite exacto sin cambiar la API publica.
const MAX_BODY_BYTES = MAX_FILE_BYTES + 64 * 1024;

// limitarCuerpo es la unica pieza de este modulo con logica propia y por lo
// tanto la unica que tiene tests directos: multer ya viene probado por su parte
// y el filtro se ejercita a traves de la API en otros suites.
describe('upload config', () => {
  describe('constantes expuestas', () => {
    it('el limite del archivo es 8 MB', () => {
      expect(MAX_FILE_BYTES).toBe(8 * 1024 * 1024);
    });

    it('el limite no supera el techo recomendado para uploads', () => {
      // 8 MB es el techo de OWASP / CWE-400 y el umbral de S5693. Este test
      // avisa si alguien lo vuelve a subir, sin esperar al proximo analyze.
      expect(MAX_FILE_BYTES).toBeLessThanOrEqual(8 * 1024 * 1024);
    });

    it('el directorio de reglamentos cuelga de uploads', () => {
      expect(path.basename(REGLAMENTOS_DIR)).toBe('reglamentos');
      expect(path.basename(path.dirname(REGLAMENTOS_DIR))).toBe('uploads');
    });

    it('las extensiones y los MIME_formats permitidos no se solapan con ejecutables', () => {
      // La defensa real esta en el controlador (magic bytes), pero la lista
      // tiene que excluir por si sola cualquier cosa que se pueda ejecutar.
      const peligrosos = ['.exe', '.sh', '.bat', '.cmd', '.js', '.php', '.svg', '.html'];
      for (const ext of peligrosos) {
        expect(ALLOWED_EXTENSIONS).not.toContain(ext);
      }
    });

    it('la extension y el MIME declarado tienen que estar en la lista', () => {
      expect(ALLOWED_EXTENSIONS).toEqual(expect.arrayContaining(['.pdf', '.docx', '.jpg', '.png']));
      expect(ALLOWED_MIME_TYPES).toEqual(expect.arrayContaining(['application/pdf', 'image/png']));
    });
  });

  describe('limitarCuerpo', () => {
    // Un request como lo ve express: solo hacen falta headers, on y destroy.
    const reqFalso = (headers) => {
      const req = new EventEmitter();
      req.headers = headers;
      req.destroy = jest.fn();
      return req;
    };

    // En chunked next() se llama primero sin argumentos (el middleware sigue la
    // cadena) y despues con el error, asi que se busca la primera llamada que
    // efectivamente lleva un error.
    const errorDe = (next) => {
      const llamada = next.mock.calls.find((args) => args.length > 0);
      if (!llamada) throw new Error('limitarCuerpo no llamo next con ningun error');
      const err = llamada[0];
      return { statusCode: err.statusCode, isOperational: err.isOperational, msg: err.message };
    };

    it('deja pasar un body dentro del limite', () => {
      const next = jest.fn();
      const req = reqFalso({ 'content-length': '1000' });

      limitarCuerpo(req, {}, next);

      expect(next).toHaveBeenCalledWith();
      expect(next.mock.calls[0]).toHaveLength(0);
    });

    it('corta con 413 un body que supera el limite', () => {
      const next = jest.fn();
      // El corte por Content-Length usa el margen de multipart (64 KB), asi que
      // "supera el limite" significa superar ese margen, no MAX_FILE_BYTES pelado.
      const req = reqFalso({ 'content-length': String(MAX_BODY_BYTES + 1) });

      limitarCuerpo(req, {}, next);

      expect(req.destroy).not.toHaveBeenCalled();
      expect(errorDe(next)).toMatchObject({ statusCode: 413, isOperational: true });
      expect(errorDe(next).msg).toMatch(/8 MB/);
    });

    it('acepta un body exactamente en el limite', () => {
      const next = jest.fn();
      // El margen existe para el envelope de multipart: el corte es
      // estrictamente mayor, asi que un body en el borde tiene que pasar.
      limitarCuerpo(reqFalso({ 'content-length': String(MAX_BODY_BYTES) }), {}, next);
      expect(next.mock.calls[0]).toHaveLength(0);
    });

    it('sin Content-Length no aplica el corte por header', () => {
      const next = jest.fn();
      limitarCuerpo(reqFalso({}), {}, next);
      expect(next.mock.calls[0]).toHaveLength(0);
    });

    it('un Content-Length no numerico se trata como ausente', () => {
      const next = jest.fn();
      limitarCuerpo(reqFalso({ 'content-length': 'no-es-un-numero' }), {}, next);
      expect(next.mock.calls[0]).toHaveLength(0);
    });

    it('en chunked no corta hasta que se supera el limite', () => {
      const next = jest.fn();
      const req = reqFalso({ 'transfer-encoding': 'chunked' });

      limitarCuerpo(req, {}, next);
      expect(next.mock.calls[0]).toHaveLength(0);

      req.emit('data', Buffer.alloc(1024));
      expect(next.mock.calls[0]).toHaveLength(0);
      expect(req.destroy).not.toHaveBeenCalled();
    });

    it('en chunked destruye el stream al superar el limite', () => {
      const next = jest.fn();
      const req = reqFalso({ 'transfer-encoding': 'chunked' });

      limitarCuerpo(req, {}, next);
      req.emit('data', Buffer.alloc(MAX_BODY_BYTES + 1));

      expect(req.destroy).toHaveBeenCalled();
      expect(errorDe(next)).toMatchObject({ statusCode: 413, isOperational: true });
    });

    it('en chunked acumula varios chunks antes de decidir', () => {
      const next = jest.fn();
      const req = reqFalso({ 'transfer-encoding': 'chunked' });

      limitarCuerpo(req, {}, next);
      // Dos chunks que en conjunto siguen bajo el margen.
      req.emit('data', Buffer.alloc(MAX_BODY_BYTES / 2));
      req.emit('data', Buffer.alloc(MAX_BODY_BYTES / 2));
      expect(req.destroy).not.toHaveBeenCalled();

      // El tercero cierra el paso al corte, que es estrictamente mayor.
      req.emit('data', Buffer.alloc(2));
      expect(req.destroy).toHaveBeenCalled();
    });

    it('sin transfer-encoding chunked no registra listener de data', () => {
      const next = jest.fn();
      const req = reqFalso({});

      limitarCuerpo(req, {}, next);
      expect(req.listenerCount('data')).toBe(0);
    });

    it('el error es operacional para que lo formatee el middleware', () => {
      // Si no fuera operacional, errorHandler lo trataria como 500 en vez de 413.
      const next = jest.fn();
      limitarCuerpo(reqFalso({ 'content-length': String(MAX_BODY_BYTES + 1) }), {}, next);
      expect(errorDe(next).isOperational).toBe(true);
    });
  });
});
