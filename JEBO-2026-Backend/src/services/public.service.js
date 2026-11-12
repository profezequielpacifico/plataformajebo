const publicRepository = require('../repositories/public.repository');
const { NotFoundError } = require('../utils/errors');

const ESTADOS_PUBLICOS = {
  PROGRAMADO: 'PROGRAMADO',
  PENDIENTE: 'PENDIENTE',
  EN_JUEGO: 'EN_JUEGO',
  FINALIZADO: 'FINALIZADO',
  SUSPENDIDO: 'SUSPENDIDO',
  CANCELADO: 'CANCELADO'
};

const MAPA_ESTADOS = {
  Programado: ESTADOS_PUBLICOS.PROGRAMADO,
  Pendiente: ESTADOS_PUBLICOS.PENDIENTE,
  'En Juego': ESTADOS_PUBLICOS.EN_JUEGO,
  Finalizado: ESTADOS_PUBLICOS.FINALIZADO,
  Suspendido: ESTADOS_PUBLICOS.SUSPENDIDO,
  Cancelado: ESTADOS_PUBLICOS.CANCELADO,
  PROGRAMADA: ESTADOS_PUBLICOS.PROGRAMADO,
  EN_CURSO: ESTADOS_PUBLICOS.EN_JUEGO,
  FINALIZADA: ESTADOS_PUBLICOS.FINALIZADO,
  CANCELADA: ESTADOS_PUBLICOS.CANCELADO
};

const LIMITE_MAXIMO = 500;

const normalizarEstado = (estado) => MAPA_ESTADOS[estado] || ESTADOS_PUBLICOS.PENDIENTE;

const cancha = (fila) => (fila.id_cancha
  ? {
      id: fila.id_cancha,
      nombre: fila.cancha_nombre,
      ubicacion: fila.cancha_ubicacion || null,
      link_maps: fila.cancha_link_maps || null
    }
  : null);

const etapa = (fila) => (fila.id_etapa
  ? { id: fila.id_etapa, nombre: fila.etapa_nombre, orden: fila.etapa_orden }
  : null);

const base = (tipo, fila) => ({
  tipo,
  id: fila.id,
  clave: `${tipo}-${fila.id}`,
  disciplina: {
    id: fila.id_disciplina,
    nombre: fila.disciplina_nombre,
    tipo_competencia: fila.tipo_competencia
  },
  torneo: { id: fila.id_torneo, nombre: fila.torneo_nombre, categoria: fila.torneo_categoria || null },
  etapa: etapa(fila),
  fecha: fila.fecha || null,
  hora: fila.hora || null,
  estado: normalizarEstado(fila.estado),
  cancha: cancha(fila)
});

const desdePartido = (fila) => {
  const evento = base('PARTIDO', fila);
  const conMarcador = fila.resultado_cargado
    || evento.estado === ESTADOS_PUBLICOS.FINALIZADO
    || evento.estado === ESTADOS_PUBLICOS.EN_JUEGO;
  return {
    ...evento,
    equipos: [
      { id: fila.local_id, nombre: fila.local_nombre, institucion: fila.local_institucion || null, rol: 'LOCAL' },
      { id: fila.visitante_id, nombre: fila.visitante_nombre, institucion: fila.visitante_institucion || null, rol: 'VISITANTE' }
    ],
    resultado: conMarcador ? { local: fila.puntos_local, visitante: fila.puntos_visitante } : null
  };
};

const desdePresentacion = (fila) => ({
  ...base('PRESENTACION', fila),
  orden: fila.orden,
  equipos: (fila.participantes || []).map((p) => ({
    id: p.id,
    nombre: p.nombre,
    institucion: p.institucion || null,
    rol: p.rol,
    orden_salida: p.orden_salida
  })),
  resultado: null
});

const claveOrden = (evento) => `${evento.fecha || '9999-12-31'} ${evento.hora || '99:99'}`;

const ordenarCronologicamente = (eventos) => [...eventos].sort((a, b) => {
  const ka = claveOrden(a);
  const kb = claveOrden(b);
  if (ka !== kb) return ka < kb ? -1 : 1;
  return a.clave < b.clave ? -1 : a.clave > b.clave ? 1 : 0;
});

const filtrarPorEstado = (eventos, estados) => (estados && estados.length
  ? eventos.filter((e) => estados.includes(e.estado))
  : eventos);

class PublicService {
  async regiones() {
    return publicRepository.regiones();
  }

  async disciplinas() {
    return publicRepository.disciplinas();
  }

  async torneos(filtros = {}) {
    return publicRepository.torneos(filtros);
  }

  async etapas(idTorneo) {
    const torneo = await publicRepository.torneoExiste(idTorneo);
    if (!torneo) throw new NotFoundError('Torneo no encontrado');
    return publicRepository.etapas(idTorneo);
  }

  async eventos(filtros = {}) {
    const [partidos, presentaciones] = await Promise.all([
      publicRepository.partidos(filtros),
      publicRepository.presentaciones(filtros)
    ]);
    const eventos = [...partidos.map(desdePartido), ...presentaciones.map(desdePresentacion)];
    return filtrarPorEstado(ordenarCronologicamente(eventos), filtros.estados);
  }

  async fixture(filtros = {}) {
    const eventos = await this.eventos(filtros);
    const limite = Math.min(filtros.limite || LIMITE_MAXIMO, LIMITE_MAXIMO);
    return {
      eventos: eventos.slice(0, limite),
      total: eventos.length,
      limite,
      truncado: eventos.length > limite
    };
  }

  async resumen(filtros = {}) {
    const eventos = await this.eventos(filtros);
    const disciplinas = new Set();
    const equipos = new Set();
    const porEstado = Object.fromEntries(Object.values(ESTADOS_PUBLICOS).map((e) => [e, 0]));

    for (const evento of eventos) {
      disciplinas.add(evento.disciplina.id);
      for (const equipo of evento.equipos) equipos.add(equipo.id);
      porEstado[evento.estado] += 1;
    }

    return {
      disciplinas: disciplinas.size,
      equipos: equipos.size,
      encuentros: eventos.length,
      partidos: eventos.filter((e) => e.tipo === 'PARTIDO').length,
      presentaciones: eventos.filter((e) => e.tipo === 'PRESENTACION').length,
      por_estado: porEstado
    };
  }
}

module.exports = new PublicService();
module.exports.ESTADOS_PUBLICOS = ESTADOS_PUBLICOS;
module.exports.LIMITE_MAXIMO = LIMITE_MAXIMO;
module.exports.normalizarEstado = normalizarEstado;
module.exports.ordenarCronologicamente = ordenarCronologicamente;
