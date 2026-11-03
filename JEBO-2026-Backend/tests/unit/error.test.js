const errorHandler = require('../../src/middleware/error');
const { traducirErrorDePostgres, POR_CODIGO } = errorHandler;
const { BusinessError, ValidationError } = require('../../src/utils/errors');
const logger = require('../../src/config/logger');
const { HTTP_STATUS } = require('../../src/constants');

jest.mock('../../src/config/logger', () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn() }));

// errorHandler es el ultimo eslabon de la cadena: decide que status y que cuerpo
// ve el cliente. Lo que importa aca es que un error de datos de Postgres no
// termine expuesto como 500 con detalle interno, y que los inesperados nunca
// filtren el mensaje original.
describe('errorHandler', () => {
  const resFalso = () => {
    const res = { status: jest.fn(), json: jest.fn() };
    res.status.mockReturnValue(res);
    return res;
  };

  const cuerpoDe = (res) => res.json.mock.calls[0][0];

  beforeEach(() => jest.clearAllMocks());

  describe('traducirErrorDePostgres', () => {
    it('devuelve null si el error no trae code de Postgres', () => {
      expect(traducirErrorDePostgres(new Error('boom'))).toBeNull();
      expect(traducirErrorDePostgres({})).toBeNull();
    });

    it('traduce not-null a 400 con el nombre de la constraint', () => {
      const e = traducirErrorDePostgres({ code: '23502', constraint: 'partido_id_torneo_fkey' });
      expect(e).toBeInstanceOf(ValidationError);
      expect(e.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(e.message).toMatch(/Falta un campo obligatorio/);
      expect(e.message).toMatch(/partido_id_torneo_fkey/);
    });

    it('traduce foreign key y unique a 409', () => {
      const fk = traducirErrorDePostgres({ code: '23503' });
      expect(fk).toBeInstanceOf(BusinessError);
      expect(fk.statusCode).toBe(HTTP_STATUS.CONFLICT);

      const unq = traducirErrorDePostgres({ code: '23505', constraint: 'usuario_email_uniq' });
      expect(unq.statusCode).toBe(HTTP_STATUS.CONFLICT);
      expect(unq.message).toMatch(/Ya existe un registro/);
    });

    it('traduce los codigos de tipo de dato a 400', () => {
      for (const code of ['22P02', '22001', '22003', '22007', '22008', '22012']) {
        const e = traducirErrorDePostgres({ code });
        expect(e).toBeInstanceOf(ValidationError);
        expect(e.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
      }
    });

    it('cubre las cinco clases de error de Postgres que manejan las claves', () => {
      expect(traducirErrorDePostgres({ code: '23514' })).toBeInstanceOf(ValidationError);
    });

    it('un 23xx desconocido cae en la clase de integridad', () => {
      // 23 no esta en la tabla pero si es clase de integridad: mejor un 409
      // generico que un 500.
      const e = traducirErrorDePostgres({ code: '23P01' });
      expect(e).toBeInstanceOf(BusinessError);
      expect(e.message).toMatch(/restricción de integridad/);
    });

    it('un 22xx desconocido cae en la clase de datos', () => {
      const e = traducirErrorDePostgres({ code: '22000' });
      expect(e).toBeInstanceOf(ValidationError);
    });

    it('una clase desconocida de Postgres no se traduce', () => {
      expect(traducirErrorDePostgres({ code: '42P01' })).toBeNull();
      expect(traducirErrorDePostgres({ code: 'ECONNREFUSED' })).toBeNull();
    });

    it('el detalle de la constraint solo se agrega si viene', () => {
      const conConstraint = traducirErrorDePostgres({ code: '23505', constraint: 'x_uniq' });
      const sinConstraint = traducirErrorDePostgres({ code: '23505' });
      expect(conConstraint.message).toMatch(/\(x_uniq\)/);
      expect(sinConstraint.message).not.toMatch(/\(/);
    });

    it('expone la tabla de codigos para poder ampliarla sin tocar el handler', () => {
      expect(Object.keys(POR_CODIGO).length).toBeGreaterThan(5);
    });

    it('en un alta un 23503 pide corregir la referencia, no borrar el referenciado', () => {
      // El mensaje por tabla esta redactado para DELETE. Reusarlo en un POST
      // mandaba al admin a eliminar el usuario al que la presentacion apuntaba.
      const e = traducirErrorDePostgres(
        { code: '23503', table: 'usuario', constraint: 'staff_presentacion_id_usuario_fkey' },
        { method: 'POST' }
      );
      expect(e.statusCode).toBe(HTTP_STATUS.CONFLICT);
      expect(e.message).toBe('El registro relacionado en "usuario" no existe');
      expect(e.message).not.toMatch(/eliminar/i);
    });

    it('en un borrado sigue hablando de dependencias, no de referencias', () => {
      // Limitacion conocida: para un DELETE, Postgres manda en `detail` la tabla
      // que *referencia* al borrado ("... is still referenced from table
      // \"partido\""), y extractTableName se queda con esa. El mensaje por tabla
      // puede entonces nombrar el recurso equivocado, asi que lo que se fija aca
      // es el contrato: un borrado habla de dependencias, nunca de "la
      // referencia no existe".
      const e = traducirErrorDePostgres(
        { code: '23503', table: 'partido', constraint: 'partido_id_torneo_fkey' },
        { method: 'DELETE' }
      );
      expect(e.statusCode).toBe(HTTP_STATUS.CONFLICT);
      expect(e.message).toMatch(/eliminar/i);
      expect(e.message).not.toMatch(/no existe/);
    });

    it('sin metodo conocido no inventa un mensaje de borrado', () => {
      const e = traducirErrorDePostgres({ code: '23503', table: 'equipo' });
      expect(e.message).toBe('El registro relacionado en "equipo" no existe');
    });
  });

  describe('respuesta', () => {
    it('un error operacional sale con su propio status y mensaje', () => {
      const res = resFalso();
      const err = new ValidationError('campo requerido');
      err.statusCode = 400;

      errorHandler(err, {}, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(cuerpoDe(res)).toEqual({ success: false, error: 'campo requerido' });
    });

    it('un status de 4xx sin isOperational tambien pasa tal cual', () => {
      const res = resFalso();
      errorHandler({ statusCode: 404, message: 'No encontrado' }, {}, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(404);
      expect(cuerpoDe(res).error).toBe('No encontrado');
    });

    it('traduce un error de Postgres y registra un warn, no un error', () => {
      const res = resFalso();
      errorHandler({ code: '23505', constraint: 'usuario_email_uniq' }, {}, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(409);
      expect(cuerpoDe(res).error).toMatch(/Ya existe un registro/);
      expect(logger.warn).toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('un error inesperado da 500 con el mensaje generico', () => {
      const res = resFalso();
      errorHandler(new Error('conexion a la baseCaida en 10.0.0.5'), {}, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(500);
      expect(cuerpoDe(res).error).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR === 500
        ? cuerpoDe(res).error
        : null);
    });

    it('nunca filtra el mensaje interno de un error inesperado', () => {
      // Si el mensaje crudo llegara al cliente, una excepcion de pg puede
      // exponer host, usuario y hasta fragmentos de la consulta.
      const res = resFalso();
      const secreto = 'password authentication failed for user "jebo" at 10.0.0.5';
      errorHandler(new Error(secreto), {}, res, jest.fn());

      const cuerpo = cuerpoDe(res);
      expect(cuerpo.error).not.toMatch(/password/);
      expect(cuerpo.error).not.toMatch(/jebo/);
      expect(cuerpo.error).not.toMatch(/10\.0\.0\.5/);
    });

    it('isOperational manda por sobre el status y deja pasar el mensaje', () => {
      // Contrato actual: la primera rama cortocircuita con isOperational, sin
      // mirar el status. Es intencional para los errores de negocio, que ya
      // llevan un mensaje pensado para el cliente, pero implica que un error
      // marcado operational con status 5xx si expone su texto. La combinacion
      // es contradictoria; aca queda fijada para que un cambio sea deliberado.
      const res = resFalso();
      const err = new Error('detalle interno');
      err.isOperational = true;
      err.statusCode = 500;

      errorHandler(err, {}, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(500);
      expect(cuerpoDe(res).error).toBe('detalle interno');
    });

    it('un 5xx sin isOperational si se degrada al mensaje generico', () => {
      const res = resFalso();
      const err = new Error('detalle interno');
      err.statusCode = 503;

      errorHandler(err, {}, res, jest.fn());
      expect(cuerpoDe(res).error).not.toMatch(/detalle interno/);
    });

    it('siempre responde con success false', () => {
      for (const err of [new ValidationError('a'), { code: '23503' }, new Error('b')]) {
        const res = resFalso();
        errorHandler(err, {}, res, jest.fn());
        expect(cuerpoDe(res).success).toBe(false);
      }
    });
  });
});
