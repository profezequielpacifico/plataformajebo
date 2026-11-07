const canchaService = require('../../src/services/cancha.service');
const disponibilidadService = require('../../src/services/disponibilidad.service');
const { CanchaRepository, CanchaHorarioRepository } = require('../../src/repositories');
const DisponibilidadRepository = require('../../src/repositories/disponibilidad.repository');
const bitacoraService = require('../../src/services/bitacora.service');
const { NotFoundError, ValidationError } = require('../../src/utils/errors');
const knex = require('../../src/config/knex');

jest.mock('../../src/repositories', () => ({
  CanchaRepository: {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  CanchaHorarioRepository: {
    findAllHorarios: jest.fn(),
    findSchedule: jest.fn(),
    replaceSchedule: jest.fn()
  }
}));
jest.mock('../../src/repositories/disponibilidad.repository', () => ({
  findAvailableSlots: jest.fn()
}));
jest.mock('../../src/services/bitacora.service', () => ({ log: jest.fn() }));

jest.mock('../../src/config/knex', () => {
  const knexMock = jest.fn();
  knexMock.transaction = jest.fn();
  return knexMock;
});

const CTX = { userId: 5, ip: '10.0.0.1', userAgent: 'jest' };
const cancha = { id_cancha: 3, nombre: 'Cancha 1' };

describe('cancha.service', () => {
  beforeEach(() => jest.clearAllMocks());

  it('findById devuelve la cancha', async () => {
    CanchaRepository.findById.mockResolvedValue(cancha);
    expect(await canchaService.findById(3)).toEqual(cancha);
  });

  it('findById tira 404 si no existe', async () => {
    CanchaRepository.findById.mockResolvedValue(null);
    await expect(canchaService.findById(999)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('create delega y audita', async () => {
    CanchaRepository.create.mockResolvedValue(cancha);
    const r = await canchaService.create({ nombre: 'Cancha 1' }, CTX);

    expect(r).toEqual(cancha);
    expect(bitacoraService.log).toHaveBeenCalledWith(expect.objectContaining({
      action: 'CREAR_CANCHA', entityId: 3
    }));
  });

  it('update exige que la cancha exista antes de escribir', async () => {
    CanchaRepository.findById.mockResolvedValue(cancha);
    CanchaRepository.update.mockResolvedValue({ ...cancha, nombre: 'Renombrada' });

    const r = await canchaService.update(3, { nombre: 'Renombrada' }, CTX);

    expect(r.nombre).toBe('Renombrada');
    expect(CanchaRepository.findById).toHaveBeenCalledWith(3);
  });

  it('update no escribe si la cancha no existe', async () => {
    CanchaRepository.findById.mockResolvedValue(null);
    await expect(canchaService.update(999, { nombre: 'x' }, CTX)).rejects.toBeInstanceOf(NotFoundError);
    expect(CanchaRepository.update).not.toHaveBeenCalled();
  });

  it('delete exige que exista y devuelve el id borrado', async () => {
    CanchaRepository.findById.mockResolvedValue(cancha);
    CanchaRepository.delete.mockResolvedValue(3);

    expect(await canchaService.delete(3, CTX)).toBe(3);
    expect(bitacoraService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ELIMINAR_CANCHA' })
    );
  });

  it('getHorarios delega en el repo de horarios', async () => {
    CanchaHorarioRepository.findAllHorarios.mockResolvedValue([{ hora_inicio: '09:00' }]);
    expect(await canchaService.getHorarios()).toHaveLength(1);
  });

  it('getSchedule valida que la cancha exista', async () => {
    CanchaRepository.findById.mockResolvedValue(cancha);
    CanchaHorarioRepository.findSchedule.mockResolvedValue([{ dia_semana: 1 }]);

    const r = await canchaService.getSchedule(3);

    expect(r).toHaveLength(1);
    expect(CanchaHorarioRepository.findSchedule).toHaveBeenCalledWith(3);
  });

  it('getSchedule de una cancha inexistente no consulta el calendario', async () => {
    CanchaRepository.findById.mockResolvedValue(null);
    await expect(canchaService.getSchedule(999)).rejects.toBeInstanceOf(NotFoundError);
    expect(CanchaHorarioRepository.findSchedule).not.toHaveBeenCalled();
  });

  it('updateSchedule reemplaza toda la grilla de la cancha', async () => {
    CanchaRepository.findById.mockResolvedValue(cancha);
    CanchaHorarioRepository.replaceSchedule.mockResolvedValue(5);

    const r = await canchaService.updateSchedule(3, [{ dia_semana: 1, id_horario_cancha: 1 }], CTX);

    expect(r).toBe(5);
    expect(bitacoraService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ACTUALIZAR_HORARIOS_CANCHA' })
    );
  });

  it('updateSchedule sin items vacia la grilla en vez de fallar', async () => {
    CanchaRepository.findById.mockResolvedValue(cancha);
    CanchaHorarioRepository.replaceSchedule.mockResolvedValue(0);

    await canchaService.updateSchedule(3, null, CTX);

    expect(CanchaHorarioRepository.replaceSchedule).toHaveBeenCalledWith(3, []);
  });

  it('findAll delega sin argumentos', async () => {
    CanchaRepository.findAll.mockResolvedValue([cancha]);
    expect(await canchaService.findAll()).toHaveLength(1);
  });
});

describe('disponibilidad.service', () => {
  const TABLAS = {
    fecha_cancha: { first: { id_fecha_cancha: 1 } },
    horarios_cancha: { all: [{ id_horario_cancha: 1, hora_inicio: '09:00:00' }, { id_horario_cancha: 2, hora_inicio: '18:30:00' }] },
    fecha_horario: { first: { id_fecha_horario: 1 } },
    disponibilidad_cancha: { first: { id_disponibilidad: 7 } }
  };
  const inserts = [];

  beforeEach(() => {
    jest.clearAllMocks();
    inserts.length = 0;
    knex.mockImplementation((tabla) => {
      const spec = TABLAS[tabla] || { first: null, all: [] };
      const qb = {
        where: jest.fn(() => qb),
        whereIn: jest.fn(() => qb),
        orderBy: jest.fn(async () => spec.all || []),
        first: jest.fn(async () => (spec.first === undefined ? null : spec.first)),
        insert: jest.fn((valores) => {
          inserts.push({ tabla, valores });
          const fila = { id_disponibilidad: 99, ...valores };
          return { returning: jest.fn(() => Promise.resolve([fila])), then: (f) => Promise.resolve(f([fila])) };
        })
      };
      qb.then = (f) => Promise.resolve(f(spec.all || spec.first || {}));
      return qb;
    });
  });

  it('getAvailableSlots delega en el repo', async () => {
    DisponibilidadRepository.findAvailableSlots.mockResolvedValue([{ hora: '09:00' }]);
    const r = await disponibilidadService.getAvailableSlots(3, '2026-10-01');
    expect(r).toHaveLength(1);
    expect(DisponibilidadRepository.findAvailableSlots).toHaveBeenCalledWith(3, '2026-10-01');
  });

  it('reutiliza las filas existentes y devuelve la disponibilidad', async () => {
    const r = await disponibilidadService.createDisponibilidad(3, '2026-10-01', '09:00');

    expect(r.id_disponibilidad).toBe(7);
    expect(inserts).toHaveLength(0);
  });

  it('rechaza un horario que no existe y los lista en el mensaje', async () => {
    await expect(disponibilidadService.createDisponibilidad(3, '2026-10-01', '23:00'))
      .rejects.toBeInstanceOf(ValidationError);
    await expect(disponibilidadService.createDisponibilidad(3, '2026-10-01', '23:00'))
      .rejects.toThrow(/Horarios disponibles: 09:00, 18:30/);
  });

  it('compara el horario por HH:MM y no exige segundos', async () => {
    await disponibilidadService.createDisponibilidad(3, '2026-10-01', '18:30');
    expect(inserts).toHaveLength(0);
  });

  it('acepta la hora con espacios alrededor', async () => {
    await disponibilidadService.createDisponibilidad(3, '2026-10-01', '  09:00  ');
    expect(inserts).toHaveLength(0);
  });

  it('crea fecha_cancha cuando no existe', async () => {
    TABLAS.fecha_cancha = { first: null };
    await disponibilidadService.createDisponibilidad(3, '2026-10-01', '09:00');

    expect(inserts[0]).toEqual({ tabla: 'fecha_cancha', valores: { fecha: '2026-10-01' } });
    TABLAS.fecha_cancha = { first: { id_fecha_cancha: 1 } };
  });

  it('crea la disponibilidad si no estaba', async () => {
    TABLAS.disponibilidad_cancha = { first: null };
    const r = await disponibilidadService.createDisponibilidad(3, '2026-10-01', '09:00');

    expect(inserts.map((i) => i.tabla)).toContain('disponibilidad_cancha');
    expect(r.id_disponibilidad).toBe(99);
    TABLAS.disponibilidad_cancha = { first: { id_disponibilidad: 7 } };
  });

  it('no duplica la disponibilidad si ya estaba', async () => {
    TABLAS.disponibilidad_cancha = { first: null };
    await disponibilidadService.createDisponibilidad(3, '2026-10-01', '09:00');
    TABLAS.disponibilidad_cancha = { first: { id_disponibilidad: 99 } };
    await disponibilidadService.createDisponibilidad(3, '2026-10-01', '09:00');

    const insercionesDisp = inserts.filter((i) => i.tabla === 'disponibilidad_cancha');
    expect(insercionesDisp).toHaveLength(1);
    TABLAS.disponibilidad_cancha = { first: { id_disponibilidad: 7 } };
  });
});
