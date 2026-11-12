const crypto = require('crypto');
const request = require('supertest');
const app = require('../../src/app');
const knex = require('../../src/config/knex');

const sufijo = crypto.randomBytes(5).toString('hex');
const TAG = `pub_${sufijo}`;
const NOMBRE_PROFESOR = `Profesor Privado ${sufijo}`;
const EMAIL_PROFESOR = `${TAG}@jebo.test`;

const ids = {};

const insertar = async (tabla, fila, pk) => {
  const [r] = await knex(tabla).insert(fila).returning(pk);
  return r[pk];
};

beforeAll(async () => {
  ids.regionA = await insertar('region', { nombre: `${TAG} Region A` }, 'id_region');
  ids.regionB = await insertar('region', { nombre: `${TAG} Region B` }, 'id_region');
  ids.distrito = await insertar('distrito', { nombre: `${TAG} Distrito` }, 'id_distrito');
  ids.localidadA = await insertar('localidad', { nombre: `${TAG} Loc A`, id_distrito: ids.distrito, id_region: ids.regionA }, 'id_localidad');
  ids.localidadB = await insertar('localidad', { nombre: `${TAG} Loc B`, id_distrito: ids.distrito, id_region: ids.regionB }, 'id_localidad');

  const rol = await knex('rol').where('descripcion', 'Profesor').first();
  ids.usuario = await insertar('usuario', {
    nombre: NOMBRE_PROFESOR,
    email: EMAIL_PROFESOR,
    password_hash: 'x',
    id_rol: rol.id_rol,
    documento: `9${sufijo.slice(0, 7)}`
  }, 'id_usuario');

  ids.institucionA = await insertar('institucion', { nombre: `${TAG} Escuela A`, id_distrito: ids.distrito, id_localidad: ids.localidadA, telefono: '1111111' }, 'id_institucion');
  ids.institucionB = await insertar('institucion', { nombre: `${TAG} Escuela B`, id_distrito: ids.distrito, id_localidad: ids.localidadB, telefono: '2222222' }, 'id_institucion');

  ids.futbol = await insertar('disciplina', { nombre: `${TAG} Futbol`, tipo_competencia: 'MARCADOR' }, 'id_disciplina');
  ids.gimnasia = await insertar('disciplina', { nombre: `${TAG} Gimnasia`, tipo_competencia: 'EVALUACION' }, 'id_disciplina');

  ids.torneoFutbol = await insertar('torneo', { id_disciplina: ids.futbol, nombre: `${TAG} Futbol Sub-16`, categoria: 'Sub-16', fecha_inicio: '2026-11-01' }, 'id_torneo');
  ids.torneoGimnasia = await insertar('torneo', { id_disciplina: ids.gimnasia, nombre: `${TAG} Gimnasia`, fecha_inicio: '2026-11-01' }, 'id_torneo');
  ids.etapa = await insertar('etapa', { id_torneo: ids.torneoFutbol, nombre: 'Etapa Regional', orden: 1 }, 'id_etapa');

  ids.cancha = await insertar('cancha', {
    id_distrito: ids.distrito,
    id_disciplina: ids.futbol,
    nombre: `${TAG} Cancha 1`,
    ubicacion: 'Polideportivo Municipal',
    link_maps: 'https://maps.example/cancha'
  }, 'id_cancha');
  ids.fechaCancha = await insertar('fecha_cancha', { fecha: '2026-11-20' }, 'id_fecha_cancha');
  ids.horario = await insertar('horarios_cancha', { hora_inicio: '10:00', hora_fin: '11:00' }, 'id_horario_cancha');
  ids.fechaHorario = new Date(Date.UTC(2031, 0, 1, 0, 0, crypto.randomInt(0, 59), crypto.randomInt(0, 999)));
  await knex('fecha_horario').insert({ fecha_horario: ids.fechaHorario, id_fecha_cancha: ids.fechaCancha, id_horario_cancha: ids.horario });
  ids.disponibilidad = await insertar('disponibilidad_cancha', { id_cancha: ids.cancha, fecha_horario: ids.fechaHorario }, 'id_disponibilidad');

  const equipo = (nombre, institucion, disciplina, localidad) => insertar('equipo', {
    nombre: `${TAG} ${nombre}`,
    id_institucion: institucion,
    id_disciplina: disciplina,
    id_usuario: ids.usuario,
    id_distrito: ids.distrito,
    id_localidad: localidad
  }, 'id_equipo');

  ids.equipoA1 = await equipo('A1', ids.institucionA, ids.futbol, ids.localidadA);
  ids.equipoA2 = await equipo('A2', ids.institucionA, ids.futbol, null);
  ids.equipoB1 = await equipo('B1', ids.institucionB, ids.futbol, ids.localidadB);
  ids.equipoG1 = await equipo('G1', ids.institucionB, ids.gimnasia, ids.localidadB);

  ids.partidoProgramado = await insertar('partido', {
    id_torneo: ids.torneoFutbol,
    id_disponibilidad: ids.disponibilidad,
    id_equipo_local: ids.equipoA1,
    id_equipo_visitante: ids.equipoA2,
    id_etapa: ids.etapa,
    estado: 'Programado'
  }, 'id_partido');

  ids.partidoFinalizado = await insertar('partido', {
    id_torneo: ids.torneoFutbol,
    id_equipo_local: ids.equipoA2,
    id_equipo_visitante: ids.equipoB1,
    estado: 'Finalizado',
    resultado_cargado: true
  }, 'id_partido');

  ids.presentacion = await insertar('presentacion', {
    id_torneo: ids.torneoGimnasia,
    id_disciplina: ids.gimnasia,
    orden: 1,
    estado: 'EN_CURSO',
    fecha_hora: '2026-11-20T12:00:00-03:00'
  }, 'id_presentacion');
  await knex('presentacion_participante').insert({ id_presentacion: ids.presentacion, id_equipo: ids.equipoG1, rol: 'GRUPO', orden_salida: 1 });
});

