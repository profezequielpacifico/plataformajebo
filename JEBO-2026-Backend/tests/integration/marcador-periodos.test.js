const knex = require('../../src/config/knex');

describe('v_marcador_partido con sets - Integración', () => {
  let trx;
  let sinSets;
  let conSets;
  const SUFIJO = Date.now();

  const insertar = async (tabla, fila, id) => (await trx(tabla).insert(fila).returning(id))[0][id];

  beforeAll(async () => {
    trx = await knex.transaction();
    const disciplina = await insertar('disciplina', {
      nombre: `Voley Test ${SUFIJO}`, marcador_por_periodos: true, nombre_periodo: 'Set', max_periodos: 3
    }, 'id_disciplina');
    const distrito = await insertar('distrito', { nombre: `D ${SUFIJO}` }, 'id_distrito');
    const institucion = await insertar('institucion', { nombre: `I ${SUFIJO}`, id_distrito: distrito }, 'id_institucion');
    const usuario = await insertar('usuario', {
      nombre: 'U', email: `u${SUFIJO}@test.com`, documento: String(SUFIJO).slice(-8), id_rol: 1, password_hash: 'x'
    }, 'id_usuario');
    const equipo = (nombre) => insertar('equipo', {
      nombre, id_disciplina: disciplina, id_usuario: usuario, id_institucion: institucion
    }, 'id_equipo');
    const local = await equipo(`A ${SUFIJO}`);
    const visitante = await equipo(`B ${SUFIJO}`);
    const torneo = await insertar('torneo', { nombre: `T ${SUFIJO}`, id_disciplina: disciplina, fecha_inicio: '2026-11-19' }, 'id_torneo');
    const partido = () => insertar('partido', { id_torneo: torneo, id_equipo_local: local, id_equipo_visitante: visitante }, 'id_partido');
    sinSets = await partido();
    conSets = await partido();

    await trx('evento_partido').insert([
      { id_partido: sinSets, numero_evento: 1, id_equipo: local },
      { id_partido: sinSets, numero_evento: 2, id_equipo: local },
      { id_partido: sinSets, numero_evento: 3, id_equipo: visitante }
    ]);
    await trx('partido_periodo').insert([
      { id_partido: conSets, numero: 1, estado: 'CERRADO', puntos_local: 25, puntos_visitante: 20, id_equipo_ganador: local },
      { id_partido: conSets, numero: 2, estado: 'CERRADO', puntos_local: 18, puntos_visitante: 25, id_equipo_ganador: visitante },
      { id_partido: conSets, numero: 3, estado: 'EN_JUEGO' }
    ]);
    await trx('evento_partido').insert({ id_partido: conSets, numero_evento: 1, id_equipo: local, numero_periodo: 3 });
  });

  afterAll(async () => {
    await trx.rollback();
    await knex.destroy();
  });

  const marcador = (vista, id) => trx(vista).where('id_partido', id).first()
    .then((r) => [Number(r.puntos_local), Number(r.puntos_visitante)]);

  it('un partido sin sets cuenta las anotaciones como siempre', async () => {
    expect(await marcador('v_marcador_partido', sinSets)).toEqual([2, 1]);
  });

  it('un partido con sets cuenta los sets ganados y no los puntos del set en juego', async () => {
    expect(await marcador('v_marcador_partido', conSets)).toEqual([1, 1]);
  });

  it('los puntos por set suman solo los sets cerrados', async () => {
    expect(await marcador('v_puntos_periodo_partido', conSets)).toEqual([43, 45]);
  });

  it('no permite dos sets en juego en el mismo partido', async () => {
    await trx.raw('SAVEPOINT dos_en_juego');
    await expect(trx('partido_periodo').insert([
      { id_partido: sinSets, numero: 1, estado: 'EN_JUEGO' },
      { id_partido: sinSets, numero: 2, estado: 'EN_JUEGO' }
    ])).rejects.toThrow(/partido_periodo_en_juego_ux/);
    await trx.raw('ROLLBACK TO SAVEPOINT dos_en_juego');
  });

  it('no permite un set 4', async () => {
    await trx.raw('SAVEPOINT set_cuatro');
    await expect(trx('partido_periodo').insert({ id_partido: sinSets, numero: 4, estado: 'CERRADO' }))
      .rejects.toThrow(/partido_periodo_numero_ck/);
    await trx.raw('ROLLBACK TO SAVEPOINT set_cuatro');
  });
});
