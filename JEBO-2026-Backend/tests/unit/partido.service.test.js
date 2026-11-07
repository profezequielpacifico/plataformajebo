const partidoService = require('../../src/services/partido.service');
const { PartidoRepository, StaffPartidoRepository, PosicionRepository, RelojRepository } = require('../../src/repositories');
const { query: dbQuery } = require('../../src/config/database.js');
const logger = require('../../src/config/logger');
const { NotFoundError, BusinessError, ForbiddenError } = require('../../src/utils/errors');
const { ESTADOS_PARTIDO, ESTADOS_RELOJ, ROLES, ROLES_ARBITRO } = require('../../src/constants');

jest.mock('../../src/repositories', () => ({
  PartidoRepository: {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    cerrarResultado: jest.fn(),
    updateStatus: jest.fn(),
    delete: jest.fn(),
    fechaDeHoy: jest.fn()
  },
  StaffPartidoRepository: {
    findByPartido: jest.fn(),
    create: jest.fn(),
    deleteByPartido: jest.fn()
  },
  PosicionRepository: { recalcular: jest.fn() },
  RelojRepository: {
    segundosActuales: jest.fn(),
    iniciar: jest.fn(),
    pausar: jest.fn(),
    reanudar: jest.fn(),
    finalizar: jest.fn()
  }
}));
jest.mock('../../src/services/bitacora.service', () => ({ log: jest.fn() }));
jest.mock('../../src/services/disponibilidad.service', () => ({ createDisponibilidad: jest.fn() }));
jest.mock('../../src/config/logger', () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn() }));

jest.mock('../../src/config/knex', () => {
  const TABLAS = {
    posicion: { pluck: [], first: null },
    equipo: { pluck: [], first: { nombre: 'Equipo genérico' } },
    'torneo as t': { pluck: [], first: { torneo_nombre: 'Torneo genérico', tipo_competencia: 'MARCADOR', disciplina_nombre: 'Fútbol' }, limit: [] },
    fecha_cancha: { pluck: [], first: { id_fecha_cancha: 1, fecha: '2026-10-01' } },
    fecha_horario: { pluck: [], first: { id_fecha_horario: 1 } },
    cancha: { pluck: [], first: null, limit: [] },
    disponibilidad_cancha: { pluck: [], first: { id_disponibilidad: 99 } }
  };

  let INSCRITOS = [100, 101];

  const knexMock = jest.fn((tabla) => {
    const spec = { ...(TABLAS[tabla] || { pluck: [], first: null, limit: [] }) };
    if (tabla === 'posicion') {
      spec.pluck = jest.fn(async () => INSCRITOS);
    }
    const resolver = (metodo) => {
      const v = spec[metodo];
      if (typeof v === 'function') return Promise.resolve(v());
      return Promise.resolve(v);
    };
    const qb = {
      where: jest.fn(() => qb),
      whereIn: jest.fn(() => qb),
      whereNotNull: jest.fn(() => qb),
      leftJoin: jest.fn(() => qb),
      join: jest.fn(() => qb),
      select: jest.fn(() => qb),
      pluck: jest.fn(() => resolver('pluck')),
      first: jest.fn(() => resolver('first')),
      limit: jest.fn(() => resolver('limit')),
      insert: jest.fn(() => Promise.resolve([spec.first || {}])),
      del: jest.fn(async () => 1),
      update: jest.fn(async () => 1),
      orderBy: jest.fn(async () => [])
    };
    qb.then = (onFulfilled) => Promise.resolve(onFulfilled(spec.first || {}));
    if (spec.pluck !== undefined) qb.pluck = jest.fn(() => resolver('pluck'));
    if (spec.first !== undefined) qb.first = jest.fn(() => resolver('first'));
    if (spec.limit !== undefined) qb.limit = jest.fn(() => resolver('limit'));
    return qb;
  });
  knexMock.fn = jest.fn();
  knexMock.raw = jest.fn(() => ({ then: (r) => Promise.resolve(r ? undefined : undefined) }));
  knexMock.TIPO = 'mock';
  knexMock.__setInscriptos = (v) => { INSCRITOS = v; };
  knexMock.__setTipoCompetencia = (tipo, nombre = 'Gimnasia Artística') => {
    TABLAS['torneo as t'].first = {
      torneo_nombre: tipo === 'MARCADOR' ? 'Torneo genérico' : 'Torneo Gimnasia JEBO 2026',
      tipo_competencia: tipo,
      disciplina_nombre: nombre
    };
  };
  return knexMock;
});

