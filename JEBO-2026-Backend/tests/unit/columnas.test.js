const columnas = require('../../src/utils/columnas');
const { columnasDe, validarColumnas, limpiarCache, COLUMNAS_SISTEMA } = columnas;
const { ValidationError } = require('../../src/utils/errors');
const knex = require('../../src/config/knex');

jest.mock('../../src/config/knex', () => jest.fn());

describe('columnas', () => {
  const conColumnas = (lista) => {
    knex.mockImplementation(() => {
      const qb = {
        select: jest.fn(() => qb),
        where: jest.fn(() => qb),
        andWhere: jest.fn(async () => lista.map((column_name) => ({ column_name })))
      };
      return qb;
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    limpiarCache();
    conColumnas(['id_usuario', 'nombre', 'email', 'password_hash', 'id_rol', 'estado']);
  });

  describe('columnasDe', () => {
    it('arma el Set con las columnas reales de la tabla', async () => {
      const c = await columnasDe('usuario');
      expect(c.has('email')).toBe(true);
      expect(c.has('no_existe')).toBe(false);
    });

    it('cachea la consulta por tabla', async () => {
      await columnasDe('usuario');
      await columnasDe('usuario');
      await columnasDe('usuario');
      expect(knex).toHaveBeenCalledTimes(1);
    });

    it('cachea cada tabla por separado', async () => {
      await columnasDe('usuario');
      await columnasDe('equipo');
      expect(knex).toHaveBeenCalledTimes(2);
    });

    it('limpiarCache fuerza a volver a consultar', async () => {
      await columnasDe('usuario');
      limpiarCache();
      await columnasDe('usuario');
      expect(knex).toHaveBeenCalledTimes(2);
    });

    it('devuelve un Set y no un array', async () => {
      expect(await columnasDe('usuario')).toBeInstanceOf(Set);
    });
  });

  describe('validarColumnas', () => {
    it('deja pasar un body con solo columnas validas', async () => {
      const data = { nombre: 'Ana', email: 'ana@ejemplo.com' };
      expect(await validarColumnas('usuario', data)).toBe(data);
    });

    it('rechaza una columna que no existe en la tabla', async () => {
      await expect(validarColumnas('usuario', { nombre: 'Ana', hack: 1 }))
        .rejects.toBeInstanceOf(ValidationError);
    });

    it('el mensaje de columna desconocida la nombra', async () => {
      await expect(validarColumnas('usuario', { hack: 1 }))
        .rejects.toThrow(/no válido para usuario: hack/);
    });

    it('acusa recibo de todas las columnas desconocidas juntas', async () => {
      await expect(validarColumnas('usuario', { a: 1, b: 2, c: 3 }))
        .rejects.toThrow(/a, b, c/);
    });

    it('usa el plural correcto segun cuantas son', async () => {
      await expect(validarColumnas('usuario', { hack: 1 })).rejects.toThrow(/Campo no válido/);
      await expect(validarColumnas('usuario', { a: 1, b: 2 })).rejects.toThrow(/Campos no válidos/);
    });

    it('rechaza la PK aunque sea una columna real', async () => {
      await expect(validarColumnas('usuario', { id_usuario: 5 }, { pk: 'id_usuario' }))
        .rejects.toThrow(/id_usuario no se puede enviar/);
    });

    it('no confunde la PK con una columna cualquiera', async () => {
      const data = { id_usuario: 5 };
      expect(await validarColumnas('usuario', data)).toBe(data);
    });

    it('rechaza las columnas de la lista bloquear', async () => {
      await expect(validarColumnas('usuario', { email: 'a@b.com', id_rol: 1 },
        { pk: 'id_usuario', bloquear: ['id_rol'] }))
        .rejects.toThrow(/id_rol no se puede enviar/);
    });

    it('acusa recibo de varias columnas bloqueadas juntas', async () => {
      await expect(validarColumnas('usuario', { id_rol: 1, estado: 'Administrador' },
        { bloquear: ['id_rol', 'estado'] }))
        .rejects.toThrow(/id_rol, estado/);
    });

    it('la lista bloquear solo aplica a lo que llega en el body', async () => {
      const data = { email: 'a@b.com' };
      expect(await validarColumnas('usuario', data, { bloquear: ['id_rol', 'estado'] })).toBe(data);
    });

    it('chequea columnas desconocidas antes que la PK', async () => {
      await expect(validarColumnas('usuario', { hack: 1, id_usuario: 2 }, { pk: 'id_usuario' }))
        .rejects.toThrow(/hack/);
    });

    it('ignora una data que no es objeto', async () => {
      for (const v of [null, undefined, 'texto', 42, true]) {
        expect(await validarColumnas('usuario', v)).toBe(v);
      }
    });

    it('ignora un array', async () => {
      const arr = [1, 2];
      expect(await validarColumnas('usuario', arr)).toBe(arr);
    });

    it('no consulta la base si la data no es un objeto', async () => {
      await validarColumnas('usuario', null);
      expect(knex).not.toHaveBeenCalled();
    });
  });

  describe('COLUMNAS_SISTEMA', () => {
    it('incluye todo lo que no se puede dejar escribir desde el body', () => {
      for (const col of ['password', 'password_hash', 'id_rol', 'rol', 'estado',
        'ultimo_acceso', 'created_at', 'updated_at']) {
        expect(COLUMNAS_SISTEMA.has(col)).toBe(true);
      }
    });

    it('no incluye la PK: esa se bloquea por separado', () => {
      expect(COLUMNAS_SISTEMA.has('id_usuario')).toBe(false);
    });
  });
});
