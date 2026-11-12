const CERRADOS = new Set(['FINALIZADO', 'CANCELADO']);

const claveOrden = (e) => `${e.fecha || '9999-12-31'} ${e.hora || '99:99'}`;

export const ordenar = (eventos, sentido = 1) =>
  [...eventos].sort((a, b) => (claveOrden(a) < claveOrden(b) ? -sentido : claveOrden(a) > claveOrden(b) ? sentido : 0));

export const proximos = (eventos, hoy, cantidad = Infinity) =>
  ordenar(eventos.filter((e) => e.fecha && e.fecha >= hoy && !CERRADOS.has(e.estado))).slice(0, cantidad);

export const enJuego = (eventos) => eventos.filter((e) => e.estado === 'EN_JUEGO');

export const ultimosResultados = (eventos, cantidad = 6) =>
  ordenar(eventos.filter((e) => e.estado === 'FINALIZADO'), -1).slice(0, cantidad);

export const agruparPorDia = (eventos) => {
  const grupos = new Map();
  for (const evento of ordenar(eventos)) {
    const clave = evento.fecha || 'sin-fecha';
    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave).push(evento);
  }
  return [...grupos.entries()].map(([fecha, items]) => ({ fecha: fecha === 'sin-fecha' ? null : fecha, eventos: items }));
};

export const agruparPorDisciplina = (eventos) => {
  const grupos = new Map();
  for (const evento of ordenar(eventos)) {
    const { id, nombre, tipo_competencia: tipo } = evento.disciplina;
    if (!grupos.has(id)) grupos.set(id, { disciplina: { id, nombre, tipo }, eventos: [] });
    grupos.get(id).eventos.push(evento);
  }
  return [...grupos.values()].sort((a, b) => a.disciplina.nombre.localeCompare(b.disciplina.nombre, 'es'));
};

export const contarPorDia = (eventos, desde, dias) => {
  const conteo = new Map();
  for (const e of eventos) if (e.fecha) conteo.set(e.fecha, (conteo.get(e.fecha) || 0) + 1);
  const resultado = [];
  const inicio = new Date(`${desde}T12:00:00Z`);
  for (let i = 0; i < dias; i += 1) {
    const fecha = new Date(inicio);
    fecha.setUTCDate(inicio.getUTCDate() + i);
    const iso = fecha.toISOString().slice(0, 10);
    resultado.push({ fecha: iso, cantidad: conteo.get(iso) || 0 });
  }
  return resultado;
};
