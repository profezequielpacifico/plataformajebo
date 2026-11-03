const etapaService = require('../../src/services/etapa.service');
const { EtapaRepository } = require('../../src/repositories');
const bitacoraService = require('../../src/services/bitacora.service');
const { NotFoundError, BusinessError } = require('../../src/utils/errors');

const mockTrx = jest.fn();

jest.mock('../../src/repositories', () => ({
  EtapaRepository: {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteByTorneo: jest.fn(),
    findByIdConTorneo: jest.fn(),
    findPorTorneoConBloqueo: jest.fn(),
    updateConTrx: jest.fn(),
    createManyConTrx: jest.fn(),
    deleteConTrx: jest.fn(),
    countPartidos: jest.fn(),
    countPosiciones: jest.fn(),
    countPresentaciones: jest.fn()
  }
}));
jest.mock('../../src/services/bitacora.service', () => ({ log: jest.fn() }));
jest.mock('../../src/config/knex', () => ({
  transaction: jest.fn((cb) => cb(mockTrx)),
  default: { transaction: jest.fn((cb) => cb(mockTrx)) }
}));

const CTX = { userId: 9, ip: '10.0.0.1', userAgent: 'jest' };
const FECHA = { fecha_inicio: '2026-01-01', fecha_fin: '2026-12-31' };