afterAll(async () => {
  await knex('presentacion').where('id_presentacion', ids.presentacion).del();
  await knex('partido').whereIn('id_partido', [ids.partidoProgramado, ids.partidoFinalizado]).del();
  await knex('equipo').whereIn('id_equipo', [ids.equipoA1, ids.equipoA2, ids.equipoB1, ids.equipoG1]).del();
  await knex('etapa').where('id_etapa', ids.etapa).del();
  await knex('torneo').whereIn('id_torneo', [ids.torneoFutbol, ids.torneoGimnasia]).del();
  await knex('disponibilidad_cancha').where('id_disponibilidad', ids.disponibilidad).del();
  await knex('fecha_horario').where('fecha_horario', ids.fechaHorario).del();
  await knex('fecha_cancha').where('id_fecha_cancha', ids.fechaCancha).del();
  await knex('horarios_cancha').where('id_horario_cancha', ids.horario).del();
  await knex('cancha').where('id_cancha', ids.cancha).del();
  await knex('disciplina').whereIn('id_disciplina', [ids.futbol, ids.gimnasia]).del();
  await knex('institucion').whereIn('id_institucion', [ids.institucionA, ids.institucionB]).del();
  await knex('usuario').where('id_usuario', ids.usuario).del();
  await knex('localidad').whereIn('id_localidad', [ids.localidadA, ids.localidadB]).del();
  await knex('distrito').where('id_distrito', ids.distrito).del();
  await knex('region').whereIn('id_region', [ids.regionA, ids.regionB]).del();
  await knex.destroy();
});

const fixture = (params) => request(app).get('/public/fixture').query(params);

