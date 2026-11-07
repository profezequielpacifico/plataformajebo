const bcrypt = require('bcrypt');
const crypto = require('crypto');
const knex = require('../src/config/knex');

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
    "SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public' AND sequence_name NOT IN ('knex_migrations_id_seq', 'knex_migrations_lock_index_seq')"
  );
  for (const s of seq.rows) {
    try { await knex.raw(`ALTER SEQUENCE ${s.sequence_name} RESTART WITH 1`); } catch (_) {}
  }
  console.log('Base de datos limpiada.\n');
}

async function seedCompetencia() {
  const roleNames = ['SuperAdmin', 'Administrador', 'Profesor', 'Arbitro', 'Juez'];
  const rolMap = {};
  for (const desc of roleNames) {
    let r = await knex('rol').where('descripcion', desc).first();
    if (!r) [r] = await knex('rol').insert({ descripcion: desc }).returning('*');
    rolMap[desc] = r.id_rol;
  }
  console.log('Roles insertados');

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

  await knex('instancia').insert([
    { descripcion_instancia: 'Zonal' },
    { descripcion_instancia: 'Regional' },
    { descripcion_instancia: 'Provincial' },
    { descripcion_instancia: 'Nacional' }
  ]);
  console.log('Instancias insertadas');

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

async function main() {
  console.log('=== SEED UNIFICADO JEBO 2026 ===\n');

  await cleanDatabase();
  await seedCompetencia();

  console.log('\n=== SEED COMPLETADO ===');
  console.log(`Contraseña SuperAdmin: ${process.env.SEED_SUPERADMIN_PASSWORD || 'SuperAdmin2026'}`);
  console.log('Cambiala en el primer inicio de sesión.\n');
  console.log('Para cargar regiones, distritos y localidades: npm run db:seed-territorial\n');

  process.exit(0);
}

main().catch(err => {
  console.error('Error en seed:', err);
  process.exit(1);
});