describe('etapa.service', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('validacion de etapas', () => {
    const valida = (etapas, fechas = FECHA) => () => etapaService._validateEtapas(etapas, fechas);

    it('rechaza una lista vacia', () => {
      expect(valida([])).toThrow(BusinessError);
    });

    it('rechaza que no sea un array', () => {
      expect(valida('nada')).toThrow(/al menos una etapa/);
      expect(valida(null)).toThrow(/al menos una etapa/);
    });

    it('exige nombre', () => {
      expect(valida([{ fecha_inicio: '2026-02-01' }])).toThrow(/Etapa 1: el nombre es requerido/);
    });

    it('rechaza un nombre de solo espacios', () => {
      expect(valida([{ nombre: '   ' }])).toThrow(/el nombre es requerido/);
    });

    it('rechaza que la etapa termine antes de empezar', () => {
      expect(valida([{ nombre: 'A', fecha_inicio: '2026-05-01', fecha_fin: '2026-04-01' }]))
        .toThrow(/la fecha de fin debe ser posterior/);
    });

    it('rechaza que la etapa empiece antes que el torneo', () => {
      expect(valida([{ nombre: 'A', fecha_inicio: '2025-12-01', fecha_fin: '2026-02-01' }]))
        .toThrow(/no puede ser anterior a la del torneo/);
    });

    it('rechaza que la etapa termine despues que el torneo', () => {
      expect(valida([{ nombre: 'A', fecha_inicio: '2026-11-01', fecha_fin: '2027-02-01' }]))
        .toThrow(/no puede ser posterior a la del torneo/);
    });

    it('permite una etapa que coincide con el rango completo del torneo', () => {
      expect(valida([{ nombre: 'A', fecha_inicio: '2026-01-01', fecha_fin: '2026-12-31' }])).not.toThrow();
    });

    it('permite etapas sin fechas', () => {
      expect(valida([{ nombre: 'A' }, { nombre: 'B' }])).not.toThrow();
    });

    it('no valida contra el torneo si no se le pasaron sus fechas', () => {
      const etapas = [{ nombre: 'A', fecha_inicio: '2020-01-01', fecha_fin: '2030-01-01' }];
      expect(valida(etapas, {})).not.toThrow();
    });

    it('rechaza dos etapas con fechas superpuestas', () => {
      const etapas = [
        { nombre: 'A', fecha_inicio: '2026-02-01', fecha_fin: '2026-06-01' },
        { nombre: 'B', fecha_inicio: '2026-05-01', fecha_fin: '2026-09-01' }
      ];
      expect(valida(etapas)).toThrow(/fechas superpuestas/);
    });

    it('rechaza una etapa contenida dentro de otra', () => {
      const etapas = [
        { nombre: 'A', fecha_inicio: '2026-01-10', fecha_fin: '2026-12-10' },
        { nombre: 'B', fecha_inicio: '2026-03-01', fecha_fin: '2026-04-01' }
      ];
      expect(valida(etapas)).toThrow(/fechas superpuestas/);
    });

    it('exige un dia de holgura entre etapas: compartir el borde cuenta como solapamiento', () => {
      const etapas = [
        { nombre: 'A', fecha_inicio: '2026-01-10', fecha_fin: '2026-06-10' },
        { nombre: 'B', fecha_inicio: '2026-06-10', fecha_fin: '2026-09-01' }
      ];
      expect(valida(etapas)).toThrow(/fechas superpuestas/);
    });

    it('acepta etapas con un dia de diferencia entre una y otra', () => {
      const etapas = [
        { nombre: 'A', fecha_inicio: '2026-01-10', fecha_fin: '2026-06-10' },
        { nombre: 'B', fecha_inicio: '2026-06-11', fecha_fin: '2026-09-01' }
      ];
      expect(valida(etapas)).not.toThrow();
    });

    it('ignora el solapamiento si alguna etapa no tiene rango cerrado', () => {
      const etapas = [
        { nombre: 'A', fecha_inicio: '2026-02-01' },
        { nombre: 'B', fecha_inicio: '2026-01-01', fecha_fin: '2026-12-01' }
      ];
      expect(valida(etapas)).not.toThrow();
    });

    it('el nombre del mensaje de solapamiento dice cuales son', () => {
      const etapas = [
        { nombre: 'Regular', fecha_inicio: '2026-02-01', fecha_fin: '2026-06-01' },
        { nombre: 'Final', fecha_inicio: '2026-05-01', fecha_fin: '2026-06-01' }
      ];
      expect(valida(etapas)).toThrow(/"Regular" y "Final"/);
    });
  });

  describe('createForTorneo', () => {
    it('inserta todas las etapas de una vez', async () => {
      EtapaRepository.createMany.mockResolvedValue([{ id_etapa: 1 }, { id_etapa: 2 }]);

      const r = await etapaService.createForTorneo(4,
        [{ nombre: 'A' }, { nombre: 'B' }], FECHA, CTX);

      expect(r).toHaveLength(2);
      expect(EtapaRepository.createMany).toHaveBeenCalledWith([
        expect.objectContaining({ id_torneo: 4, nombre: 'A', orden: 1, estado: 'Pendiente' }),
        expect.objectContaining({ id_torneo: 4, nombre: 'B', orden: 2, estado: 'Pendiente' })
      ]);
    });

    it('recorta el nombre', async () => {
      await etapaService.createForTorneo(4, [{ nombre: '  Final  ' }], FECHA, CTX);
      expect(EtapaRepository.createMany.mock.calls[0][0][0].nombre).toBe('Final');
    });

    it('respeta el orden explicito', async () => {
      await etapaService.createForTorneo(4, [{ nombre: 'A' }, { nombre: 'B', orden: 10 }], FECHA, CTX);
      expect(EtapaRepository.createMany.mock.calls[0][0][1].orden).toBe(10);
    });

    it('pone descripcion y estado por defecto', async () => {
      await etapaService.createForTorneo(4, [{ nombre: 'A' }], FECHA, CTX);
      const e = EtapaRepository.createMany.mock.calls[0][0][0];
      expect(e.descripcion).toBeNull();
      expect(e.estado).toBe('Pendiente');
    });

    it('respeta el estado enviado', async () => {
      await etapaService.createForTorneo(4, [{ nombre: 'A', estado: 'Finalizada' }], FECHA, CTX);
      expect(EtapaRepository.createMany.mock.calls[0][0][0].estado).toBe('Finalizada');
    });

    it('no inserta nada si la validacion falla', async () => {
      await expect(etapaService.createForTorneo(4, [{ nombre: '' }], FECHA, CTX))
        .rejects.toBeInstanceOf(BusinessError);
      expect(EtapaRepository.createMany).not.toHaveBeenCalled();
    });

    it('audita con la cantidad de etapas', async () => {
      EtapaRepository.createMany.mockResolvedValue([{}, {}]);
      await etapaService.createForTorneo(4, [{ nombre: 'A' }, { nombre: 'B' }], FECHA, CTX);
      expect(bitacoraService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREAR_ETAPA', entityId: 4 })
      );
    });
  });

  describe('syncForTorneo', () => {
    beforeEach(() => {
      EtapaRepository.findPorTorneoConBloqueo.mockResolvedValue([
        { id_etapa: 10, nombre: 'Vieja', estado: 'Pendiente' }
      ]);
      EtapaRepository.countPartidos.mockResolvedValue({ count: '0' });
      EtapaRepository.countPosiciones.mockResolvedValue({ count: '0' });
      EtapaRepository.countPresentaciones.mockResolvedValue({ count: '0' });
      EtapaRepository.updateConTrx.mockResolvedValue([{ id_etapa: 10, nombre: 'Actualizada' }]);
      EtapaRepository.createManyConTrx.mockResolvedValue([{ id_etapa: 20, nombre: 'Nueva' }]);
    });

    it('actualiza etapas existentes conservando su id', async () => {
      const r = await etapaService.syncForTorneo(4, [{ id_etapa: 10, nombre: 'A' }], FECHA, CTX);
      expect(EtapaRepository.updateConTrx).toHaveBeenCalledWith(10, expect.objectContaining({ nombre: 'A' }), mockTrx);
      expect(EtapaRepository.createManyConTrx).not.toHaveBeenCalled();
      expect(r[0].id_etapa).toBe(10);
    });

    it('inserta etapas nuevas sin id', async () => {
      await etapaService.syncForTorneo(4, [{ nombre: 'A' }], FECHA, CTX);
      expect(EtapaRepository.createManyConTrx).toHaveBeenCalledWith(
        [expect.objectContaining({ nombre: 'A', id_torneo: 4 })],
        mockTrx
      );
    });

    it('rechaza si un id_etapa no pertenece al torneo', async () => {
      EtapaRepository.findPorTorneoConBloqueo.mockResolvedValue([
        { id_etapa: 99, nombre: 'Otra', estado: 'Pendiente' }
      ]);
      await expect(etapaService.syncForTorneo(4, [{ id_etapa: 10, nombre: 'A' }], FECHA, CTX))
        .rejects.toThrow(/no existe o no pertenece a este torneo/);
    });

    it('rechaza eliminar una etapa con dependencias', async () => {
      EtapaRepository.findPorTorneoConBloqueo.mockResolvedValue([
        { id_etapa: 10, nombre: 'ConPartidos', estado: 'Pendiente' }
      ]);
      EtapaRepository.countPartidos.mockResolvedValue({ count: '3' });
      await expect(etapaService.syncForTorneo(4, [{ nombre: 'A' }], FECHA, CTX))
        .rejects.toThrow(/No se puede eliminar la etapa "ConPartidos" porque tiene dependencias/);
    });

    it('rechaza eliminar una etapa En Progreso', async () => {
      EtapaRepository.findPorTorneoConBloqueo.mockResolvedValue([
        { id_etapa: 10, nombre: 'EnJuego', estado: 'En Progreso' }
      ]);
      await expect(etapaService.syncForTorneo(4, [{ nombre: 'A' }], FECHA, CTX))
        .rejects.toThrow(/está En Progreso/);
    });

    it('rechaza eliminar una etapa Finalizada', async () => {
      EtapaRepository.findPorTorneoConBloqueo.mockResolvedValue([
        { id_etapa: 10, nombre: 'Final', estado: 'Finalizada' }
      ]);
      await expect(etapaService.syncForTorneo(4, [{ nombre: 'A' }], FECHA, CTX))
        .rejects.toThrow(/está Finalizada/);
    });

    it('elimina etapas omitidas sin dependencias', async () => {
      EtapaRepository.findPorTorneoConBloqueo.mockResolvedValue([
        { id_etapa: 10, nombre: 'AEliminar', estado: 'Pendiente' }
      ]);
      await etapaService.syncForTorneo(4, [{ nombre: 'A' }], FECHA, CTX);
      expect(EtapaRepository.deleteConTrx).toHaveBeenCalledWith(10, mockTrx);
    });

    it('no hace nada si la validacion falla', async () => {
      await expect(etapaService.syncForTorneo(4, [{ nombre: '' }], FECHA, CTX))
        .rejects.toBeInstanceOf(BusinessError);
      expect(EtapaRepository.findPorTorneoConBloqueo).not.toHaveBeenCalled();
    });

    it('audita la sincronizacion', async () => {
      await etapaService.syncForTorneo(4, [{ id_etapa: 10, nombre: 'A' }], FECHA, CTX);
      expect(bitacoraService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ACTUALIZAR_ETAPA', entityId: 4 })
      );
    });
  });

  describe('CRUD individual', () => {
    it('findById tira 404 si no existe', async () => {
      EtapaRepository.findById.mockResolvedValue(null);
      await expect(etapaService.findById(9)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('findAll delega con el id del torneo', async () => {
      EtapaRepository.findAll.mockResolvedValue([{ id_etapa: 1 }]);
      expect(await etapaService.findAll(4)).toHaveLength(1);
      expect(EtapaRepository.findAll).toHaveBeenCalledWith(4);
    });

    it('create audita con el id de la etapa creada', async () => {
      EtapaRepository.create.mockResolvedValue({ id_etapa: 7 });
      await etapaService.create({ nombre: 'A' }, CTX);
      expect(bitacoraService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREAR_ETAPA', entityId: 7 })
      );
    });

    it('update exige que la etapa exista', async () => {
      EtapaRepository.findById.mockResolvedValue(null);
      await expect(etapaService.update(9, { nombre: 'B' }, CTX)).rejects.toBeInstanceOf(NotFoundError);
      expect(EtapaRepository.update).not.toHaveBeenCalled();
    });

    it('delete exige que la etapa exista', async () => {
      EtapaRepository.findById.mockResolvedValue(null);
      await expect(etapaService.delete(9, CTX)).rejects.toBeInstanceOf(NotFoundError);
      expect(EtapaRepository.delete).not.toHaveBeenCalled();
    });
  });
});
