import { hoyEnArgentina, sumarDias } from '../utils/dateFormatter';

const REGIONES = [
  { id_region: 1, nombre: 'Región 1' },
  { id_region: 2, nombre: 'Región 2' },
  { id_region: 6, nombre: 'Región 6' }
];

const DISCIPLINAS = [
  { id_disciplina: 1, nombre: 'Fútbol', tipo_competencia: 'MARCADOR' },
  { id_disciplina: 2, nombre: 'Gimnasia artística', tipo_competencia: 'EVALUACION' },
  { id_disciplina: 3, nombre: 'Vóley', tipo_competencia: 'MARCADOR' },
  { id_disciplina: 4, nombre: 'Handball', tipo_competencia: 'MARCADOR' }
];

const TORNEOS = [
  { id_torneo: 10, nombre: 'Fútbol masculino', categoria: 'Sub-16', id_disciplina: 1 },
  { id_torneo: 11, nombre: 'Fútbol femenino', categoria: 'Sub-14', id_disciplina: 1 },
  { id_torneo: 20, nombre: 'Gimnasia artística', categoria: 'Sub-14', id_disciplina: 2 },
  { id_torneo: 30, nombre: 'Vóley mixto', categoria: 'Sub-17', id_disciplina: 3 },
  { id_torneo: 40, nombre: 'Handball femenino', categoria: 'Sub-16', id_disciplina: 4 }
];

const ETAPAS = [
  { id_etapa: 101, id_torneo: 10, nombre: 'Etapa Regional', orden: 1 },
  { id_etapa: 102, id_torneo: 10, nombre: 'Etapa Interregional', orden: 2 },
  { id_etapa: 111, id_torneo: 11, nombre: 'Etapa Regional', orden: 1 },
  { id_etapa: 201, id_torneo: 20, nombre: 'Etapa Regional', orden: 1 },
  { id_etapa: 301, id_torneo: 30, nombre: 'Etapa Regional', orden: 1 },
  { id_etapa: 401, id_torneo: 40, nombre: 'Etapa Regional', orden: 1 }
];

const CANCHAS = [
  { id: 1, nombre: 'Polideportivo Municipal, cancha 1', ubicacion: 'Av. San Martín 1200', link_maps: null },
  { id: 2, nombre: 'Polideportivo Municipal, cancha 2', ubicacion: 'Av. San Martín 1200', link_maps: null },
  { id: 3, nombre: 'Gimnasio Municipal', ubicacion: 'Calle 9 y 54', link_maps: null },
  { id: 4, nombre: 'Club Atlético Unión', ubicacion: 'Belgrano 450', link_maps: null }
];

const EQUIPOS = [
  { id: 1, nombre: 'EEST N° 2', institucion: 'Escuela de Educación Secundaria Técnica N° 2', region: 1 },
  { id: 2, nombre: 'EES N° 14', institucion: 'Escuela de Educación Secundaria N° 14', region: 1 },
  { id: 3, nombre: 'EES N° 7', institucion: 'Escuela de Educación Secundaria N° 7', region: 1 },
  { id: 4, nombre: 'EEST N° 5', institucion: 'Escuela de Educación Secundaria Técnica N° 5', region: 2 },
  { id: 5, nombre: 'EES N° 31', institucion: 'Escuela de Educación Secundaria N° 31', region: 2 },
  { id: 6, nombre: 'EES N° 3', institucion: 'Escuela de Educación Secundaria N° 3', region: 6 },
  { id: 7, nombre: 'EEST N° 1', institucion: 'Escuela de Educación Secundaria Técnica N° 1', region: 6 },
  { id: 8, nombre: 'EES N° 22', institucion: 'Escuela de Educación Secundaria N° 22', region: 2 }
];

const PLAN = [
  [10, 101, -3, '10:00', 1, 2, 'FINALIZADO', 1, [2, 1]],
  [10, 101, -3, '11:30', 3, 1, 'FINALIZADO', 1, [0, 0]],
  [30, 301, -2, '09:00', 4, 5, 'FINALIZADO', 3, [2, 1]],
  [40, 401, -1, '15:00', 6, 7, 'FINALIZADO', 4, [18, 21]],
  [10, 101, 0, '10:00', 2, 3, 'EN_JUEGO', 1, [1, 0]],
  [20, 201, 0, '09:00', [6], null, 'EN_JUEGO', 3, null],
  [20, 201, 0, '09:40', [4], null, 'PROGRAMADO', 3, null],
  [30, 301, 0, '16:00', 5, 8, 'PROGRAMADO', 2, null],
  [11, 111, 1, '10:00', 1, 3, 'PROGRAMADO', 2, null],
  [20, 201, 1, '09:00', [7], null, 'PROGRAMADO', 3, null],
  [10, 102, 2, '11:00', 1, 4, 'PROGRAMADO', 1, null],
  [40, 401, 2, '14:30', 6, 8, 'SUSPENDIDO', 4, null],
  [30, 301, 3, '09:30', 4, 8, 'PROGRAMADO', 2, null],
  [11, 111, 4, '10:00', 2, 5, 'PROGRAMADO', 1, null],
  [10, 102, 5, '15:00', 7, 2, 'PENDIENTE', null, null],
  [20, 201, 6, '10:20', [1], null, 'PROGRAMADO', 3, null],
  [40, 401, 8, '16:00', 7, 6, 'PROGRAMADO', 4, null],
  [10, 102, null, null, 3, 5, 'PENDIENTE', null, null]
];

