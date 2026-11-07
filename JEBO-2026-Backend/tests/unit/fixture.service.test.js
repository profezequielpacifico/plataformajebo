const fixtureService = require('../../src/services/fixture.service');
const { NotFoundError, BusinessError } = require('../../src/utils/errors');

jest.mock('../../src/config/knex', () => {
  const tablas = {};
  const knexMock = jest.fn((tabla) => {
    const spec = tablas[tabla] || {};
    const qb = {
      where: jest.fn(() => qb),
      whereIn: jest.fn(() => qb),
      orderBy: jest.fn(() => qb),
      select: jest.fn(() => qb),
      join: jest.fn(() => qb),
      leftJoin: jest.fn(() => qb),
      first: jest.fn(async () => (spec.first === undefined ? null : spec.first)),
      pluck: jest.fn(async () => (spec.pluck || [])),
      insert: jest.fn(() => Promise.resolve([{ id_partido: 999 }])),
      returning: jest.fn(() => Promise.resolve([{ id_partido: 999 }]))
    };
    qb.then = (onF, onR) => Promise.resolve(onF(spec.first || {}));
    return qb;
  });
  knexMock.__set = (t, v) => { tablas[t] = v; };
  knexMock.__limpiar = () => { for (const k of Object.keys(tablas)) delete tablas[k]; };
  return knexMock;
});

const knexMock = require('../../src/config/knex');

const trxFalso = ({ yaGenerado = false, slots } = {}) => {
  const calendario = slots || [
    { id_cancha: 1, dia_semana: 1, id_horario_cancha: 1, hora_inicio: '09:00:00' },
    { id_cancha: 2, dia_semana: 2, id_horario_cancha: 1, hora_inicio: '09:00:00' },
    { id_cancha: 1, dia_semana: 3, id_horario_cancha: 1, hora_inicio: '09:00:00' },
    { id_cancha: 2, dia_semana: 4, id_horario_cancha: 1, hora_inicio: '09:00:00' },
    { id_cancha: 1, dia_semana: 5, id_horario_cancha: 1, hora_inicio: '09:00:00' },
    { id_cancha: 2, dia_semana: 6, id_horario_cancha: 1, hora_inicio: '09:00:00' },
    { id_cancha: 1, dia_semana: 7, id_horario_cancha: 1, hora_inicio: '09:00:00' }
  ];
  const inserts = {};

  const valoresDe = (tabla) => {
    if (tabla === 'fixture_generado') return yaGenerado ? { id_torneo: 1 } : null;
    if (tabla === 'cancha_horario_semanal as chs') return calendario;
    if (tabla === 'fecha_cancha') return { id_fecha_cancha: 1 };
    if (tabla === 'fecha_horario') return { id_fecha_horario: 1 };
    if (tabla === 'disponibilidad_cancha') return { id_disponibilidad: 7 };
    return { id_partido: 1 };
  };

  const trx = jest.fn((tabla) => {
    const qb = {
      where: jest.fn(() => qb),
      whereIn: jest.fn(() => qb),
      orderBy: jest.fn(() => qb),
      select: jest.fn(() => qb),
      join: jest.fn(() => qb),
      first: jest.fn(async () => valoresDe(tabla)),
      pluck: jest.fn(async () => []),
      insert: jest.fn((valores) => {
        inserts[tabla] = inserts[tabla] || [];
        inserts[tabla].push(valores);
        const devuelto = [{ id_partido: 500 + inserts[tabla].length, ...valores }];
        const chain = {
          returning: jest.fn(() => Promise.resolve(devuelto)),
          then: (onF) => Promise.resolve(onF(devuelto))
        };
        return chain;
      })
    };
    qb.then = (onF) => Promise.resolve(onF(valoresDe(tabla)));
    return qb;
  });

  return { trx, inserts };
};

