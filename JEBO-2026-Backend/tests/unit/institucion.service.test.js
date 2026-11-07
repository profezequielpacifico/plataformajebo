const institucionService = require('../../src/services/institucion.service');
const { InstitucionRepository } = require('../../src/repositories');
const { BusinessError } = require('../../src/utils/errors');

jest.mock('../../src/repositories', () => ({
  InstitucionRepository: {
    findById: jest.fn(),
    findByName: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  }
}));

jest.mock('../../src/services/bitacora.service', () => ({ log: jest.fn() }));

describe('institucion.service: nombre único por distrito', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    InstitucionRepository.create.mockResolvedValue({ id_institucion: 9 });
    InstitucionRepository.update.mockResolvedValue({ id_institucion: 5 });
    InstitucionRepository.findById.mockResolvedValue({ id_institucion: 5, nombre: 'EP 8', id_distrito: 1 });
  });

  it('permite crear un nombre que existe en otro distrito', async () => {
    InstitucionRepository.findByName.mockResolvedValue(undefined);
    await institucionService.create({ nombre: 'EP 8', id_distrito: 2 });
    expect(InstitucionRepository.findByName).toHaveBeenCalledWith('EP 8', 2);
    expect(InstitucionRepository.create).toHaveBeenCalled();
  });

  it('rechaza crear un nombre repetido en el mismo distrito', async () => {
    InstitucionRepository.findByName.mockResolvedValue({ id_institucion: 5 });
    await expect(institucionService.create({ nombre: 'EP 8', id_distrito: 1 })).rejects.toThrow(BusinessError);
    expect(InstitucionRepository.create).not.toHaveBeenCalled();
  });

  it('permite editar una institución sin que choque consigo misma', async () => {
    InstitucionRepository.findByName.mockResolvedValue({ id_institucion: 5 });
    await institucionService.update('5', { nombre: 'EP 8', id_distrito: 1, telefono: '123' });
    expect(InstitucionRepository.update).toHaveBeenCalled();
  });

  it('rechaza mover una institución a un distrito donde ya hay otra con ese nombre', async () => {
    InstitucionRepository.findByName.mockResolvedValue({ id_institucion: 6 });
    await expect(institucionService.update('5', { id_distrito: 2 })).rejects.toThrow(BusinessError);
    expect(InstitucionRepository.findByName).toHaveBeenCalledWith('EP 8', 2);
    expect(InstitucionRepository.update).not.toHaveBeenCalled();
  });

  it('usa los datos actuales si la edición no trae nombre ni distrito', async () => {
    await institucionService.update('5', { telefono: '123' });
    expect(InstitucionRepository.findByName).not.toHaveBeenCalled();
    expect(InstitucionRepository.update).toHaveBeenCalled();
  });
});
