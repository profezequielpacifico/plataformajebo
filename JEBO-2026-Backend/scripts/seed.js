/**
 * Seed unificado de JEBO 2026.
 *
 * 1. Limpia TODA la base (respeta FKs, resetea secuencias).
 * 2. Siembra datos territoriales reales de la provincia de Buenos Aires:
 *    25 regiones + 135 partidos (distritos) + localidades.
 *    - Las localidades se leen del archivo pipe-delimited
 *      (PARTIDO | LOCALIDAD | CODIGO_POSTAL) si se pasa como argumento o
 *      existe en ~/Desktop. Si no existe, se cargan solo regiones y distritos.
 * 3. Siembra roles, disciplinas, instancias, horarios y el único SuperAdmin.
 *
 * Uso:
 *   node scripts/seed.js [ruta/al/archivo.txt]
 *   npm run db:seed
 */
const path = require('path');
const os = require('os');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const knex = require('../src/config/knex');

// ---------------------------------------------------------------------------
// 1. LIMPIEZA
// ---------------------------------------------------------------------------

const TABLES_TO_CLEAN = [
  'equipo_alumno', 'posicion', 'partido', 'disponibilidad_cancha',
  'fecha_horario', 'fecha_cancha', 'horarios_cancha',
  'presentacion_participante', 'presentacion', 'staff_presentacion',
  'evaluacion', 'configuracion_puntaje', 'equipo_integrante',
  'equipo', 'torneo', 'cancha', 'institucion', 'disciplina',
  'instancia', 'usuario_institucion', 'usuario', 'rol',
  'localidad', 'distrito', 'region',
  'bitacora', 'refresh_token_revocado', 'login_intentos',
  'imagenes', 'reglamento', 'fixture_generado', 'partido_ronda',
  'etapa', 'categoria'
];

async function cleanDatabase() {
  console.log('Limpiando base de datos...\n');
  for (const table of TABLES_TO_CLEAN) {
    try {
      const { c } = await knex(table).count('* as c').first();
      if (parseInt(c, 10) > 0) {
        await knex(table).del();
        console.log(`  ${table}: ${c} registros eliminados`);
      }
    } catch (err) {
      if (!/does not exist|no existe|relation/i.test(err.message)) {
        console.warn(`  ${table}: ${err.message}`);
      }
    }
  }
  const seq = await knex.raw(
    "SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'"
  );
  for (const s of seq.rows) {
    try { await knex.raw(`ALTER SEQUENCE ${s.sequence_name} RESTART WITH 1`); } catch (_) {}
  }
  console.log('Base de datos limpiada.\n');
}

// ---------------------------------------------------------------------------
// 2. DATOS TERRITORIALES REALES — Provincia de Buenos Aires
// ---------------------------------------------------------------------------

const CONECTORS = new Set(['de', 'del', 'el', 'la', 'los', 'las', 'y', 'a', 'en']);