describe('API publica de solo lectura', () => {
  it('lista regiones sin autenticacion y solo con id y nombre', async () => {
    const res = await request(app).get('/public/regions');
    expect(res.status).toBe(200);
    const region = res.body.data.find((r) => r.id_region === ids.regionA);
    expect(region).toEqual({ id_region: ids.regionA, nombre: `${TAG} Region A` });
  });

  it('lista disciplinas con su modalidad de competencia', async () => {
    const res = await request(app).get('/public/disciplines');
    expect(res.status).toBe(200);
    expect(res.body.data.find((d) => d.id_disciplina === ids.gimnasia).tipo_competencia).toBe('EVALUACION');
  });

  it('filtra torneos por region segun los equipos que participan', async () => {
    const regionA = await request(app).get('/public/tournaments').query({ id_region: ids.regionA });
    const idsA = regionA.body.data.map((t) => t.id_torneo);
    expect(idsA).toContain(ids.torneoFutbol);
    expect(idsA).not.toContain(ids.torneoGimnasia);

    const regionB = await request(app).get('/public/tournaments').query({ id_region: ids.regionB });
    const idsB = regionB.body.data.map((t) => t.id_torneo);
    expect(idsB).toEqual(expect.arrayContaining([ids.torneoFutbol, ids.torneoGimnasia]));
  });

  it('devuelve las etapas de un torneo y 404 si el torneo no existe', async () => {
    const res = await request(app).get(`/public/tournaments/${ids.torneoFutbol}/stages`);
    expect(res.status).toBe(200);
    expect(res.body.data.map((e) => e.id_etapa)).toEqual([ids.etapa]);

    const inexistente = await request(app).get('/public/tournaments/999999999/stages');
    expect(inexistente.status).toBe(404);
  });

  it('arma el partido con fecha, hora, cancha y equipos, ordenado cronologicamente', async () => {
    const res = await fixture({ id_torneo: ids.torneoFutbol });
    expect(res.status).toBe(200);
    const { eventos, total, truncado } = res.body.data;
    expect(total).toBe(2);
    expect(truncado).toBe(false);
    expect(eventos.map((e) => e.id)).toEqual([ids.partidoProgramado, ids.partidoFinalizado]);

    const [programado, finalizado] = eventos;
    expect(programado).toMatchObject({
      tipo: 'PARTIDO',
      fecha: '2026-11-20',
      hora: '10:00',
      estado: 'PROGRAMADO',
      resultado: null,
      etapa: { id: ids.etapa, nombre: 'Etapa Regional', orden: 1 },
      disciplina: { id: ids.futbol, tipo_competencia: 'MARCADOR' },
      cancha: { id: ids.cancha, nombre: `${TAG} Cancha 1`, ubicacion: 'Polideportivo Municipal', link_maps: 'https://maps.example/cancha' }
    });
    expect(programado.equipos.map((e) => e.rol)).toEqual(['LOCAL', 'VISITANTE']);
    expect(programado.equipos[0]).toMatchObject({ id: ids.equipoA1, institucion: `${TAG} Escuela A` });

    expect(finalizado).toMatchObject({ estado: 'FINALIZADO', fecha: null, cancha: null, resultado: { local: 0, visitante: 0 } });
  });

  it('arma la presentacion sin enfrentamiento y con hora local', async () => {
    const res = await fixture({ id_torneo: ids.torneoGimnasia });
    const [presentacion] = res.body.data.eventos;
    expect(presentacion).toMatchObject({
      tipo: 'PRESENTACION',
      id: ids.presentacion,
      estado: 'EN_JUEGO',
      fecha: '2026-11-20',
      hora: '12:00',
      resultado: null
    });
    expect(presentacion.equipos).toEqual([
      { id: ids.equipoG1, nombre: `${TAG} G1`, institucion: `${TAG} Escuela B`, rol: 'GRUPO', orden_salida: 1 }
    ]);
  });

  it('filtra encuentros por region, incluida la region heredada de la institucion', async () => {
    const regionA = await fixture({ id_region: ids.regionA, id_disciplina: ids.futbol });
    expect(regionA.body.data.eventos.map((e) => e.id).sort()).toEqual([ids.partidoProgramado, ids.partidoFinalizado].sort());

    const regionB = await fixture({ id_region: ids.regionB, id_disciplina: ids.futbol });
    expect(regionB.body.data.eventos.map((e) => e.id)).toEqual([ids.partidoFinalizado]);
  });

  it('filtra por fecha de juego, etapa y estado', async () => {
    const porFecha = await fixture({ id_torneo: ids.torneoFutbol, desde: '2026-11-20', hasta: '2026-11-20' });
    expect(porFecha.body.data.eventos.map((e) => e.id)).toEqual([ids.partidoProgramado]);

    const porEtapa = await fixture({ id_etapa: ids.etapa });
    expect(porEtapa.body.data.eventos.map((e) => e.id)).toEqual([ids.partidoProgramado]);

    const porEstado = await fixture({ id_torneo: ids.torneoFutbol, estado: 'FINALIZADO' });
    expect(porEstado.body.data.eventos.map((e) => e.id)).toEqual([ids.partidoFinalizado]);
  });

  it('respeta el limite y avisa si la lista se trunco', async () => {
    const res = await fixture({ id_torneo: ids.torneoFutbol, limite: 1 });
    expect(res.body.data).toMatchObject({ total: 2, limite: 1, truncado: true });
    expect(res.body.data.eventos).toHaveLength(1);
  });

  it('calcula el resumen a partir de los encuentros filtrados', async () => {
    const res = await request(app).get('/public/summary').query({ id_torneo: ids.torneoFutbol });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ disciplinas: 1, equipos: 3, encuentros: 2, partidos: 2, presentaciones: 0 });
    expect(res.body.data.por_estado).toMatchObject({ PROGRAMADO: 1, FINALIZADO: 1 });
  });

  it('no expone datos personales de profesores ni usuarios', async () => {
    const respuestas = await Promise.all([
      fixture({ id_torneo: ids.torneoFutbol }),
      fixture({ id_torneo: ids.torneoGimnasia }),
      request(app).get('/public/tournaments')
    ]);
    for (const res of respuestas) {
      const cuerpo = JSON.stringify(res.body);
      expect(cuerpo).not.toContain(NOMBRE_PROFESOR);
      expect(cuerpo).not.toContain(EMAIL_PROFESOR);
      expect(cuerpo).not.toMatch(/coach|arbitro|telefono|email|documento/i);
    }
  });

  it('valida los parametros de consulta', async () => {
    expect((await fixture({ id_region: 'abc' })).status).toBe(400);
    expect((await fixture({ estado: 'BORRADO' })).status).toBe(400);
    expect((await fixture({ desde: '20-11-2026' })).status).toBe(400);
    expect((await fixture({ limite: 5000 })).status).toBe(400);
    expect((await request(app).get('/public/tournaments/abc/stages')).status).toBe(400);
  });

  it('rechaza cualquier metodo de escritura', async () => {
    for (const metodo of ['post', 'put', 'patch', 'delete']) {
      const res = await request(app)[metodo]('/public/fixture');
      expect(res.status).toBe(405);
      expect(res.headers.allow).toBe('GET, HEAD, OPTIONS');
    }
  });

  it('responde 404 en rutas publicas inexistentes', async () => {
    expect((await request(app).get('/public/users')).status).toBe(404);
  });

  it('habilita CORS sin credenciales y cache corta', async () => {
    const res = await request(app).get('/public/regions').set('Origin', 'https://fixture.example');
    expect(res.headers['access-control-allow-origin']).toBe('*');
    expect(res.headers['access-control-allow-credentials']).toBeUndefined();
    expect(res.headers['cache-control']).toBe('public, max-age=30');
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
  });

  it('no abre las rutas privadas existentes', async () => {
    expect((await request(app).get('/matches')).status).toBe(401);
    expect((await request(app).get('/regions')).status).toBe(401);
  });
});
