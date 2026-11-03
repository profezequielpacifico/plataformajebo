const autorizacionService = require('../../src/services/autorizacion.service');
const {
  PresentacionRepository,
  StaffPartidoRepository,
  StaffPresentacionRepository
} = require('../../src/repositories');
const knex = require('../../src/config/knex');
const { ForbiddenError, NotFoundError, BusinessError } = require('../../src/utils/errors');
const { ROLES, ESTADOS_PRESENTACION } = require('../../src/constants');

// La autorizacion de recurso es la unica regla que combina rol + fila +
// asignacion. Se aislan los repositorios y knex para ejercitar cada rama sin
// Postgres: lo que se prueba es la decision, no el SQL.
jest.mock('../../src/repositories', () => ({
  PresentacionRepository: { findById: jest.fn() },
  StaffPartidoRepository: { findByPartido: jest.fn() },
  StaffPresentacionRepository: { findById: jest.fn() }
}));

// `autorizacion.service` toca el driver de dos formas: `knex('equipo').where(...).first()`
// (un equipo puntual) y `knex('equipo').whereIn(...).select(...)` (un lote). El
// mock es una cadena que devuelve siempre el mismo builder, y el builder es
// awaitable, asi que las dos formas funcionan sin branching en el mock.
jest.mock('../../src/config/knex', () => {
  const consulta = jest.fn();
  const builder = {};
  builder.where = jest.fn(() => builder);
  builder.whereIn = jest.fn(() => builder);
  builder.select = jest.fn(() => builder);
  builder.first = jest.fn(() => consulta());
  builder.then = (onCumple, onRechaza) => consulta().then(onCumple, onRechaza);

  const fn = jest.fn(() => builder);
  fn.__consulta = consulta;
  fn.__builder = builder;
  // Nombre viejo, que usan los tests de equipo puntual.
  fn.__first = consulta;
  return fn;
});

const ADMIN = { id: 1, rol: ROLES.ADMIN };
const SUPERADMIN = { id: 20, rol: ROLES.SUPERADMIN };
const ARBITRO = { id: 7, rol: ROLES.ARBITRO };
const JUEZ = { id: 8, rol: ROLES.JUEZ };
const PROFESOR = { id: 9, rol: ROLES.PROFESOR };

beforeEach(() => {
  jest.clearAllMocks();
});

