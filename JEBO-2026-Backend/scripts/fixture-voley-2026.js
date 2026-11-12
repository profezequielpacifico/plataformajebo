(async () => {
  const ID_TORNEO = 3;
  const FECHA = '2026-11-18';
  const DURACION_MIN = 25;
  const CANCHAS = { 1: 'Cancha Vóley 1', 2: 'Cancha Vóley 2', 3: 'Cancha Vóley 3' };

  const GRILLA = [
    [23, 11, '10:00', 1], [24, 7, '10:00', 2], [6, 9, '10:00', 3],
    [22, 10, '10:25', 1], [18, 14, '10:25', 2], [17, 13, '10:25', 3],
    [25, 8, '10:50', 1], [21, 12, '10:50', 2], [9, 4, '10:50', 3],
    [10, 5, '11:15', 1], [22, 18, '11:15', 2], [23, 1, '11:15', 3],
    [19, 15, '11:40', 1], [20, 16, '11:40', 2], [7, 2, '11:40', 3],
    [11, 1, '12:05', 1], [14, 5, '12:05', 2], [6, 17, '12:05', 3],
    [8, 3, '12:30', 1], [25, 21, '12:30', 2], [10, 18, '12:30', 3],
    [23, 19, '12:55', 1], [24, 20, '12:55', 2], [13, 4, '12:55', 3],
    [14, 22, '13:20', 1], [18, 5, '13:20', 2], [9, 17, '13:20', 3],
    [15, 1, '13:45', 1], [16, 2, '13:45', 2], [13, 6, '13:45', 3],
    [12, 3, '14:10', 1], [8, 21, '14:10', 2], [17, 4, '14:10', 3],
    [14, 10, '14:35', 1], [7, 20, '14:35', 2], [16, 24, '14:35', 3],
    [11, 19, '15:00', 1], [12, 25, '15:00', 2], [13, 9, '15:00', 3],
    [21, 3, '15:25', 1], [20, 2, '15:25', 2], [15, 23, '15:25', 3],
    [19, 1, '15:50', 1], [16, 7, '15:50', 2], [6, 4, '15:50', 3],
    [22, 5, '16:15', 1], [12, 8, '16:15', 2], [15, 11, '16:15', 3],
    [25, 3, '16:40', 1], [24, 2, '16:40', 2]
  ];

  const api = async (metodo, ruta, cuerpo) => {
    const r = await fetch('/api' + ruta, {
      method: metodo,
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`${metodo} ${ruta} -> ${r.status}: ${j.error || j.message || JSON.stringify(j.errors || j)}`);
    return j.data;
  };

  const aHHMM = (h) => String(h).slice(0, 5);
  const sumarMinutos = (hhmm, min) => {
    const [h, m] = hhmm.split(':').map(Number);
    const t = h * 60 + m + min;
    return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  };
  const clave = (a, b) => [a, b].sort((x, y) => x - y).join('-');

  const equipos = {};
  for (const busqueda of ['Vóley', 'Voley']) {
    for (const e of await api('GET', `/teams?limit=100&search=${encodeURIComponent(busqueda)}`)) {
      const region = Number((e.nombre.match(/Regi[oó]n (\d+)/) || [])[1]);
      if (!region) continue;
      if (equipos[region] && equipos[region] !== e.id_equipo) throw new Error(`Hay más de un equipo de Vóley en la Región ${region}`);
      equipos[region] = e.id_equipo;
    }
  }
  const regionesFaltantes = [...new Set(GRILLA.flatMap((g) => [g[0], g[1]]))].filter((r) => !equipos[r]);
  if (regionesFaltantes.length) throw new Error(`Faltan equipos de Vóley de las regiones: ${regionesFaltantes.join(', ')}`);

  const canchas = {};
  for (const c of await api('GET', '/courts')) {
    const numero = Object.keys(CANCHAS).find((n) => CANCHAS[n] === c.nombre);
    if (numero) canchas[numero] = c.id_cancha;
  }
  const canchasFaltantes = Object.keys(CANCHAS).filter((n) => !canchas[n]);
  if (canchasFaltantes.length) throw new Error(`Faltan las canchas: ${canchasFaltantes.map((n) => CANCHAS[n]).join(', ')}`);

  const existentes = new Set((await api('GET', '/courts/horarios')).map((h) => aHHMM(h.hora_inicio)));
  const horasFaltantes = [...new Set(GRILLA.map((g) => g[2]))].filter((h) => !existentes.has(h)).sort();
  if (horasFaltantes.length) {
    console.log('Horarios cargados:', await api('POST', '/courts/horarios', {
      horarios: horasFaltantes.map((h) => ({ hora_inicio: h, hora_fin: sumarMinutos(h, DURACION_MIN) }))
    }));
  }

  const yaCreados = new Set();
  for (let pagina = 1; ; pagina++) {
    const lote = await api('GET', `/matches?id_torneo=${ID_TORNEO}&limit=100&page=${pagina}`);
    lote.forEach((p) => yaCreados.add(clave(p.id_equipo_local, p.id_equipo_visitante)));
    if (lote.length < 100) break;
  }

  const resultado = { creados: 0, salteados: 0, errores: [] };
  for (const [rLocal, rVisitante, hora, cancha] of GRILLA) {
    const local = equipos[rLocal];
    const visitante = equipos[rVisitante];
    if (yaCreados.has(clave(local, visitante))) {
      resultado.salteados++;
      continue;
    }
    try {
      await api('POST', '/matches', {
        id_torneo: ID_TORNEO,
        id_equipo_local: local,
        id_equipo_visitante: visitante,
        fecha: FECHA,
        hora,
        id_cancha: canchas[cancha]
      });
      resultado.creados++;
    } catch (err) {
      resultado.errores.push(`Región ${rLocal} vs Región ${rVisitante} ${hora} ${CANCHAS[cancha]}: ${err.message}`);
    }
  }
  console.log(`Partidos creados: ${resultado.creados}, ya existían: ${resultado.salteados}, de ${GRILLA.length}`);
  if (resultado.errores.length) console.table(resultado.errores);
  return resultado;
})();