describe('fixture.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    knexMock.__limpiar();
  });

  describe('getByIdTorneo', () => {
    const GLOBAL = { global: true, instituciones: null };

    it('devuelve generado false si el torneo no existe', async () => {
      knexMock.__set('torneo', { first: null });
      expect(await fixtureService.getByIdTorneo(999, GLOBAL))
        .toEqual({ generado: false, torneo: null });
    });

    it('devuelve generado false si el torneo existe sin fixture', async () => {
      knexMock.__set('torneo', { first: { id_torneo: 1, nombre: 'T1', fecha_inicio: '2026-01-01', fecha_fin: null } });
      knexMock.__set('fixture_generado', { first: null });

      const r = await fixtureService.getByIdTorneo(1, GLOBAL);
      expect(r.generado).toBe(false);
      expect(r.torneo.nombre).toBe('T1');
    });

    it('marca vigente un torneo sin fecha de fin', async () => {
      knexMock.__set('torneo', { first: { id_torneo: 1, nombre: 'T1', fecha_inicio: '2026-01-01', fecha_fin: null } });
      knexMock.__set('fixture_generado', { first: { id_torneo: 1 } });

      const r = await fixtureService.getByIdTorneo(1, GLOBAL);
      expect(r.generado).toBe(true);
      expect(r.torneo.vigente).toBe(true);
    });

    it('marca no vigente un torneo cuya fecha de fin ya paso', async () => {
      knexMock.__set('torneo', { first: { id_torneo: 1, nombre: 'T1', fecha_inicio: '2020-01-01', fecha_fin: '2020-06-01' } });
      knexMock.__set('fixture_generado', { first: { id_torneo: 1 } });

      expect((await fixtureService.getByIdTorneo(1, GLOBAL)).torneo.vigente).toBe(false);
    });

    it('sin alcance lanza en vez de devolver el torneo entero (X-05)', async () => {
      await expect(fixtureService.getByIdTorneo(1, undefined)).rejects.toThrow(/alcance resuelto/);
    });
  });

  describe('generate', () => {
    it('falla si el torneo no existe', async () => {
      knexMock.__set('torneo', { first: null });
      await expect(fixtureService.generate(999, 1)).rejects.toBeInstanceOf(NotFoundError);
    });

    describe('torneos de tipo EVALUACION (Gimnasia)', () => {
      beforeEach(() => {
        knexMock.__limpiar();
        knexMock.__set('torneo', { first: { id_torneo: 32, nombre: 'Torneo Gimnasia JEBO 2026', fecha_inicio: '2026-01-05' } });
        knexMock.__set('torneo as t', {
          first: {
            torneo_nombre: 'Torneo Gimnasia JEBO 2026',
            tipo_competencia: 'EVALUACION',
            disciplina_nombre: 'Gimnasia Artística'
          }
        });
      });

      it('rechaza generar el fixture y dice que no tiene partidos', async () => {
        knexMock.__set('posicion', { pluck: [39, 40, 41] });

        await expect(fixtureService.generate(32, 1))
          .rejects.toBeInstanceOf(BusinessError);
        await expect(fixtureService.generate(32, 1))
          .rejects.toThrow(/no tiene partidos/);
      });

      it('el guard corre antes de leer posicion, para que el mensaje sea el del tipo', async () => {
        knexMock.__set('posicion', { pluck: [] });

        await expect(fixtureService.generate(32, 1))
          .rejects.toThrow(/no tiene partidos/);
        await expect(fixtureService.generate(32, 1))
          .rejects.not.toThrow(/al menos 2 equipos/);
      });

      it('no abre ni la transaccion, asi que no persiste nada', async () => {
        knexMock.__set('posicion', { pluck: [39, 40, 41] });
        knexMock.transaction = jest.fn(async (cb) => cb(trxFalso().trx));

        await expect(fixtureService.generate(32, 1)).rejects.toThrow();

        expect(knexMock.transaction).not.toHaveBeenCalled();
      });
    });

    it('exige al menos dos equipos inscriptos', async () => {
      knexMock.__set('torneo', { first: { id_torneo: 1, nombre: 'T1', fecha_inicio: '2026-01-05' } });
      knexMock.__set('posicion', { pluck: [10] });

      await expect(fixtureService.generate(1, 1))
        .rejects.toBeInstanceOf(BusinessError);
      await expect(fixtureService.generate(1, 1))
        .rejects.toThrow(/al menos 2 equipos/);
    });

    it('descarta ids de equipo nulos antes de armar el fixture', async () => {
      knexMock.__set('torneo', { first: { id_torneo: 1, nombre: 'T1', fecha_inicio: '2026-01-05' } });
      knexMock.__set('posicion', { pluck: [10, null, 11] });

      const { trx, inserts } = trxFalso();
      knexMock.transaction = jest.fn(async (cb) => cb(trx));

      const r = await fixtureService.generate(1, 1);
      expect(r.equipos).toBe(2);
      expect(inserts.partido).toHaveLength(1);
    });

    it('no deja generar dos veces el mismo torneo', async () => {
      const { trx } = trxFalso({ yaGenerado: true });
      knexMock.transaction = jest.fn(async (cb) => cb(trx));
      knexMock.__set('torneo', { first: { id_torneo: 1, nombre: 'T1', fecha_inicio: '2026-01-05' } });
      knexMock.__set('posicion', { pluck: [10, 11] });

      await expect(fixtureService.generate(1, 1)).rejects.toThrow(/ya fue generado/);
    });

    it('avisa que no hay canchas cargadas para el dia de la ronda', async () => {
      const { trx } = trxFalso({ slots: [] });
      knexMock.transaction = jest.fn(async (cb) => cb(trx));
      knexMock.__set('torneo', { first: { id_torneo: 1, nombre: 'T1', fecha_inicio: '2026-01-05' } });
      knexMock.__set('posicion', { pluck: [10, 11] });

      await expect(fixtureService.generate(1, 1)).rejects.toThrow(/No hay canchas con horarios/);
    });

    it('persiste el fixture y devuelve el resumen', async () => {
      const { trx, inserts } = trxFalso();
      knexMock.transaction = jest.fn(async (cb) => cb(trx));
      knexMock.__set('torneo', { first: { id_torneo: 1, nombre: 'T1', fecha_inicio: '2026-01-05' } });
      knexMock.__set('posicion', { pluck: [10, 11, 12, 13] });

      const r = await fixtureService.generate(1, 42);

      expect(r.generado).toBe(true);
      expect(r.torneo).toBe('T1');
      expect(r.equipos).toBe(4);
      expect(r.rondas).toBe(3);
      expect(r.partidos).toBe(6);
      expect(r.matches).toHaveLength(6);
      expect(inserts.fixture_generado[0]).toEqual({ id_torneo: 1, id_usuario: 42 });
    });

    it('guarda el usuario null si no viene en la llamada', async () => {
      const { trx, inserts } = trxFalso();
      knexMock.transaction = jest.fn(async (cb) => cb(trx));
      knexMock.__set('torneo', { first: { id_torneo: 1, nombre: 'T1', fecha_inicio: '2026-01-05' } });
      knexMock.__set('posicion', { pluck: [10, 11] });

      await fixtureService.generate(1);
      expect(inserts.fixture_generado[0].id_usuario).toBeNull();
    });

    it('todos los partidos arrancan en 0-0 y estado Pendiente', async () => {
      const { trx, inserts } = trxFalso();
      knexMock.transaction = jest.fn(async (cb) => cb(trx));
      knexMock.__set('torneo', { first: { id_torneo: 1, nombre: 'T1', fecha_inicio: '2026-01-05' } });
      knexMock.__set('posicion', { pluck: [10, 11, 12, 13] });

      await fixtureService.generate(1, 1);

      for (const p of inserts.partido) {
        expect(p.goles_local).toBe(0);
        expect(p.goles_visitante).toBe(0);
        expect(p.estado).toBe('Pendiente');
      }
    });

    it('asocia cada partido a su numero de ronda', async () => {
      const { trx, inserts } = trxFalso();
      knexMock.transaction = jest.fn(async (cb) => cb(trx));
      knexMock.__set('torneo', { first: { id_torneo: 1, nombre: 'T1', fecha_inicio: '2026-01-05' } });
      knexMock.__set('posicion', { pluck: [10, 11, 12, 13] });

      await fixtureService.generate(1, 1);

      expect(inserts.partido_ronda).toHaveLength(6);
      const rondas = inserts.partido_ronda.map((r) => r.id_ronda);
      expect(rondas.sort()).toEqual([1, 1, 2, 2, 3, 3]);
    });

    it('nunca deja que un equipo sea local y visitante en la misma ronda', async () => {
      const { trx } = trxFalso();
      knexMock.transaction = jest.fn(async (cb) => cb(trx));
      knexMock.__set('torneo', { first: { id_torneo: 1, nombre: 'T1', fecha_inicio: '2026-01-05' } });
      knexMock.__set('posicion', { pluck: [10, 11, 12, 13, 14, 15] });

      const r = await fixtureService.generate(1, 1);

      const porRonda = {};
      for (const m of r.matches) {
        porRonda[m.ronda] = porRonda[m.ronda] || [];
        porRonda[m.ronda].push(m.id_equipo_local, m.id_equipo_visitante);
      }
      for (const [ronda, equipos] of Object.entries(porRonda)) {
        expect(new Set(equipos).size).toBe(equipos.length);
        expect(equipos.length).toBe(6);
      }
    });
  });

  describe('_roundRobin', () => {
    it('con 2 equipos hace 1 ronda', () => {
      const rondas = fixtureService._roundRobin([1, 2]);
      expect(rondas).toHaveLength(1);
      expect(rondas[0]).toHaveLength(1);
    });

    it('con 4 equipos hace 3 rondas de 2 partidos', () => {
      const rondas = fixtureService._roundRobin([1, 2, 3, 4]);
      expect(rondas).toHaveLength(3);
      for (const r of rondas) expect(r).toHaveLength(2);
    });

    it('con 3 equipos agrega un bye y hace 3 rondas', () => {
      const rondas = fixtureService._roundRobin([1, 2, 3]);
      expect(rondas).toHaveLength(3);
      for (const r of rondas) {
        expect(r).toHaveLength(2);
        const conBye = r.filter((p) => p.local === null || p.visitante === null);
        expect(conBye).toHaveLength(1);
      }
    });

    it('con numero impar de equipos cada equipo descansa exactamente una vez', () => {
      const equipos = [1, 2, 3, 4, 5];
      const rondas = fixtureService._roundRobin(equipos);
      const apariciones = {};
      const byes = {};

      for (const ronda of rondas) {
        for (const p of ronda) {
          for (const e of [p.local, p.visitante]) {
            if (e === null) continue;
            apariciones[e] = (apariciones[e] || 0) + 1;
            if (p.local === null || p.visitante === null) byes[e] = (byes[e] || 0) + 1;
          }
        }
      }
      for (const e of equipos) {
        expect(apariciones[e]).toBe(5);
        expect(byes[e]).toBe(1);
      }
    });

    it('con 6 equipos cada ronda tiene 3 partidos sin byes', () => {
      const rondas = fixtureService._roundRobin([1, 2, 3, 4, 5, 6]);
      expect(rondas).toHaveLength(5);
      for (const r of rondas) {
        expect(r).toHaveLength(3);
        for (const p of r) {
          expect(p.local).not.toBeNull();
          expect(p.visitante).not.toBeNull();
        }
      }
    });

    it('cada pareja se enfrenta exactamente una vez', () => {
      const equipos = [1, 2, 3, 4, 5, 6];
      const rondas = fixtureService._roundRobin(equipos);
      const pares = new Set();

      for (const ronda of rondas) {
        for (const { local, visitante } of ronda) {
          const clave = [local, visitante].sort((a, b) => a - b).join('-');
          expect(pares.has(clave)).toBe(false);
          pares.add(clave);
        }
      }
      expect(pares.size).toBe(15);
    });

    it('con 2 equipos no los hace jugar dos veces', () => {
      const rondas = fixtureService._roundRobin([7, 8]);
      expect(rondas[0]).toEqual([{ local: 7, visitante: 8 }]);
    });

    it('no muta el array que recibe', () => {
      const original = [1, 2, 3];
      fixtureService._roundRobin(original);
      expect(original).toEqual([1, 2, 3]);
    });
  });

  describe('helpers de fecha', () => {
    it('_fmtDate formatea a YYYY-MM-DD con ceros a la izquierda', () => {
      expect(fixtureService._fmtDate(new Date(2026, 0, 5))).toBe('2026-01-05');
      expect(fixtureService._fmtDate(new Date(2026, 11, 31))).toBe('2026-12-31');
    });

    it('_diaSemana usa 1-7 en vez de 0-6', () => {
      expect(fixtureService._diaSemana(new Date(2026, 0, 5))).toBe(1);
      expect(fixtureService._diaSemana(new Date(2026, 0, 11))).toBe(7);
    });

    it('_nombreDia cubre 1 a 7 y cae al numero si recibe algo raro', () => {
      expect(fixtureService._nombreDia(1)).toBe('Lunes');
      expect(fixtureService._nombreDia(7)).toBe('Domingo');
      expect(fixtureService._nombreDia(99)).toBe('99');
    });

    it('_localDate recorta un Date a medianoche local', () => {
      const d = fixtureService._localDate(new Date(2026, 4, 20, 15, 30));
      expect(d.getHours()).toBe(0);
      expect(d.getMonth()).toBe(4);
      expect(d.getDate()).toBe(20);
    });

    it('_localDate acepta un string ISO con hora', () => {
      const d = fixtureService._localDate('2026-05-20T23:30:00.000Z');
      expect(d.getFullYear()).toBe(2026);
    });

    it('_localDate acepta solo YYYY-MM-DD', () => {
      const d = fixtureService._localDate('2026-05-20');
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(4);
      expect(d.getDate()).toBe(20);
    });

    it('_localDate no corre de fecha por el offset de zona horaria', () => {
      const d = fixtureService._localDate('2026-01-01');
      expect(d.getMonth()).toBe(0);
      expect(d.getDate()).toBe(1);
    });
  });
});