describe('autorizacion.service', () => {
  describe('esAdministrador', () => {
    it('SuperAdmin y Administrador si; el resto no', () => {
      expect(autorizacionService.esAdministrador(ROLES.SUPERADMIN)).toBe(true);
      expect(autorizacionService.esAdministrador(ROLES.ADMIN)).toBe(true);
      expect(autorizacionService.esAdministrador(ROLES.ARBITRO)).toBe(false);
      expect(autorizacionService.esAdministrador(ROLES.JUEZ)).toBe(false);
      expect(autorizacionService.esAdministrador(ROLES.PROFESOR)).toBe(false);
    });
  });

  describe('esJuezDelJurado', () => {
    it('es true para los roles del jurado', async () => {
      StaffPresentacionRepository.findById.mockResolvedValue({ rol: 'JUEZ_PRESIDENTE' });
      await expect(autorizacionService.esJuezDelJurado(1, JUEZ.id)).resolves.toBe(true);
    });

    it('es false si esta en el staff pero no es juez (secretario)', async () => {
      StaffPresentacionRepository.findById.mockResolvedValue({ rol: 'SECRETARIO' });
      await expect(autorizacionService.esJuezDelJurado(1, JUEZ.id)).resolves.toBe(false);
    });

    it('es false si no esta en el staff', async () => {
      StaffPresentacionRepository.findById.mockResolvedValue(undefined);
      await expect(autorizacionService.esJuezDelJurado(1, JUEZ.id)).resolves.toBe(false);
    });
  });

  describe('assertOperarPartido', () => {
    it('el admin pasa sin consultar el staff', async () => {
      await expect(autorizacionService.assertOperarPartido(ADMIN, 1)).resolves.toBe(true);
      expect(StaffPartidoRepository.findByPartido).not.toHaveBeenCalled();
    });

    it('el SuperAdmin tambien pasa (generaliza el guard viejo)', async () => {
      await expect(autorizacionService.assertOperarPartido(SUPERADMIN, 1)).resolves.toBe(true);
      expect(StaffPartidoRepository.findByPartido).not.toHaveBeenCalled();
    });

    it('un rol que no es arbitro ni admin queda afuera sin consultar el staff', async () => {
      await expect(autorizacionService.assertOperarPartido(PROFESOR, 1))
        .rejects.toBeInstanceOf(ForbiddenError);
      expect(StaffPartidoRepository.findByPartido).not.toHaveBeenCalled();
    });

    it('el arbitro asignado puede operar', async () => {
      StaffPartidoRepository.findByPartido.mockResolvedValue([{ id_usuario: 7 }]);
      await expect(autorizacionService.assertOperarPartido(ARBITRO, 1)).resolves.toBe(true);
    });

    it('compara como string para no fallar por tipo de id', async () => {
      StaffPartidoRepository.findByPartido.mockResolvedValue([{ id_usuario: '7' }]);
      await expect(autorizacionService.assertOperarPartido(ARBITRO, 1)).resolves.toBe(true);
    });

    it('un arbitro no asignado no puede operar', async () => {
      StaffPartidoRepository.findByPartido.mockResolvedValue([{ id_usuario: 99 }]);
      await expect(autorizacionService.assertOperarPartido(ARBITRO, 1))
        .rejects.toBeInstanceOf(ForbiddenError);
    });

    it('un partido sin staff no deja pasar a nadie', async () => {
      StaffPartidoRepository.findByPartido.mockResolvedValue([]);
      await expect(autorizacionService.assertOperarPartido(ARBITRO, 1))
        .rejects.toBeInstanceOf(ForbiddenError);
    });

    it('sin usuario autenticado no hay operacion', async () => {
      await expect(autorizacionService.assertOperarPartido(null, 1))
        .rejects.toBeInstanceOf(ForbiddenError);
    });
  });

  describe('assertEvaluarPresentacion', () => {
    it('el admin pasa sin mirar el jurado', async () => {
      await expect(autorizacionService.assertEvaluarPresentacion(ADMIN, 1)).resolves.toBe(true);
      expect(StaffPresentacionRepository.findById).not.toHaveBeenCalled();
    });

    it('el juez del jurado de esta presentacion pasa', async () => {
      StaffPresentacionRepository.findById.mockResolvedValue({ rol: 'JUEZ' });
      await expect(autorizacionService.assertEvaluarPresentacion(JUEZ, 1)).resolves.toBe(true);
      expect(StaffPresentacionRepository.findById)
        .toHaveBeenCalledWith(1, JUEZ.id);
    });

    it('un juez que no esta en el jurado no pasa', async () => {
      StaffPresentacionRepository.findById.mockResolvedValue(undefined);
      await expect(autorizacionService.assertEvaluarPresentacion(JUEZ, 1))
        .rejects.toBeInstanceOf(ForbiddenError);
    });

    it('un secretario no evalua aunque figure en el staff', async () => {
      StaffPresentacionRepository.findById.mockResolvedValue({ rol: 'SECRETARIO' });
      await expect(autorizacionService.assertEvaluarPresentacion(JUEZ, 1))
        .rejects.toBeInstanceOf(ForbiddenError);
    });

    it('un Profesor no evalua', async () => {
      await expect(autorizacionService.assertEvaluarPresentacion(PROFESOR, 1))
        .rejects.toBeInstanceOf(ForbiddenError);
      expect(StaffPresentacionRepository.findById).not.toHaveBeenCalled();
    });

    it('con exigirEnCurso, una presentacion PROGRAMADA no se evalua', async () => {
      PresentacionRepository.findById.mockResolvedValue({ estado: ESTADOS_PRESENTACION.PROGRAMADA });
      await expect(autorizacionService.assertEvaluarPresentacion(ADMIN, 1, { exigirEnCurso: true }))
        .rejects.toBeInstanceOf(BusinessError);
    });

    it('con exigirEnCurso, EN_CURSO deja seguir (y ahi si mira el jurado del juez)', async () => {
      PresentacionRepository.findById.mockResolvedValue({ estado: ESTADOS_PRESENTACION.EN_CURSO });
      StaffPresentacionRepository.findById.mockResolvedValue({ rol: 'JUEZ_PRESIDENTE' });
      await expect(autorizacionService.assertEvaluarPresentacion(JUEZ, 1, { exigirEnCurso: true }))
        .resolves.toBe(true);
    });

    it('con exigirEnCurso, una presentacion inexistente da 404', async () => {
      PresentacionRepository.findById.mockResolvedValue(null);
      await expect(autorizacionService.assertEvaluarPresentacion(ADMIN, 1, { exigirEnCurso: true }))
        .rejects.toBeInstanceOf(NotFoundError);
    });

    it('sin usuario autenticado no hay evaluacion', async () => {
      await expect(autorizacionService.assertEvaluarPresentacion(null, 1))
        .rejects.toBeInstanceOf(ForbiddenError);
    });
  });

  describe('assertGestionarEquipoPropio', () => {
    it('el admin pasa sin consultar la fila', async () => {
      await expect(autorizacionService.assertGestionarEquipoPropio(ADMIN, 1)).resolves.toBe(true);
      expect(knex.__first).not.toHaveBeenCalled();
    });

    it('el SuperAdmin tambien pasa', async () => {
      await expect(autorizacionService.assertGestionarEquipoPropio(SUPERADMIN, 1)).resolves.toBe(true);
      expect(knex.__first).not.toHaveBeenCalled();
    });

    it('el Profesor dueño del equipo pasa', async () => {
      knex.__first.mockResolvedValue({ id_equipo: 1, id_usuario: 9 });
      await expect(autorizacionService.assertGestionarEquipoPropio(PROFESOR, 1)).resolves.toBe(true);
    });

    it('un Profesor ajeno al equipo no pasa', async () => {
      knex.__first.mockResolvedValue({ id_equipo: 1, id_usuario: 99 });
      await expect(autorizacionService.assertGestionarEquipoPropio(PROFESOR, 1))
        .rejects.toBeInstanceOf(ForbiddenError);
    });

    it('un equipo inexistente da 404 para un Profesor', async () => {
      knex.__first.mockResolvedValue(null);
      await expect(autorizacionService.assertGestionarEquipoPropio(PROFESOR, 1))
        .rejects.toBeInstanceOf(NotFoundError);
    });

    it('un Juez no administra equipos', async () => {
      await expect(autorizacionService.assertGestionarEquipoPropio(JUEZ, 1))
        .rejects.toBeInstanceOf(ForbiddenError);
      expect(knex.__first).not.toHaveBeenCalled();
    });
  });

  /**
   * El lote de inscripciones es el caso donde el permiso NO depende de que haya
   * un id en la ruta: `POST /teams/enroll-batch` no tiene `:id` y sin embargo la
   * propiedad de los equipos sigue mandando. La regla que se prueba es
   * "todo o nada": si uno solo es ajeno, no se inscribe ninguno.
   */
  describe('assertGestionarEquiposPropiosBatch', () => {
    // El servicio recibe SOLO los ids de equipo: lo demas del lote (el torneo,
    // el estado) es validacion de negocio, y mezclarla con el permiso haria que
    // un error de dato se reportara como un error de permisos.
    it('el Administrador pasa sin consultar los propietarios', async () => {
      await expect(autorizacionService.assertGestionarEquiposPropiosBatch(ADMIN, [1, 2, 3])).resolves.toBe(true);
      expect(knex.__consulta).not.toHaveBeenCalled();
    });

    it('el SuperAdmin tambien, sin consultar', async () => {
      await expect(autorizacionService.assertGestionarEquiposPropiosBatch(SUPERADMIN, [1, 2, 3])).resolves.toBe(true);
      expect(knex.__consulta).not.toHaveBeenCalled();
    });

    it('el Profesor pasa si TODOS los equipos del lote son suyos', async () => {
      knex.__consulta.mockResolvedValue([
        { id_equipo: 1, id_usuario: 9 },
        { id_equipo: 2, id_usuario: 9 }
      ]);
      await expect(
        autorizacionService.assertGestionarEquiposPropiosBatch(PROFESOR, [1, 2])
      ).resolves.toBe(true);
    });

    it('compara los propietarios como string: el id del body es texto', async () => {
      // `req.body` llega como texto y `id_usuario` vuelve del driver como
      // entero. Con `!==` el `9 !== '9'` rechazaba al dueño legítimo.
      knex.__consulta.mockResolvedValue([
        { id_equipo: '1', id_usuario: '9' },
        { id_equipo: '2', id_usuario: 9 }
      ]);
      await expect(
        autorizacionService.assertGestionarEquiposPropiosBatch(PROFESOR, ['1', '2'])
      ).resolves.toBe(true);
    });

    it('un solo equipo ajeno rechaza el lote entero', async () => {
      knex.__consulta.mockResolvedValue([
        { id_equipo: 1, id_usuario: 9 },
        { id_equipo: 2, id_usuario: 99 }
      ]);
      await expect(
        autorizacionService.assertGestionarEquiposPropiosBatch(PROFESOR, [1, 2])
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('un id inexistente da 404 nombrando cual falta', async () => {
      knex.__consulta.mockResolvedValue([{ id_equipo: 1, id_usuario: 9 }]);
      const error = await autorizacionService
        .assertGestionarEquiposPropiosBatch(PROFESOR, [1, 2, 3])
        .catch((e) => e);

      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.message).toContain('2');
      expect(error.message).toContain('3');
    });

    it('la inexistencia se detecta antes que la propiedad', async () => {
      // Un id que no existe no puede ser "ajeno" ni "propio". Si el orden fuera
      // al reves, el mensaje seria de propiedad y confirmaria que el id existe.
      knex.__consulta.mockResolvedValue([]);
      await expect(autorizacionService.assertGestionarEquiposPropiosBatch(PROFESOR, [404]))
        .rejects.toBeInstanceOf(NotFoundError);
    });

    it('un lote vacio es un error de negocio, no un exito silencioso', async () => {
      // Un 200 con `0 equipos inscritos` no le dice nada al que lo pidio: parece
      // que funciono. El mensaje obliga a mirar el body.
      await expect(autorizacionService.assertGestionarEquiposPropiosBatch(PROFESOR, []))
        .rejects.toBeInstanceOf(BusinessError);
      await expect(autorizacionService.assertGestionarEquiposPropiosBatch(PROFESOR, undefined))
        .rejects.toBeInstanceOf(BusinessError);
      expect(knex.__consulta).not.toHaveBeenCalled();
    });

    it('para el Administrador el lote vacio no es un problema', async () => {
      // El admin no tiene la restriccion de propiedad, asi que un lote vacio es
      // un no-op legitimo. La validacion de negocio del equipo (torneo inexistente,
      //etc.) la hace `_assertRegistration` para todos los roles.
      await expect(autorizacionService.assertGestionarEquiposPropiosBatch(ADMIN, [])).resolves.toBe(true);
    });

    it('un rol sin permiso no llega a consultar los equipos', async () => {
      await expect(autorizacionService.assertGestionarEquiposPropiosBatch(ARBITRO, [1]))
        .rejects.toBeInstanceOf(ForbiddenError);
      await expect(autorizacionService.assertGestionarEquiposPropiosBatch(JUEZ, [1]))
        .rejects.toBeInstanceOf(ForbiddenError);
      expect(knex.__consulta).not.toHaveBeenCalled();
    });

    it('sin usuario autenticado no hay lote', async () => {
      await expect(autorizacionService.assertGestionarEquiposPropiosBatch(null, [1]))
        .rejects.toBeInstanceOf(ForbiddenError);
    });
  });
});
