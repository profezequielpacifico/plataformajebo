const crypto = require('crypto');
const knex = require('../src/config/knex');
const etapaInstancia = require('../src/services/etapa-instancia.service');

const PREFIJO = '[PRUEBA]';
const REGIONES_POR_ZONA = 5;

const etapaBase = {
  estado: 'Pendiente',
  tipo: 'LIGA',
  clasifican_por_instancia: 1,
  mejores_adicionales: 0,
  avanza_si_unico: true,
  es_final: false,
  origen_ambito: null,
  territorios_por_instancia: null
};

const ETAPAS_MARCADOR = [
  { ...etapaBase, nombre: 'Distrital', orden: 1, ambito: 'DISTRITO', origen_tipo: 'INSCRIPCION' },
  { ...etapaBase, nombre: 'Regional', orden: 2, ambito: 'REGION', origen_tipo: 'ETAPA', origen_ambito: 'DISTRITO' },
  { ...etapaBase, nombre: 'Interregional', orden: 3, ambito: 'INTERREGIONAL', origen_tipo: 'ETAPA', origen_ambito: 'REGION', territorios_por_instancia: REGIONES_POR_ZONA },
  { ...etapaBase, nombre: 'Nacional', orden: 4, ambito: 'NACIONAL', origen_tipo: 'ETAPA', origen_ambito: 'INTERREGIONAL', es_final: true }
];

const ETAPAS_EVALUACION = [
  { ...etapaBase, tipo: 'EVALUACION', nombre: 'Interregional', orden: 1, ambito: 'INTERREGIONAL', origen_tipo: 'INSCRIPCION', territorios_por_instancia: REGIONES_POR_ZONA },
  { ...etapaBase, tipo: 'EVALUACION', nombre: 'Nacional', orden: 2, ambito: 'NACIONAL', origen_tipo: 'ETAPA', origen_ambito: 'INTERREGIONAL', es_final: true }
];

const crearTorneo = async (nombreDisciplina, nombreTorneo, etapas) => {
  const disciplina = await knex('disciplina').where('nombre', nombreDisciplina).first();
  if (!disciplina) throw new Error(`No existe la disciplina ${nombreDisciplina}`);

  const [torneo] = await knex('torneo').insert({
    id_disciplina: disciplina.id_disciplina,
    nombre: `${PREFIJO} ${nombreTorneo}`,
    categoria: '2026',
    fecha_inicio: '2026-11-06',
    fecha_inscripcion_inicio: '2026-10-01T08:00:00-03:00',
    fecha_inscripcion_fin: '2026-11-05T20:00:00-03:00',
    estado: 'En Progreso',
    descripcion: 'Torneo de prueba para revisar las etapas. Se elimina con el script de restablecer datos.'
  }).returning('*');

  const equipos = await knex('equipo').where('id_disciplina', disciplina.id_disciplina).pluck('id_equipo');
  await knex('posicion').insert(equipos.map((id_equipo) => ({
    id_equipo,
    id_torneo: torneo.id_torneo,
    estado_torneo: 'Inscripto'
  })));

  const creadas = await knex('etapa')
    .insert(etapas.map((e) => ({ ...e, id_torneo: torneo.id_torneo })))
    .returning('*');
  return { torneo, etapas: creadas.sort((a, b) => a.orden - b.orden), equipos: equipos.length };
};

const instanciasDe = (idEtapa) => knex('etapa_instancia').where('id_etapa', idEtapa).orderBy('id_etapa_instancia');

const jugarPartido = async (partido, golesLocal, golesVisitante) => {
  const goles = [
    ...Array(golesLocal).fill(partido.id_equipo_local),
    ...Array(golesVisitante).fill(partido.id_equipo_visitante)
  ];
  for (let indice = 0; indice < goles.length; indice++) {
    await knex('evento_partido').insert({
      id_partido: partido.id_partido,
      numero_evento: indice + 1,
      tipo_evento: 'ANOTACION',
      id_equipo: goles[indice],
      hora_real: knex.fn.now(),
      estado: 'CONFIRMADO'
    });
  }
  await knex('partido').where('id_partido', partido.id_partido).update({
    estado: 'Finalizado',
    resultado_cargado: true,
    goles_local: golesLocal,
    goles_visitante: golesVisitante
  });
};

const resultadoDe = (indice) => [[2, 0], [1, 1], [0, 1], [3, 2], [1, 0], [2, 2]][indice % 6];

const jugarInstancia = async (idInstancia, cantidad) => {
  const partidos = await knex('partido').where('id_etapa_instancia', idInstancia).orderBy('id_partido');
  const aJugar = cantidad === undefined ? partidos : partidos.slice(0, cantidad);
  for (let indice = 0; indice < aJugar.length; indice++) {
    const [local, visitante] = resultadoDe(indice + idInstancia);
    await jugarPartido(aJugar[indice], local, visitante);
  }
};

