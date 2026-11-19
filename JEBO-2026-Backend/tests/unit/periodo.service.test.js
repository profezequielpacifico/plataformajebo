const { periodoService, resumenSets } = require('../../src/services/periodo.service');
const { BusinessError } = require('../../src/utils/errors');
const { ESTADOS_PARTIDO, ROLES } = require('../../src/constants');

jest.mock('../../src/repositories', () => ({
  PartidoRepository: { findById: jest.fn() },
  StaffPartidoRepository: { findByPartido: jest.fn() },
  PeriodoRepository: {
    listar: jest.fn(),
    enJuego: jest.fn(),
    abrir: jest.fn(),
    cerrar: jest.fn(),
    tieneSets: jest.fn(),
    contarEventos: jest.fn()
  }
}));

jest.mock('../../src/services/bitacora.service', () => ({ log: jest.fn() }));
jest.mock('../../src/config/knex', () => {
  const trx = Object.assign(jest.fn(), { raw: jest.fn().mockResolvedValue(undefined) });
  const knexMock = jest.fn();
  knexMock.transaction = jest.fn((cb) => cb(trx));
  knexMock.__trx = trx;
  return knexMock;
});

const { PartidoRepository: PR, StaffPartidoRepository: SR, PeriodoRepository: PER } = require('../../src/repositories');
const bitacoraService = require('../../src/services/bitacora.service');
const knexMock = require('../../src/config/knex');

const L = 100;
const V = 101;
const CTX = { userId: 7, rol: ROLES.ARBITRO, ip: '10.0.0.1', userAgent: 'jest', alcance: { global: true } };

const cerrado = (numero, ganador, pl = 25, pv = 20) => ({
  id_partido_periodo: numero, numero, estado: 'CERRADO', id_equipo_ganador: ganador,
  puntos_local: pl, puntos_visitante: pv
});
const enJuego = (numero, pl = 0, pv = 0) => ({
  id_partido_periodo: numero, numero, estado: 'EN_JUEGO', id_equipo_ganador: null,
  puntos_local: pl, puntos_visitante: pv
});

const partido = (over = {}) => ({
  id_partido: 1,
  id_equipo_local: L,
  id_equipo_visitante: V,
  estado: ESTADOS_PARTIDO.EN_JUEGO,
  resultado_cargado: false,
  marcador_por_periodos: true,
  max_periodos: 3,
  nombre_periodo: 'Set',
  ...over
});

beforeEach(() => {
  jest.clearAllMocks();
  PR.findById.mockResolvedValue(partido());
  SR.findByPartido.mockResolvedValue([{ id_usuario: 7 }]);
  PER.abrir.mockImplementation(async (id, numero) => enJuego(numero));
  PER.cerrar.mockImplementation(async (id, datos) => ({ ...datos, estado: 'CERRADO' }));
});

describe('resumenSets', () => {
  it('2-0 con dos sets cerrados deja abrir el tercero y el partido definido', () => {
    expect(resumenSets([cerrado(1, L), cerrado(2, L)], L, V)).toMatchObject({
      local: 2, visitante: 0, jugados: 2, enJuego: null, ganador: L, puedeAbrirTercero: true, definido: true
    });
  });

  it('1-1 con el tercero en juego no tiene ganador', () => {
    expect(resumenSets([cerrado(1, L), cerrado(2, V), enJuego(3)], L, V)).toMatchObject({
      local: 1, visitante: 1, enJuego: 3, ganador: null, puedeAbrirTercero: false, definido: false
    });
  });

  it('2-1 con los tres jugados no deja abrir otro', () => {
    expect(resumenSets([cerrado(1, L), cerrado(2, L), cerrado(3, V)], L, V)).toMatchObject({
      local: 2, visitante: 1, jugados: 3, ganador: L, puedeAbrirTercero: false, definido: true
    });
  });
});