function normalize(v) {
  return v.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function titleCase(v) {
  return v.trim().replace(/\s+/g, ' ').split(' ').map((w, i) => {
    const lower = w.toLowerCase();
    if (i > 0 && CONECTORS.has(lower)) return lower;
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join(' ');
}

// 25 regiones reales de la provincia de Buenos Aires
const REGION_MAP = {
  1: ['La Plata', 'Brandsen', 'Magdalena', 'Punta Indio', 'Berisso', 'Ensenada', 'General Paz'],
  2: ['Avellaneda', 'Lanús', 'Lomas de Zamora', 'Quilmes'],
  3: ['La Matanza', 'General Las Heras', 'General Rodríguez', 'Marcos Paz'],
  4: ['Berazategui', 'Florencio Varela'],
  5: ['Almirante Brown', 'Esteban Echeverría', 'Ezeiza', 'San Vicente', 'Presidente Perón'],
  6: ['San Isidro', 'Tigre', 'Vicente López'],
  7: ['General San Martín', 'Tres de Febrero', 'San Miguel'],
  8: ['Morón'],
  9: ['Hurlingham', 'Ituzaingó', 'Moreno', 'Merlo', 'José C. Paz'],
  10: ['Cañuelas', 'Luján', 'Mercedes', 'San Andrés de Giles'],
  11: ['Escobar', 'Exaltación de la Cruz', 'Malvinas Argentinas', 'Pilar', 'San Fernando'],
  12: ['Arrecifes', 'Baradero', 'Capitán Sarmiento', 'Ramallo', 'Salto', 'San Antonio de Areco', 'San Nicolás', 'San Pedro', 'Campana', 'Zárate'],
  13: ['Carmen de Areco', 'Colón', 'Junín', 'Pergamino', 'Rojas'],
  14: ['Chacabuco', 'General Arenales', 'General Viamonte', 'Lincoln', 'Nueve de Julio', 'Pellegrini', 'Florentino Ameghino', 'General Pinto', 'Hipólito Yrigoyen', 'Leandro N. Alem', 'Pehuajó'],
  15: ['Alberti', 'Bragado', 'Carlos Casares', 'Carlos Tejedor', 'Chivilcoy', 'General Villegas', 'Bolívar', 'Suipacha'],
  16: ['Adolfo Alsina', 'Rivadavia', 'Trenque Lauquen', 'Salliqueló', 'Tres Lomas'],
  17: ['Chascomús', 'General Guido', 'Lezama', 'Maipú', 'Pila', 'General Madariaga', 'Dolores', 'General Alvear', 'General Belgrano', 'General Lavalle', 'Las Flores', 'Monte', 'Tordillo'],
  18: ['Ayacucho', 'Castelli', 'La Costa', 'Pinamar', 'Tandil', 'Villa Gesell', 'Rauch'],
  19: ['General Alvarado', 'General Pueyrredón', 'Mar Chiquita'],
  20: ['Balcarce', 'Lobería', 'Necochea', 'San Cayetano'],
  21: ['Adolfo Gonzales Chaves', 'Benito Juárez', 'Coronel Dorrego', 'Coronel Pringles', 'Coronel Suárez', 'Tres Arroyos'],
  22: ['Bahía Blanca', 'Coronel Rosales', 'Patagones', 'Villarino', 'Monte Hermoso'],
  23: ['Daireaux', 'Guaminí', 'Puan', 'Saavedra', 'Tornquist'],
  24: ['Lobos', 'Roque Pérez', 'Saladillo', 'Veinticinco de Mayo', 'Navarro'],
  25: ['Azul', 'Olavarría', 'Tapalqué', 'General La Madrid', 'Laprida'],
};

function parseLocalidades(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  const districts = new Map();
  for (const line of lines) {
    const parts = line.split('|').map(s => s.trim());
    if (parts.length < 3 || parts[0] === 'PARTIDO' || !parts[0]) continue;
    const [distName, locName, codigo] = parts;
    const key = normalize(distName);
    if (!districts.has(key)) districts.set(key, { name: distName, locales: [] });
    districts.get(key).locales.push({ name: locName, codigo: codigo || null });
  }
  return districts;
}

async function seedTerritorial(filePath) {
  // Regiones
  const regionIds = {};
  for (let i = 1; i <= 25; i++) {
    const [r] = await knex('region').insert({ nombre: `Región ${i}` }).returning('*');
    regionIds[i] = r.id_region;
  }
  console.log(`Regiones insertadas: ${Object.keys(regionIds).length}`);

  // Distritos (partidos reales de la provincia de Buenos Aires)
  const localidades = parseLocalidades(filePath);
  const distRows = [];
  let distNum = 1;
  for (const [num, names] of Object.entries(REGION_MAP)) {
    const regionId = regionIds[parseInt(num, 10)];
    for (const name of names) {
      const [row] = await knex('distrito')
        .insert({ nombre: titleCase(name), codigo: String(distNum), id_region: regionId })
        .returning('*');
      distRows.push({ ...row, normKey: normalize(name), regionNum: parseInt(num, 10) });
      distNum++;
    }
  }
  console.log(`Distritos insertados: ${distRows.length}`);

  // Localidades desde archivo (si existe)
  let totalLocalidades = 0;
  if (localidades) {
    const batch = [];
    for (const d of distRows) {
      const info = localidades.get(d.normKey);
      if (!info) continue;
      for (const l of info.locales) {
        batch.push({
          id_distrito: d.id_distrito,
          id_region: regionIds[d.regionNum],
          nombre: titleCase(l.name),
          codigo: l.codigo || null
        });
      }
    }
    if (batch.length) {
      await knex('localidad').insert(batch);
      totalLocalidades = batch.length;
    }
  }
  console.log(`Localidades insertadas: ${totalLocalidades}`);
  console.log('');
}

// ---------------------------------------------------------------------------
// 3. DATOS DE COMPETENCIA
// ---------------------------------------------------------------------------

async function seedCompetencia() {
  // Roles
  const roleNames = ['SuperAdmin', 'Administrador', 'Profesor', 'Arbitro', 'Juez'];
  const rolMap = {};
  for (const desc of roleNames) {
    let r = await knex('rol').where('descripcion', desc).first();
    if (!r) [r] = await knex('rol').insert({ descripcion: desc }).returning('*');
    rolMap[desc] = r.id_rol;
  }
  console.log('Roles insertados');

  // Disciplinas deportivas
  const disciplinas = [
    { nombre: 'football', jugadores_por_equipo: 11, descripcion: 'Fútbol 11', tipo_competencia: 'MARCADOR' },
    { nombre: 'basketball', jugadores_por_equipo: 5, descripcion: 'Básquetbol', tipo_competencia: 'MARCADOR' },
    { nombre: 'gimnasia artistica', jugadores_por_equipo: 1, descripcion: 'Gimnasia Artística', tipo_competencia: 'EVALUACION' },
    { nombre: 'voleibol', jugadores_por_equipo: 6, descripcion: 'Voleibol', tipo_competencia: 'MARCADOR' },
    { nombre: 'handball', jugadores_por_equipo: 7, descripcion: 'Balonmano', tipo_competencia: 'MARCADOR' },
    { nombre: 'ringo', jugadores_por_equipo: 1, descripcion: 'Ringo', tipo_competencia: 'MARCADOR' },
    { nombre: 'softbol', jugadores_por_equipo: 9, descripcion: 'Softbol', tipo_competencia: 'MARCADOR' }
  ];
  await knex('disciplina').insert(disciplinas);
  console.log('Disciplinas insertadas');

  // Instancias
  await knex('instancia').insert([
    { descripcion_instancia: 'Zonal' },
    { descripcion_instancia: 'Regional' },
    { descripcion_instancia: 'Provincial' },
    { descripcion_instancia: 'Nacional' }
  ]);
  console.log('Instancias insertadas');

  // Horarios de cancha
  await knex('horarios_cancha').insert([
    { hora_inicio: '08:00:00', hora_fin: '09:30:00' },
    { hora_inicio: '09:30:00', hora_fin: '11:00:00' },
    { hora_inicio: '11:00:00', hora_fin: '12:30:00' },
    { hora_inicio: '13:00:00', hora_fin: '14:30:00' },
    { hora_inicio: '14:30:00', hora_fin: '16:00:00' },
    { hora_inicio: '16:00:00', hora_fin: '17:30:00' },
    { hora_inicio: '17:30:00', hora_fin: '19:00:00' }
  ]);
  console.log('Horarios de cancha insertados');

  // Único SuperAdmin
  const superadminPassword = process.env.SEED_SUPERADMIN_PASSWORD || 'SuperAdmin2026';
  const hash = await bcrypt.hash(superadminPassword, 12);
  await knex('usuario').insert({
    nombre: 'SuperAdmin JEBO',
    email: 'superadmin@jebo2026.com',
    id_rol: rolMap['SuperAdmin'],
    password_hash: hash,
    estado: 'Activo',
    documento: '99999999'
  });
  console.log('SuperAdmin insertado: superadmin@jebo2026.com');
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== SEED UNIFICADO JEBO 2026 ===\n');

  const archivoLocalidades = process.argv[2]
    || path.join(os.homedir(), 'Desktop', 'Districtos y localidades.txt');

  await cleanDatabase();

  if (fs.existsSync(archivoLocalidades)) {
    console.log(`Localidades desde: ${archivoLocalidades}\n`);
  } else {
    console.log(`Archivo de localidades no encontrado (${archivoLocalidades}).`);
    console.log('Se cargan solo regiones y distritos.\n');
  }

  await seedTerritorial(fs.existsSync(archivoLocalidades) ? archivoLocalidades : null);
  await seedCompetencia();

  console.log('\n=== SEED COMPLETADO ===');
  console.log(`Contraseña SuperAdmin: ${process.env.SEED_SUPERADMIN_PASSWORD || 'SuperAdmin2026'}`);
  console.log('Cambiala en el primer inicio de sesión.\n');

  process.exit(0);
}

main().catch(err => {
  console.error('Error en seed:', err);
  process.exit(1);
});