const { PartidoRepository: PR, StaffPartidoRepository: SR, PosicionRepository: PoR, RelojRepository: RR } = require('../../src/repositories');
const bitacoraService = require('../../src/services/bitacora.service');
const disponibilidadService = require('../../src/services/disponibilidad.service');

const ARBITRO = { id_usuario: 7 };
const CTX_ARBITRO = { userId: 7, rol: ROLES.ARBITRO, ip: '10.0.0.1', userAgent: 'jest' };
const CTX_ADMIN = { userId: 1, rol: ROLES.ADMIN, ip: '10.0.0.1', userAgent: 'jest' };

const partidoBase = (over = {}) => ({
  id_partido: 1,
  id_torneo: 10,
  id_equipo_local: 100,
  id_equipo_visitante: 101,
  estado: ESTADOS_PARTIDO.PROGRAMADO,
  resultado_cargado: false,
  reloj_estado: ESTADOS_RELOJ.PENDIENTE,
  ...over
});

const knexMock = require('../../src/config/knex');

describe('partido.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    knexMock.__setInscriptos([100, 101]);
    knexMock.__setTipoCompetencia('MARCADOR', 'Fútbol');
  });

  describe('findAll / findMios', () => {
    it('findAll delega sin tocar los parametros', async () => {
      PR.findAll.mockResolvedValue([partidoBase()]);
      const params = { page: 1 };

      const r = await partidoService.findAll(params);

      expect(PR.findAll).toHaveBeenCalledWith(params);
      expect(r).toHaveLength(1);
    });

    it('findMios de un arbitro filtra por su usuario', async () => {
      await partidoService.findMios({ page: 1 }, { userId: 7, rol: ROLES.ARBITRO });

      expect(PR.findAll).toHaveBeenCalledWith({ page: 1, id_usuario_arbitro: 7 });
    });

    it('findMios de un admin no filtra, para que vea todos', async () => {
      await partidoService.findMios({ page: 1 }, { userId: 1, rol: ROLES.ADMIN });

      expect(PR.findAll).toHaveBeenCalledWith({ page: 1 });
    });

    it('findMios sin contexto filtra con userId undefined', async () => {
      await partidoService.findMios({});
      expect(PR.findAll).toHaveBeenCalledWith({ id_usuario_arbitro: undefined });
    });
  });

  describe('findById', () => {
    it('devuelve el partido', async () => {
      PR.findById.mockResolvedValue(partidoBase());
      expect((await partidoService.findById(1)).id_partido).toBe(1);
    });

    it('lanza NotFoundError si no existe', async () => {
      PR.findById.mockResolvedValue(null);
      await expect(partidoService.findById(999)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('_assertArbitroAsignado', () => {
    it('el admin pasa sin consultar el staff', async () => {
      await partidoService._assertArbitroAsignado(1, 1, ROLES.ADMIN);
      expect(SR.findByPartido).not.toHaveBeenCalled();
    });

    it('un rol que no es arbitro ni admin queda afuera', async () => {
      await expect(partidoService._assertArbitroAsignado(1, 7, ROLES.PROFESOR))
        .rejects.toBeInstanceOf(ForbiddenError);
      expect(SR.findByPartido).not.toHaveBeenCalled();
    });

    it('el arbitro asignado puede operar', async () => {
      SR.findByPartido.mockResolvedValue([{ id_usuario: 7 }]);
      await expect(partidoService._assertArbitroAsignado(1, 7, ROLES.ARBITRO)).resolves.toBeUndefined();
    });

    it('compara como string para no fallar por tipo de id', async () => {
      SR.findByPartido.mockResolvedValue([{ id_usuario: '7' }]);
      await expect(partidoService._assertArbitroAsignado(1, 7, ROLES.ARBITRO)).resolves.toBeUndefined();
    });

    it('un arbitro no asignado no puede operar', async () => {
      SR.findByPartido.mockResolvedValue([{ id_usuario: 99 }]);
      await expect(partidoService._assertArbitroAsignado(1, 7, ROLES.ARBITRO))
        .rejects.toBeInstanceOf(ForbiddenError);
    });

    it('un partido sin staff no deja pasar a nadie', async () => {
      SR.findByPartido.mockResolvedValue([]);
      await expect(partidoService._assertArbitroAsignado(1, 7, ROLES.ARBITRO))
        .rejects.toBeInstanceOf(ForbiddenError);
    });
  });

  describe('_recalcularPosiciones', () => {
    it('no hace nada sin torneo', async () => {
      await partidoService._recalcularPosiciones(null);
      expect(PoR.recalcular).not.toHaveBeenCalled();
    });

    it('recalcula cuando hay torneo', async () => {
      PoR.recalcular.mockResolvedValue([]);
      await partidoService._recalcularPosiciones(10);
      expect(PoR.recalcular).toHaveBeenCalledWith(10, null);
    });

    it('un fallo al recalcular no rompe la operacion', async () => {
      PoR.recalcular.mockRejectedValue(new Error('vista posiciones caida'));
      await expect(partidoService._recalcularPosiciones(10)).resolves.toBeUndefined();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('_assertEquiposInscriptos', () => {
    it('rechaza un equipo que no esta inscripto', async () => {
      knexMock.__setInscriptos([]);
      await expect(partidoService._assertEquiposInscriptos(10, 100, 101))
        .rejects.toBeInstanceOf(BusinessError);
    });

    it('el mensaje de error nombra al equipo cuando existe', async () => {
      knexMock.__setInscriptos([]);
      await expect(partidoService._assertEquiposInscriptos(10, 100, 101))
        .rejects.toThrow(/Equipo genérico/);
    });

    it('no consulta nada si algun id no es numerico', async () => {
      const knex = require('../../src/config/knex');
      knex.mockClear();

      await expect(partidoService._assertEquiposInscriptos(10, 'abc', 'xyz'))
        .resolves.toBeUndefined();
      expect(knex).not.toHaveBeenCalledWith('posicion');
    });
  });

  describe('_resolveDisponibilidad', () => {
    it('devuelve null si ya viene id_disponibilidad', async () => {
      const r = await partidoService._resolveDisponibilidad({ id_disponibilidad: 55 });
      expect(r).toBeNull();
      expect(disponibilidadService.createDisponibilidad).not.toHaveBeenCalled();
    });

    it('delega al servicio de disponibilidad con fecha, hora y cancha', async () => {
      disponibilidadService.createDisponibilidad.mockResolvedValue({ id_disponibilidad: 77 });
      const r = await partidoService._resolveDisponibilidad({
        fecha: '2026-10-01', hora: '09:00', id_cancha: 5
      });
      expect(disponibilidadService.createDisponibilidad).toHaveBeenCalledWith(5, '2026-10-01', '09:00');
      expect(r).toBe(77);
    });

    it('devuelve null sin datos de fecha', async () => {
      expect(await partidoService._resolveDisponibilidad({})).toBeNull();
      expect(await partidoService._resolveDisponibilidad({ fecha: '2026-10-01', hora: '09:00' })).toBeNull();
    });
  });

  describe('create', () => {
    beforeEach(() => {
      PR.create.mockResolvedValue(partidoBase());
    });

    describe('torneos de tipo EVALUACION (Gimnasia)', () => {
      beforeEach(() => {
        knexMock.__setTipoCompetencia('EVALUACION');
      });

      it('rechaza crear un partido y dice que se cargan como presentaciones', async () => {
        await expect(partidoService.create(
          { id_torneo: 10, id_equipo_local: 100, id_equipo_visitante: 101,
            fecha: '2026-10-01', hora: '09:00', id_cancha: 5 },
          CTX_ADMIN
        )).rejects.toThrow(BusinessError);

        await expect(partidoService.create(
          { id_torneo: 10, id_equipo_local: 100, id_equipo_visitante: 101 },
          CTX_ADMIN
        )).rejects.toThrow(/no tiene partidos/);
      });

      it('no llega ni a resolver la disponibilidad de cancha', async () => {
        await expect(partidoService.create(
          { id_torneo: 10, id_equipo_local: 100, id_equipo_visitante: 101,
            fecha: '2026-10-01', hora: '09:00', id_cancha: 5 },
          CTX_ADMIN
        )).rejects.toThrow();

        expect(disponibilidadService.createDisponibilidad).not.toHaveBeenCalled();
        expect(PR.create).not.toHaveBeenCalled();
      });

      it('el mensaje nombra la disciplina, no un error generico', async () => {
        const err = await partidoService.create(
          { id_torneo: 10, id_equipo_local: 100, id_equipo_visitante: 101 },
          CTX_ADMIN
        ).catch(e => e);

        expect(err.message).toContain('Gimnasia Artística');
        expect(err.message).toContain('Torneo Gimnasia JEBO 2026');
        expect(err.message).toMatch(/Presentaciones/);
      });
    });

    it('quita los campos que no son columnas y crea el partido', async () => {
      const data = {
        id_torneo: 10,
        id_equipo_local: 100,
        id_equipo_visitante: 101,
        fecha: '2026-10-01',
        hora: '09:00',
        id_cancha: 5,
        arbitros: [7, 8]
      };
      await partidoService.create(data, CTX_ADMIN);

      const enviado = PR.create.mock.calls[0][0];
      expect(enviado).not.toHaveProperty('fecha');
      expect(enviado).not.toHaveProperty('hora');
      expect(enviado).not.toHaveProperty('id_cancha');
      expect(enviado).not.toHaveProperty('arbitros');
      expect(enviado.id_torneo).toBe(10);
    });

    it('resuelve la disponibilidad y la adjunta', async () => {
      disponibilidadService.createDisponibilidad.mockResolvedValue({ id_disponibilidad: 77 });
      await partidoService.create(
        { id_torneo: 10, id_equipo_local: 100, id_equipo_visitante: 101,
          fecha: '2026-10-01', hora: '09:00', id_cancha: 5 },
        CTX_ADMIN
      );

      expect(PR.create.mock.calls[0][0].id_disponibilidad).toBe(77);
    });

    it('inscribe cada arbitro en el staff, el primero como principal', async () => {
      await partidoService.create(
        { id_torneo: 10, id_equipo_local: 100, id_equipo_visitante: 101, arbitros: [7, 8] },
        CTX_ADMIN
      );

      expect(SR.create).toHaveBeenCalledTimes(2);
      expect(SR.create).toHaveBeenNthCalledWith(1, 1, 7, ROLES_ARBITRO.PRINCIPAL);
      expect(SR.create).toHaveBeenNthCalledWith(2, 1, 8, ROLES_ARBITRO.ASISTENTE);
    });

    it('ignora arbitros que no vienen en array', async () => {
      await partidoService.create(
        { id_torneo: 10, id_equipo_local: 100, id_equipo_visitante: 101, arbitros: '7' },
        CTX_ADMIN
      );

      expect(SR.create).not.toHaveBeenCalled();
    });

    it('registra la creacion en la bitacora con la ip del contexto', async () => {
      await partidoService.create(
        { id_torneo: 10, id_equipo_local: 100, id_equipo_visitante: 101 },
        CTX_ADMIN
      );

      expect(bitacoraService.log).toHaveBeenCalledWith(expect.objectContaining({
        action: 'CREAR_PARTIDO', entityId: 1, ip: '10.0.0.1', userAgent: 'jest'
      }));
    });
  });

  describe('update', () => {
    it('no deja mover el partido a un torneo de Gimnasia', async () => {
      PR.findById.mockResolvedValue(partidoBase({ id_torneo: 10 }));
      knexMock.__setTipoCompetencia('EVALUACION');

      await expect(partidoService.update(1, { id_torneo: 99 }, CTX_ADMIN))
        .rejects.toThrow(/no tiene partidos/);
      expect(PR.update).not.toHaveBeenCalled();
    });

    it('deja actualizar un partido cuyo torneo sigue siendo de marcador', async () => {
      PR.findById.mockResolvedValue(partidoBase({ id_torneo: 10 }));
      PR.update.mockResolvedValue(partidoBase({ goles_local: 3 }));

      const r = await partidoService.update(1, { goles_local: 3 }, CTX_ADMIN);

      expect(PR.update).toHaveBeenCalledWith(1, { goles_local: 3 });
      expect(r.goles_local).toBe(3);
    });

    it('no deja modificar un partido finalizado', async () => {
      PR.findById.mockResolvedValue(partidoBase({ estado: ESTADOS_PARTIDO.FINALIZADO }));
      await expect(partidoService.update(1, { goles_local: 1 }, CTX_ADMIN))
        .rejects.toBeInstanceOf(BusinessError);
      expect(PR.update).not.toHaveBeenCalled();
    });

    it('actualiza sin tocar equipos cuando no vienen en el body', async () => {
      PR.findById.mockResolvedValue(partidoBase());
      PR.update.mockResolvedValue(partidoBase({ goles_local: 2 }));

      const r = await partidoService.update(1, { goles_local: 2 }, CTX_ADMIN);

      expect(PR.update).toHaveBeenCalledWith(1, { goles_local: 2 });
      expect(r.goles_local).toBe(2);
    });

    it('valida la inscripcion cuando cambian los equipos', async () => {
      PR.findById.mockResolvedValue(partidoBase());
      knexMock.__setInscriptos([]);
      await expect(partidoService.update(1, { id_equipo_local: 200 }, CTX_ADMIN))
        .rejects.toBeInstanceOf(BusinessError);
      expect(PR.update).not.toHaveBeenCalled();
    });

    it('reemplaza el staff cuando llega la lista de arbitros', async () => {
      PR.findById.mockResolvedValue(partidoBase());
      await partidoService.update(1, { arbitros: [9] }, CTX_ADMIN);

      expect(SR.deleteByPartido).toHaveBeenCalledWith(1);
      expect(SR.create).toHaveBeenCalledWith(1, 9, ROLES_ARBITRO.PRINCIPAL);
    });

    it('deja el staff intacto si no viene la lista', async () => {
      PR.findById.mockResolvedValue(partidoBase());
      PR.update.mockResolvedValue(partidoBase());
      await partidoService.update(1, { goles_local: 1 }, CTX_ADMIN);

      expect(SR.deleteByPartido).not.toHaveBeenCalled();
    });

    it('devuelve null cuando el body solo trae campos descartados', async () => {
      PR.findById.mockResolvedValue(partidoBase());
      const r = await partidoService.update(1, { fecha: '2026-10-01' }, CTX_ADMIN);

      expect(PR.update).not.toHaveBeenCalled();
      expect(r).toBeNull();
      expect(bitacoraService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ACTUALIZAR_PARTIDO' })
      );
    });

    it('no deja actualizar un partido inexistente', async () => {
      PR.findById.mockResolvedValue(null);
      await expect(partidoService.update(999, { goles_local: 1 }, CTX_ADMIN))
        .rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('updateResult', () => {
    const conReloj = (over = {}) => partidoBase({
      estado: ESTADOS_PARTIDO.EN_JUEGO,
      reloj_estado: ESTADOS_RELOJ.PAUSADO,
      ...over
    });

    it('sella el resultado desde el ledger, sin goles del cliente', async () => {
      PR.findById.mockResolvedValue(conReloj());
      SR.findByPartido.mockResolvedValue([ARBITRO]);
      PR.cerrarResultado.mockResolvedValue(conReloj({ goles_local: 3, goles_visitante: 1 }));

      const r = await partidoService.updateResult(1, CTX_ARBITRO);

      expect(PR.cerrarResultado).toHaveBeenCalledWith(1);
      expect(r.goles_local).toBe(3);
      expect(r.goles_visitante).toBe(1);
    });

    it('no recalcula posiciones: eso ocurre al finalizar', async () => {
      PR.findById.mockResolvedValue(conReloj());
      SR.findByPartido.mockResolvedValue([ARBITRO]);
      PR.cerrarResultado.mockResolvedValue(conReloj({ resultado_cargado: true }));

      await partidoService.updateResult(1, CTX_ARBITRO);

      expect(PoR.recalcular).not.toHaveBeenCalled();
    });

    it('un arbitro no asignado no sella el resultado', async () => {
      PR.findById.mockResolvedValue(conReloj());
      SR.findByPartido.mockResolvedValue([{ id_usuario: 99 }]);

      await expect(partidoService.updateResult(1, CTX_ARBITRO))
        .rejects.toBeInstanceOf(ForbiddenError);
      expect(PR.cerrarResultado).not.toHaveBeenCalled();
    });

    it('el admin puede sellar el resultado sin estar en el staff', async () => {
      PR.findById.mockResolvedValue(conReloj());
      PR.cerrarResultado.mockResolvedValue(conReloj());

      await partidoService.updateResult(1, CTX_ADMIN);
      expect(PR.cerrarResultado).toHaveBeenCalledWith(1);
    });

    it('exige que el reloj se haya iniciado alguna vez', async () => {
      PR.findById.mockResolvedValue(partidoBase({
        estado: ESTADOS_PARTIDO.EN_JUEGO,
        reloj_estado: ESTADOS_RELOJ.PENDIENTE
      }));
      SR.findByPartido.mockResolvedValue([ARBITRO]);

      await expect(partidoService.updateResult(1, CTX_ARBITRO))
        .rejects.toBeInstanceOf(BusinessError);
      expect(PR.cerrarResultado).not.toHaveBeenCalled();
    });

    it('un 0-0 es un resultado valido si el reloj arranco', async () => {
      PR.findById.mockResolvedValue(conReloj());
      SR.findByPartido.mockResolvedValue([ARBITRO]);
      PR.cerrarResultado.mockResolvedValue(conReloj({ goles_local: 0, goles_visitante: 0 }));

      const r = await partidoService.updateResult(1, CTX_ARBITRO);
      expect(r.goles_local).toBe(0);
    });

    it('no se puede volver a sellar un partido ya finalizado', async () => {
      PR.findById.mockResolvedValue(conReloj({ estado: ESTADOS_PARTIDO.FINALIZADO }));
      SR.findByPartido.mockResolvedValue([ARBITRO]);

      await expect(partidoService.updateResult(1, CTX_ARBITRO))
        .rejects.toBeInstanceOf(BusinessError);
      expect(PR.cerrarResultado).not.toHaveBeenCalled();
    });

    it('deja el resultado sellado aunque fallen las posiciones', async () => {
      PR.findById.mockResolvedValue(conReloj());
      SR.findByPartido.mockResolvedValue([ARBITRO]);
      PR.cerrarResultado.mockResolvedValue(conReloj({ goles_local: 2, resultado_cargado: true }));

      const r = await partidoService.updateResult(1, CTX_ARBITRO);
      expect(r.goles_local).toBe(2);
    });

    it('registra el sellado en la bitacora con el numero congelado', async () => {
      PR.findById.mockResolvedValue(conReloj());
      SR.findByPartido.mockResolvedValue([ARBITRO]);
      PR.cerrarResultado.mockResolvedValue(conReloj({ goles_local: 4, goles_visitante: 2 }));

      await partidoService.updateResult(1, CTX_ARBITRO);
      expect(bitacoraService.log).toHaveBeenCalledWith(expect.objectContaining({
        action: 'SELLAR_RESULTADO_PARTIDO', detail: { goles_local: 4, goles_visitante: 2 }
      }));
    });
  });

  describe('updateStatus', () => {
    it('exige resultado cargado antes de finalizar', async () => {
      PR.findById.mockResolvedValue(partidoBase({ resultado_cargado: false }));
      SR.findByPartido.mockResolvedValue([ARBITRO]);

      await expect(partidoService.updateStatus(1, ESTADOS_PARTIDO.FINALIZADO, CTX_ARBITRO))
        .rejects.toBeInstanceOf(BusinessError);
      expect(PR.updateStatus).not.toHaveBeenCalled();
    });

    it('finaliza si el resultado ya esta cargado y recalcula', async () => {
      PR.findById.mockResolvedValue(partidoBase({ resultado_cargado: true }));
      SR.findByPartido.mockResolvedValue([ARBITRO]);
      PR.updateStatus.mockResolvedValue(partidoBase({ estado: ESTADOS_PARTIDO.FINALIZADO }));
      PoR.recalcular.mockResolvedValue([]);

      const r = await partidoService.updateStatus(1, ESTADOS_PARTIDO.FINALIZADO, CTX_ARBITRO);

      expect(PR.updateStatus).toHaveBeenCalledWith(1, ESTADOS_PARTIDO.FINALIZADO);
      expect(PoR.recalcular).toHaveBeenCalledWith(10, null);
      expect(r.estado).toBe(ESTADOS_PARTIDO.FINALIZADO);
    });

    it('finalizar cierra tambien el reloj', async () => {
      PR.findById.mockResolvedValue(partidoBase({ resultado_cargado: true }));
      SR.findByPartido.mockResolvedValue([ARBITRO]);
      PR.updateStatus.mockResolvedValue(partidoBase({ estado: ESTADOS_PARTIDO.FINALIZADO }));
      PoR.recalcular.mockResolvedValue([]);

      await partidoService.updateStatus(1, ESTADOS_PARTIDO.FINALIZADO, CTX_ARBITRO);

      expect(RR.finalizar).toHaveBeenCalledWith(1);
    });

    it('suspender pausa el reloj que estaba corriendo', async () => {
      PR.findById.mockResolvedValue(partidoBase({
        estado: ESTADOS_PARTIDO.EN_JUEGO,
        reloj_estado: ESTADOS_RELOJ.EN_CURSO
      }));
      SR.findByPartido.mockResolvedValue([ARBITRO]);
      PR.updateStatus.mockResolvedValue(partidoBase({ estado: ESTADOS_PARTIDO.SUSPENDIDO }));

      await partidoService.updateStatus(1, ESTADOS_PARTIDO.SUSPENDIDO, CTX_ARBITRO);

      expect(RR.pausar).toHaveBeenCalledWith(1);
      expect(RR.reanudar).not.toHaveBeenCalled();
    });

    it('reanudar un suspended reanuda el reloj pausado', async () => {
      PR.findById.mockResolvedValue(partidoBase({
        estado: ESTADOS_PARTIDO.SUSPENDIDO,
        reloj_estado: ESTADOS_RELOJ.PAUSADO
      }));
      SR.findByPartido.mockResolvedValue([ARBITRO]);
      PR.updateStatus.mockResolvedValue(partidoBase({ estado: ESTADOS_PARTIDO.EN_JUEGO }));

      await partidoService.updateStatus(1, ESTADOS_PARTIDO.EN_JUEGO, CTX_ARBITRO);

      expect(RR.reanudar).toHaveBeenCalledWith(1);
    });

    it('volver a En Juego sin venir de Suspendido no toca el reloj', async () => {
      PR.findById.mockResolvedValue(partidoBase({
        estado: ESTADOS_PARTIDO.EN_JUEGO,
        reloj_estado: ESTADOS_RELOJ.EN_CURSO
      }));
      SR.findByPartido.mockResolvedValue([ARBITRO]);
      PR.updateStatus.mockResolvedValue(partidoBase({ estado: ESTADOS_PARTIDO.EN_JUEGO }));

      await partidoService.updateStatus(1, ESTADOS_PARTIDO.EN_JUEGO, CTX_ARBITRO);

      expect(RR.pausar).not.toHaveBeenCalled();
      expect(RR.reanudar).not.toHaveBeenCalled();
    });

    it('no recalcula al cambiar a un estado que no es final', async () => {
      PR.findById.mockResolvedValue(partidoBase());
      SR.findByPartido.mockResolvedValue([ARBITRO]);
      PR.updateStatus.mockResolvedValue(partidoBase({ estado: ESTADOS_PARTIDO.EN_JUEGO }));

      await partidoService.updateStatus(1, ESTADOS_PARTIDO.EN_JUEGO, CTX_ARBITRO);
      expect(PoR.recalcular).not.toHaveBeenCalled();
    });

    it('no deja cambiar el estado de un partido ya finalizado', async () => {
      PR.findById.mockResolvedValue(partidoBase({ estado: ESTADOS_PARTIDO.FINALIZADO }));
      await expect(partidoService.updateStatus(1, ESTADOS_PARTIDO.EN_JUEGO, CTX_ARBITRO))
        .rejects.toBeInstanceOf(BusinessError);
    });

    it('un arbitro no asignado no cambia el estado', async () => {
      PR.findById.mockResolvedValue(partidoBase());
      SR.findByPartido.mockResolvedValue([]);

      await expect(partidoService.updateStatus(1, ESTADOS_PARTIDO.EN_JUEGO, CTX_ARBITRO))
        .rejects.toBeInstanceOf(ForbiddenError);
      expect(PR.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe('arranque limitado al dia de la fecha', () => {
    const HOY = '2026-09-30';

    beforeEach(() => {
      SR.findByPartido.mockResolvedValue([ARBITRO]);
      PR.fechaDeHoy.mockResolvedValue(HOY);
    });

    const partidoPara = (fecha, over = {}) => partidoBase({
      fecha,
      estado: ESTADOS_PARTIDO.PROGRAMADO,
      ...over
    });

    it('arranca cuando la fecha del partido es hoy', async () => {
      PR.findById.mockResolvedValue(partidoPara(HOY));
      PR.updateStatus.mockResolvedValue(partidoPara(HOY, { estado: ESTADOS_PARTIDO.EN_JUEGO }));

      const r = await partidoService.updateStatus(1, ESTADOS_PARTIDO.EN_JUEGO, CTX_ARBITRO);

      expect(PR.updateStatus).toHaveBeenCalledWith(1, ESTADOS_PARTIDO.EN_JUEGO);
      expect(r.estado).toBe(ESTADOS_PARTIDO.EN_JUEGO);
    });

    it('no deja arrancar despues de la fecha', async () => {
      PR.findById.mockResolvedValue(partidoPara('2026-09-29'));

      await expect(partidoService.updateStatus(1, ESTADOS_PARTIDO.EN_JUEGO, CTX_ARBITRO))
        .rejects.toThrow(/2026-09-29.*2026-09-30/);
      expect(PR.updateStatus).not.toHaveBeenCalled();
    });

    it('no deja arrancar antes de la fecha', async () => {
      PR.findById.mockResolvedValue(partidoPara('2026-10-01'));

      await expect(partidoService.updateStatus(1, ESTADOS_PARTIDO.EN_JUEGO, CTX_ARBITRO))
        .rejects.toBeInstanceOf(BusinessError);
      expect(PR.updateStatus).not.toHaveBeenCalled();
    });

    it('el mensaje dice si la fecha ya paso o si todavia no llega', async () => {
      PR.findById.mockResolvedValue(partidoPara('2026-09-29'));
      await expect(partidoService.updateStatus(1, ESTADOS_PARTIDO.EN_JUEGO, CTX_ARBITRO))
        .rejects.toThrow(/ya pas/);

      PR.findById.mockResolvedValue(partidoPara('2026-10-05'));
      await expect(partidoService.updateStatus(1, ESTADOS_PARTIDO.EN_JUEGO, CTX_ARBITRO))
        .rejects.toThrow(/Todav/);
    });

    it('reanudar un suspendido NO se bloquea aunque la fecha sea de ayer', async () => {
      PR.findById.mockResolvedValue(partidoPara('2026-09-25', {
        estado: ESTADOS_PARTIDO.SUSPENDIDO,
        reloj_estado: ESTADOS_RELOJ.PAUSADO
      }));
      PR.updateStatus.mockResolvedValue(partidoPara('2026-09-25', { estado: ESTADOS_PARTIDO.EN_JUEGO }));

      const r = await partidoService.updateStatus(1, ESTADOS_PARTIDO.EN_JUEGO, CTX_ARBITRO);

      expect(PR.updateStatus).toHaveBeenCalledWith(1, ESTADOS_PARTIDO.EN_JUEGO);
      expect(RR.reanudar).toHaveBeenCalledWith(1);
      expect(r.estado).toBe(ESTADOS_PARTIDO.EN_JUEGO);
    });

    it('un partido sin fecha se puede arrancar y queda asentado en bitacora', async () => {
      PR.findById.mockResolvedValue(partidoPara(''));
      PR.updateStatus.mockResolvedValue(partidoPara('', { estado: ESTADOS_PARTIDO.EN_JUEGO }));

      await partidoService.updateStatus(1, ESTADOS_PARTIDO.EN_JUEGO, CTX_ARBITRO);

      expect(PR.updateStatus).toHaveBeenCalledWith(1, ESTADOS_PARTIDO.EN_JUEGO);
      expect(bitacoraService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'INICIAR_PARTIDO_SIN_FECHA' })
      );
    });

    it('la regla le llega igual al admin: es del partido, no de la persona', async () => {
      PR.findById.mockResolvedValue(partidoPara('2026-09-29'));

      await expect(partidoService.updateStatus(1, ESTADOS_PARTIDO.EN_JUEGO, CTX_ADMIN))
        .rejects.toBeInstanceOf(BusinessError);
      expect(PR.updateStatus).not.toHaveBeenCalled();
    });

    it('el admin si arranca un partido de hoy', async () => {
      PR.findById.mockResolvedValue(partidoPara(HOY));
      PR.updateStatus.mockResolvedValue(partidoPara(HOY, { estado: ESTADOS_PARTIDO.EN_JUEGO }));

      await partidoService.updateStatus(1, ESTADOS_PARTIDO.EN_JUEGO, CTX_ADMIN);

      expect(PR.updateStatus).toHaveBeenCalledWith(1, ESTADOS_PARTIDO.EN_JUEGO);
    });

    it('"hoy" lo decide la base y no el reloj de Node', async () => {
      PR.findById.mockResolvedValue(partidoPara(HOY));
      PR.updateStatus.mockResolvedValue(partidoPara(HOY, { estado: ESTADOS_PARTIDO.EN_JUEGO }));

      await partidoService.updateStatus(1, ESTADOS_PARTIDO.EN_JUEGO, CTX_ARBITRO);

      expect(PR.fechaDeHoy).toHaveBeenCalled();
    });

    it('no consulta la fecha cuando la transicion no es un comienzo', async () => {
      PR.findById.mockResolvedValue(partidoPara('2026-09-25', {
        estado: ESTADOS_PARTIDO.EN_JUEGO,
        reloj_estado: ESTADOS_RELOJ.EN_CURSO,
        resultado_cargado: true
      }));
      PR.updateStatus.mockResolvedValue(partidoPara('2026-09-25', { estado: ESTADOS_PARTIDO.SUSPENDIDO }));

      await partidoService.updateStatus(1, ESTADOS_PARTIDO.SUSPENDIDO, CTX_ARBITRO);

      expect(PR.fechaDeHoy).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('borra, recalcula y registra', async () => {
      PR.findById.mockResolvedValue(partidoBase());
      PR.delete.mockResolvedValue(1);
      PoR.recalcular.mockResolvedValue([]);

      const r = await partidoService.delete(1, CTX_ADMIN);

      expect(PR.delete).toHaveBeenCalledWith(1);
      expect(PoR.recalcular).toHaveBeenCalledWith(10, null);
      expect(bitacoraService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ELIMINAR_PARTIDO' })
      );
      expect(r).toBe(1);
    });

    it('no borra un partido inexistente', async () => {
      PR.findById.mockResolvedValue(null);
      await expect(partidoService.delete(999, CTX_ADMIN)).rejects.toBeInstanceOf(NotFoundError);
      expect(PR.delete).not.toHaveBeenCalled();
    });

    it('el borrado no exige rol de arbitro', async () => {
      PR.findById.mockResolvedValue(partidoBase());
      PR.delete.mockResolvedValue(1);
      PoR.recalcular.mockResolvedValue([]);

      await partidoService.delete(1, { userId: 3, rol: ROLES.PROFESOR });
      expect(PR.delete).toHaveBeenCalledWith(1);
    });
  });
});