describe('periodoService.cerrar', () => {
  it('congela los puntos del set en juego y registra quien lo cerro', async () => {
    PER.enJuego.mockResolvedValue(enJuego(2, 12, 9));
    PER.listar.mockResolvedValue([cerrado(1, V), cerrado(2, L, 12, 9)]);

    await periodoService.cerrar(1, 2, CTX);

    expect(PER.cerrar).toHaveBeenCalledWith(2, {
      puntos_local: 12, puntos_visitante: 9, id_equipo_ganador: L, cerrado_por: 7
    }, knexMock.__trx);
    expect(bitacoraService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'CERRAR_PERIODO_PARTIDO' }));
  });

  it('si queda 1-1 abre el set 3', async () => {
    PER.enJuego.mockResolvedValue(enJuego(2, 12, 9));
    PER.listar.mockResolvedValue([cerrado(1, V), cerrado(2, L, 12, 9)]);

    await periodoService.cerrar(1, 2, CTX);

    expect(PER.abrir).toHaveBeenCalledWith(1, 3, knexMock.__trx);
  });

  it('si queda 2-0 no abre nada', async () => {
    PER.enJuego.mockResolvedValue(enJuego(2, 25, 10));
    PER.listar.mockResolvedValue([cerrado(1, L), cerrado(2, L, 25, 10)]);

    const r = await periodoService.cerrar(1, 2, CTX);

    expect(PER.abrir).not.toHaveBeenCalled();
    expect(r.resumen).toMatchObject({ local: 2, visitante: 0, puedeAbrirTercero: true });
  });

  it('si el set 1 termina abre el set 2', async () => {
    PER.enJuego.mockResolvedValue(enJuego(1, 25, 20));
    PER.listar.mockResolvedValue([cerrado(1, L)]);

    await periodoService.cerrar(1, 1, CTX);

    expect(PER.abrir).toHaveBeenCalledWith(1, 2, knexMock.__trx);
  });

  it('si el set 3 termina no abre otro', async () => {
    PER.enJuego.mockResolvedValue(enJuego(3, 15, 10));
    PER.listar.mockResolvedValue([cerrado(1, L), cerrado(2, V), cerrado(3, L, 15, 10)]);

    await periodoService.cerrar(1, 3, CTX);

    expect(PER.abrir).not.toHaveBeenCalled();
  });

  it.each([[5, 5], [0, 0]])('no deja terminar un set empatado %i-%i', async (pl, pv) => {
    PER.enJuego.mockResolvedValue(enJuego(2, pl, pv));

    await expect(periodoService.cerrar(1, 2, CTX)).rejects.toThrow('No se puede terminar un set empatado');
    expect(PER.cerrar).not.toHaveBeenCalled();
  });

  it('un numero que no es el del set en juego responde 409 y no cierra nada', async () => {
    PER.enJuego.mockResolvedValue(enJuego(3, 4, 2));

    const err = await periodoService.cerrar(1, 2, CTX).catch((e) => e);

    expect(err).toBeInstanceOf(BusinessError);
    expect(err.statusCode).toBe(409);
    expect(PER.cerrar).not.toHaveBeenCalled();
  });

  it('con el resultado cerrado responde 409', async () => {
    PR.findById.mockResolvedValue(partido({ resultado_cargado: true }));
    PER.enJuego.mockResolvedValue(enJuego(2, 12, 9));

    const err = await periodoService.cerrar(1, 2, CTX).catch((e) => e);

    expect(err.statusCode).toBe(409);
    expect(PER.cerrar).not.toHaveBeenCalled();
  });
});

describe('periodoService.abrirTercero', () => {
  it('con 2-0 abre el set 3 y lo registra en la bitacora', async () => {
    PER.listar
      .mockResolvedValueOnce([cerrado(1, L), cerrado(2, L)])
      .mockResolvedValue([cerrado(1, L), cerrado(2, L), enJuego(3)]);

    const r = await periodoService.abrirTercero(1, CTX);

    expect(PER.abrir).toHaveBeenCalledWith(1, 3, knexMock.__trx);
    expect(r.resumen.enJuego).toBe(3);
    expect(bitacoraService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'ABRIR_PERIODO_PARTIDO' }));
  });

  it.each([
    ['1-1', [cerrado(1, L), cerrado(2, V), enJuego(3)]],
    ['set 3 ya jugado', [cerrado(1, L), cerrado(2, L), cerrado(3, V)]]
  ])('con %s no abre', async (_, lista) => {
    PER.listar.mockResolvedValue(lista);

    await expect(periodoService.abrirTercero(1, CTX)).rejects.toThrow(BusinessError);
    expect(PER.abrir).not.toHaveBeenCalled();
  });

  it('con el resultado cerrado no abre', async () => {
    PR.findById.mockResolvedValue(partido({ resultado_cargado: true }));
    PER.listar.mockResolvedValue([cerrado(1, L), cerrado(2, L)]);

    await expect(periodoService.abrirTercero(1, CTX)).rejects.toThrow(BusinessError);
    expect(PER.abrir).not.toHaveBeenCalled();
  });
});

describe('periodoService.abrirPrimeroSiCorresponde', () => {
  it('abre el set 1 en un partido por sets sin sets ni eventos', async () => {
    PER.tieneSets.mockResolvedValue(false);
    PER.contarEventos.mockResolvedValue(0);

    await periodoService.abrirPrimeroSiCorresponde(partido(), knexMock.__trx);

    expect(PER.abrir).toHaveBeenCalledWith(1, 1, knexMock.__trx);
  });

  it('no abre si el partido ya tiene eventos del contador viejo', async () => {
    PER.tieneSets.mockResolvedValue(false);
    PER.contarEventos.mockResolvedValue(4);

    expect(await periodoService.abrirPrimeroSiCorresponde(partido(), knexMock.__trx)).toBeNull();
    expect(PER.abrir).not.toHaveBeenCalled();
  });

  it('no abre en disciplinas que no van por sets', async () => {
    expect(await periodoService.abrirPrimeroSiCorresponde(partido({ marcador_por_periodos: false }))).toBeNull();
    expect(PER.abrir).not.toHaveBeenCalled();
  });

  it('no abre si ya tiene sets', async () => {
    PER.tieneSets.mockResolvedValue(true);

    expect(await periodoService.abrirPrimeroSiCorresponde(partido())).toBeNull();
    expect(PER.abrir).not.toHaveBeenCalled();
  });
});

describe('periodoService.estado', () => {
  it('devuelve null para un partido sin sets', async () => {
    PER.listar.mockResolvedValue([]);
    expect(await periodoService.estado(partido())).toBeNull();
  });

  it('devuelve la lista y el resumen para un partido con sets', async () => {
    PER.listar.mockResolvedValue([cerrado(1, L), enJuego(2, 3, 1)]);
    const r = await periodoService.estado(partido());
    expect(r.lista).toHaveLength(2);
    expect(r.resumen).toMatchObject({ local: 1, visitante: 0, enJuego: 2 });
  });
});
