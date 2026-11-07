const CRITERIOS_MARCADOR = {
  PUNTOS: (f) => Number(f.puntos) || 0,
  DIFERENCIA: (f) => (Number(f.gf) || 0) - (Number(f.gc) || 0),
  A_FAVOR: (f) => Number(f.gf) || 0
};

const CRITERIOS_EVALUACION = {
  PUNTAJE: (f) => Number(f.puntaje_promedio) || 0,
  COORDINACION: (f) => Number(f.coord_promedio) || 0,
  MUY_BIEN: (f) => Number(f.muy_bien_total) || 0,
  MENOS_REGULAR: (f) => -(Number(f.regular_total) || 0)
};

const ORDEN_EVALUACION = ['PUNTAJE', 'COORDINACION', 'MUY_BIEN', 'MENOS_REGULAR'];

const criteriosValidos = (criterios) => {
  const lista = Array.isArray(criterios) ? criterios : [];
  const validos = lista.filter((c) => CRITERIOS_MARCADOR[c]);
  return validos.length > 0 ? validos : ['PUNTOS', 'DIFERENCIA', 'A_FAVOR'];
};

const funcionesDe = (modalidad, criterios) => (modalidad === 'EVALUACION'
  ? ORDEN_EVALUACION.map((c) => CRITERIOS_EVALUACION[c])
  : criteriosValidos(criterios).map((c) => CRITERIOS_MARCADOR[c]));

const comparar = (a, b, funciones) => {
  for (const valor of funciones) {
    const diferencia = valor(b) - valor(a);
    if (diferencia !== 0) return diferencia;
  }
  return 0;
};

const ordenarTabla = (filas, { modalidad = 'LIGA', criterios } = {}) => {
  const funciones = funcionesDe(modalidad, criterios);
  const ordenadas = filas
    .slice()
    .sort((a, b) => comparar(a, b, funciones) || Number(a.id_equipo) - Number(b.id_equipo));

  let posicion = 0;
  return ordenadas.map((fila, indice) => {
    const anterior = ordenadas[indice - 1];
    if (!anterior || comparar(anterior, fila, funciones) !== 0) posicion = indice + 1;
    const siguiente = ordenadas[indice + 1];
    const empatado = (anterior && comparar(anterior, fila, funciones) === 0)
      || (siguiente && comparar(fila, siguiente, funciones) === 0);
    return { ...fila, posicion, empatado: Boolean(empatado) };
  });
};

const resolverCorte = (tabla, cantidad) => {
  const clasificados = tabla.slice(0, cantidad);
  const primeroAfuera = tabla[cantidad];
  const ultimoAdentro = clasificados[clasificados.length - 1];
  const empateEnCorte = Boolean(primeroAfuera && ultimoAdentro && primeroAfuera.posicion === ultimoAdentro.posicion);
  return {
    clasificados: empateEnCorte ? [] : clasificados,
    empateEnCorte,
    empatados: empateEnCorte ? tabla.filter((f) => f.posicion === ultimoAdentro.posicion) : []
  };
};

const resolverConDesempate = (tabla, cantidad, elegidos) => {
  const corte = resolverCorte(tabla, cantidad);
  if (!corte.empateEnCorte) return { ...corte, valido: true };

  const posicionEmpate = corte.empatados[0].posicion;
  const seguros = tabla.filter((f) => f.posicion < posicionEmpate);
  const cupos = cantidad - seguros.length;
  const ids = (Array.isArray(elegidos) ? elegidos : []).map(Number);
  const unicos = new Set(ids);
  const validos = corte.empatados.filter((f) => unicos.has(Number(f.id_equipo)));
  if (ids.length !== cupos || unicos.size !== cupos || validos.length !== cupos) {
    return { ...corte, valido: false, cupos };
  }
  return { clasificados: [...seguros, ...validos], empateEnCorte: true, empatados: corte.empatados, valido: true, cupos };
};

const repartirEnZonas = (territorios, porZona) => {
  if (!porZona) return [territorios];
  const zonas = [];
  for (let i = 0; i < territorios.length; i += porZona) {
    zonas.push(territorios.slice(i, i + porZona));
  }
  return zonas;
};

module.exports = { ordenarTabla, resolverCorte, resolverConDesempate, repartirEnZonas, criteriosValidos };