const resolverEmpateDePrueba = (detalle) => {
  if (!detalle.empate_en_corte) return undefined;
  return [detalle.tabla.find((f) => detalle.empatados.includes(f.equipo_nombre)).id_equipo];
};

const jugarYFinalizar = async (idInstancia) => {
  await jugarInstancia(idInstancia);
  const detalle = await etapaInstancia.detalle(idInstancia);
  await etapaInstancia.finalizar(idInstancia, resolverEmpateDePrueba(detalle));
};

const cargarFutbol = async () => {
  const { torneo, etapas, equipos } = await crearTorneo('Fútbol', 'JEBO 2026 - Fútbol', ETAPAS_MARCADOR);
  const [distrital, regional, interregional] = etapas;

  await etapaInstancia.preparar(distrital.id_etapa);
  await etapaInstancia.preparar(regional.id_etapa);
  await etapaInstancia.preparar(interregional.id_etapa);

  const zonas = await instanciasDe(interregional.id_etapa);
  for (const zona of zonas) {
    await etapaInstancia.generarEncuentros(zona.id_etapa_instancia);
  }

  const [primera, segunda, tercera, cuarta] = zonas;
  await jugarYFinalizar(primera.id_etapa_instancia);
  await jugarYFinalizar(segunda.id_etapa_instancia);

  const partidosEmpatados = await knex('partido').where('id_etapa_instancia', tercera.id_etapa_instancia);
  for (const partido of partidosEmpatados) {
    await jugarPartido(partido, 1, 1);
  }
  await jugarInstancia(cuarta.id_etapa_instancia, 3);

  await knex.raw('SELECT actualizar_posiciones(?, ?)', [torneo.id_torneo, null]);
  return { torneo: torneo.nombre, equipos, zonas: zonas.length };
};

const crearJueces = async () => {
  const rol = await knex('rol').where('descripcion', 'Juez').first();
  if (!rol) throw new Error('No existe el rol Juez');
  const jueces = [];
  for (let numero = 1; numero <= 3; numero++) {
    const [juez] = await knex('usuario').insert({
      id_rol: rol.id_rol,
      nombre: `Juez de prueba ${numero}`,
      password_hash: `sin-acceso-${crypto.randomBytes(16).toString('hex')}`,
      email: `juez.prueba.${numero}@sin-email.invalid`,
      documento: `PRUEBA-JUEZ-${numero}`
    }).returning('id_usuario');
    jueces.push(juez.id_usuario);
  }
  return jueces;
};

const nota = (semilla, posicion) => 1 + ((semilla * semilla + posicion * (semilla % 3 + 1)) % 5);

const evaluarPresentacion = async (presentacion, jueces) => {
  const participante = await knex('presentacion_participante').where('id_presentacion', presentacion.id_presentacion).first();
  for (let indice = 0; indice < jueces.length; indice++) {
    await knex('staff_presentacion').insert({
      id_presentacion: presentacion.id_presentacion,
      id_usuario: jueces[indice],
      rol: indice === 0 ? 'JUEZ_PRESIDENTE' : 'JUEZ'
    });
    const semilla = presentacion.id_presentacion + indice;
    await knex('evaluacion').insert({
      id_presentacion: presentacion.id_presentacion,
      id_participante_equipo: participante.id_equipo,
      id_juez: jueces[indice],
      coord_1: nota(semilla, 1), desem_1: nota(semilla, 2),
      coord_2: nota(semilla, 3), desem_2: nota(semilla, 4),
      coord_3: nota(semilla, 5), desem_3: nota(semilla, 6),
      coord_4: nota(semilla, 7), desem_4: nota(semilla, 8)
    });
  }
  await knex('presentacion').where('id_presentacion', presentacion.id_presentacion).update({ estado: 'FINALIZADA' });
};

const cargarGimnasia = async () => {
  const { torneo, etapas, equipos } = await crearTorneo('Gimnasia Artística', 'JEBO 2026 - Gimnasia Artística', ETAPAS_EVALUACION);
  const [interregional] = etapas;

  await etapaInstancia.preparar(interregional.id_etapa);
  const zonas = await instanciasDe(interregional.id_etapa);
  for (const zona of zonas) {
    await etapaInstancia.generarEncuentros(zona.id_etapa_instancia);
  }

  const jueces = await crearJueces();
  const [primera] = zonas;
  const presentaciones = await knex('presentacion').where('id_etapa_instancia', primera.id_etapa_instancia);
  for (const presentacion of presentaciones) {
    await evaluarPresentacion(presentacion, jueces);
  }
  return { torneo: torneo.nombre, equipos, zonas: zonas.length };
};

const main = async () => {
  const existente = await knex('torneo').where('nombre', 'like', `${PREFIJO}%`).first();
  if (existente) {
    throw new Error('Los torneos de prueba ya están cargados. Restablecé los datos antes de volver a cargarlos.');
  }
  const futbol = await cargarFutbol();
  const gimnasia = await cargarGimnasia();
  console.log(JSON.stringify({ futbol, gimnasia }, null, 2));
};

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => knex.destroy());
