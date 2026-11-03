const {
  operarPartido,
  gestionarPresentacion,
  evaluarPresentacion,
  gestionarEquipoPropio
} = require('../../src/middleware/autorizacion');
const autorizacionService = require('../../src/services/autorizacion.service');
const { ForbiddenError } = require('../../src/utils/errors');
const { ROLES } = require('../../src/constants');

// Estos middleware son adaptadores: extraen el recurso del request y delegan la
// decision en `autorizacion.service`. El test fija ese contrato (que id y que
// metodo se le pasan) y el corte de nivel cuando no hay fila (`/mios`, listado).
jest.mock('../../src/services/autorizacion.service', () => ({
  esAdministrador: jest.fn((rol) => rol === 'SuperAdmin' || rol === 'Administrador'),
  assertOperarPartido: jest.fn(),
  assertEvaluarPresentacion: jest.fn(),
  assertGestionarEquipoPropio: jest.fn()
}));

const ADMIN = { id: 1, rol: ROLES.ADMIN };
const SUPERADMIN = { id: 20, rol: ROLES.SUPERADMIN };
const ARBITRO = { id: 7, rol: ROLES.ARBITRO };
const JUEZ = { id: 8, rol: ROLES.JUEZ };
const PROFESOR = { id: 9, rol: ROLES.PROFESOR };

function reqCon(user, { id, method = 'GET' } = {}) {
  return { user, params: id ? { id } : {}, method };
}

beforeEach(() => {
  jest.clearAllMocks();
  autorizacionService.assertOperarPartido.mockResolvedValue(true);
  autorizacionService.assertEvaluarPresentacion.mockResolvedValue(true);
  autorizacionService.assertGestionarEquipoPropio.mockResolvedValue(true);
});

describe('guards de recurso (middleware)', () => {
  describe('operarPartido', () => {
    it('sin :id deja pasar a SuperAdmin, Admin y Arbitro', async () => {
      for (const user of [SUPERADMIN, ADMIN, ARBITRO]) {
        const next = jest.fn();
        await operarPartido(reqCon(user), {}, next);
        expect(next).toHaveBeenCalledWith();
      }
      expect(autorizacionService.assertOperarPartido).not.toHaveBeenCalled();
    });

    it('sin :id rechaza a un Profesor', async () => {
      const next = jest.fn();
      await operarPartido(reqCon(PROFESOR), {}, next);
      expect(next.mock.calls[0][0]).toBeInstanceOf(ForbiddenError);
    });

    it('con :id delega la asignacion en el servicio', async () => {
      const next = jest.fn();
      await operarPartido(reqCon(ARBITRO, { id: '5' }), {}, next);
      expect(autorizacionService.assertOperarPartido).toHaveBeenCalledWith(ARBITRO, '5');
      expect(next).toHaveBeenCalledWith();
    });

    it('propaga el error del servicio', async () => {
      const error = new ForbiddenError('No estás asignado a este partido como árbitro');
      autorizacionService.assertOperarPartido.mockRejectedValue(error);
      const next = jest.fn();
      await operarPartido(reqCon(ARBITRO, { id: 5 }), {}, next);
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('gestionarPresentacion', () => {
    it('deja pasar a SuperAdmin y Admin', async () => {
      for (const user of [SUPERADMIN, ADMIN]) {
        const next = jest.fn();
        await gestionarPresentacion(reqCon(user), {}, next);
        expect(next).toHaveBeenCalledWith();
      }
    });

    it('rechaza a Juez, Arbitro y Profesor', async () => {
      for (const user of [JUEZ, ARBITRO, PROFESOR]) {
        const next = jest.fn();
        await gestionarPresentacion(reqCon(user), {}, next);
        expect(next.mock.calls[0][0]).toBeInstanceOf(ForbiddenError);
      }
    });
  });

  describe('evaluarPresentacion', () => {
    it('sin :id (listado) deja pasar a SuperAdmin, Admin y Juez', async () => {
      for (const user of [SUPERADMIN, ADMIN, JUEZ]) {
        const next = jest.fn();
        await evaluarPresentacion(reqCon(user), {}, next);
        expect(next).toHaveBeenCalledWith();
      }
    });

    it('sin :id rechaza a un Profesor', async () => {
      const next = jest.fn();
      await evaluarPresentacion(reqCon(PROFESOR), {}, next);
      expect(next.mock.calls[0][0]).toBeInstanceOf(ForbiddenError);
    });

    it('en una lectura no exige EN_CURSO', async () => {
      const next = jest.fn();
      await evaluarPresentacion(reqCon(JUEZ, { id: 3, method: 'GET' }), {}, next);
      expect(autorizacionService.assertEvaluarPresentacion)
        .toHaveBeenCalledWith(JUEZ, 3, { exigirEnCurso: false });
    });

    it('en una escritura exige EN_CURSO', async () => {
      const next = jest.fn();
      await evaluarPresentacion(reqCon(JUEZ, { id: 3, method: 'POST' }), {}, next);
      expect(autorizacionService.assertEvaluarPresentacion)
        .toHaveBeenCalledWith(JUEZ, 3, { exigirEnCurso: true });
    });
  });

  describe('gestionarEquipoPropio', () => {
    it('sin :id (alta) deja pasar a SuperAdmin, Admin y Profesor', async () => {
      for (const user of [SUPERADMIN, ADMIN, PROFESOR]) {
        const next = jest.fn();
        await gestionarEquipoPropio(reqCon(user), {}, next);
        expect(next).toHaveBeenCalledWith();
      }
      expect(autorizacionService.assertGestionarEquipoPropio).not.toHaveBeenCalled();
    });

    it('sin :id rechaza a un Juez', async () => {
      const next = jest.fn();
      await gestionarEquipoPropio(reqCon(JUEZ), {}, next);
      expect(next.mock.calls[0][0]).toBeInstanceOf(ForbiddenError);
    });

    it('con :id delega la pertenencia en el servicio', async () => {
      const next = jest.fn();
      await gestionarEquipoPropio(reqCon(PROFESOR, { id: '12' }), {}, next);
      expect(autorizacionService.assertGestionarEquipoPropio)
        .toHaveBeenCalledWith(PROFESOR, '12');
    });
  });
});
