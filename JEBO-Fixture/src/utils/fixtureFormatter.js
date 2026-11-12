export const ESTADOS = {
  PROGRAMADO: { etiqueta: 'Programado', tono: 'programado' },
  PENDIENTE: { etiqueta: 'A confirmar', tono: 'pendiente' },
  EN_JUEGO: { etiqueta: 'En juego', tono: 'en-juego' },
  FINALIZADO: { etiqueta: 'Finalizado', tono: 'finalizado' },
  SUSPENDIDO: { etiqueta: 'Suspendido', tono: 'suspendido' },
  CANCELADO: { etiqueta: 'Cancelado', tono: 'cancelado' }
};

export const etiquetaEstado = (estado) => ESTADOS[estado]?.etiqueta || 'Sin estado';
export const tonoEstado = (estado) => ESTADOS[estado]?.tono || 'pendiente';

const COLORES_DISCIPLINA = ['violeta', 'amarillo', 'magenta', 'verde', 'cian', 'petroleo'];

export const colorDisciplina = (idDisciplina) =>
  COLORES_DISCIPLINA[Math.abs(Number(idDisciplina) || 0) % COLORES_DISCIPLINA.length];

export const esPartido = (evento) => evento.tipo === 'PARTIDO';

export const lugarDeEvento = (cancha) => {
  if (!cancha) return null;
  return { principal: cancha.nombre, detalle: cancha.ubicacion, mapa: cancha.link_maps };
};

const ROLES_PARTICIPACION = { INDIVIDUAL: 'Individual', PAREJA: 'Pareja', GRUPO: 'Grupo' };

export const etiquetaRol = (rol) => ROLES_PARTICIPACION[rol] || null;

export const nombreTorneo = (torneo) =>
  torneo?.categoria && !torneo.nombre.includes(torneo.categoria)
    ? `${torneo.nombre} ${torneo.categoria}`
    : torneo?.nombre || '';