const equipo = (id, rol) => {
  const e = EQUIPOS.find((x) => x.id === id);
  return { id: e.id, nombre: e.nombre, institucion: e.institucion, rol };
};

const construirEventos = () => {
  const hoy = hoyEnArgentina();
  return PLAN.map(([idTorneo, idEtapa, dia, hora, a, b, estado, idCancha, marcador], i) => {
    const torneo = TORNEOS.find((t) => t.id_torneo === idTorneo);
    const disciplina = DISCIPLINAS.find((d) => d.id_disciplina === torneo.id_disciplina);
    const etapa = ETAPAS.find((e) => e.id_etapa === idEtapa);
    const presentacion = Array.isArray(a);
    return {
      tipo: presentacion ? 'PRESENTACION' : 'PARTIDO',
      id: 1000 + i,
      clave: `${presentacion ? 'PRESENTACION' : 'PARTIDO'}-${1000 + i}`,
      disciplina: { id: disciplina.id_disciplina, nombre: disciplina.nombre, tipo_competencia: disciplina.tipo_competencia },
      torneo: { id: torneo.id_torneo, nombre: torneo.nombre, categoria: torneo.categoria },
      etapa: { id: etapa.id_etapa, nombre: etapa.nombre, orden: etapa.orden },
      fecha: dia === null ? null : sumarDias(hoy, dia),
      hora,
      estado,
      cancha: idCancha ? CANCHAS.find((c) => c.id === idCancha) : null,
      equipos: presentacion
        ? a.map((id, n) => ({ ...equipo(id, 'GRUPO'), orden_salida: n + 1 }))
        : [equipo(a, 'LOCAL'), equipo(b, 'VISITANTE')],
      resultado: marcador ? { local: marcador[0], visitante: marcador[1] } : null,
      ...(presentacion ? { orden: i } : {})
    };
  });
};

const regionDeEquipo = (id) => EQUIPOS.find((e) => e.id === id)?.region;

const filtrar = (eventos, p = {}) => eventos.filter((e) => {
  if (p.id_region && !e.equipos.some((x) => regionDeEquipo(x.id) === Number(p.id_region))) return false;
  if (p.id_disciplina && e.disciplina.id !== Number(p.id_disciplina)) return false;
  if (p.id_torneo && e.torneo.id !== Number(p.id_torneo)) return false;
  if (p.id_etapa && e.etapa?.id !== Number(p.id_etapa)) return false;
  if (p.desde && (!e.fecha || e.fecha < p.desde)) return false;
  if (p.hasta && (!e.fecha || e.fecha > p.hasta)) return false;
  if (p.estado && !String(p.estado).split(',').includes(e.estado)) return false;
  return true;
});

const resumen = (eventos) => {
  const porEstado = { PROGRAMADO: 0, PENDIENTE: 0, EN_JUEGO: 0, FINALIZADO: 0, SUSPENDIDO: 0, CANCELADO: 0 };
  for (const e of eventos) porEstado[e.estado] += 1;
  return {
    disciplinas: new Set(eventos.map((e) => e.disciplina.id)).size,
    equipos: new Set(eventos.flatMap((e) => e.equipos.map((x) => x.id))).size,
    encuentros: eventos.length,
    partidos: eventos.filter((e) => e.tipo === 'PARTIDO').length,
    presentaciones: eventos.filter((e) => e.tipo === 'PRESENTACION').length,
    por_estado: porEstado
  };
};

const esperar = (ms) => new Promise((r) => { setTimeout(r, ms); });

export async function responderMock(ruta, params = {}) {
  await esperar(250);
  const eventos = construirEventos();

  if (ruta === '/regions') return REGIONES;
  if (ruta === '/disciplines') return DISCIPLINAS;
  if (ruta === '/tournaments') {
    const visibles = params.id_region
      ? TORNEOS.filter((t) => filtrar(eventos, { id_region: params.id_region }).some((e) => e.torneo.id === t.id_torneo))
      : TORNEOS;
    return visibles.map((t) => {
      const d = DISCIPLINAS.find((x) => x.id_disciplina === t.id_disciplina);
      return { ...t, disciplina_nombre: d.nombre, tipo_competencia: d.tipo_competencia };
    });
  }
  const etapas = ruta.match(/^\/tournaments\/(\d+)\/stages$/);
  if (etapas) return ETAPAS.filter((e) => e.id_torneo === Number(etapas[1]));
  if (ruta === '/fixture') {
    const lista = filtrar(eventos, params);
    return { eventos: lista, total: lista.length, limite: 500, truncado: false };
  }
  if (ruta === '/summary') return resumen(filtrar(eventos, params));
  throw new Error(`Ruta mock desconocida: ${ruta}`);
}
