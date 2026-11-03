const knexLib = require('knex');
const path = require('path');
const fs = require('fs');

// Leer .env manualmente
const envPath = path.join(__dirname, 'src/config/.env');
const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const vars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) vars[match[1].trim()] = match[2].trim();
});

const knex = knexLib({
  client: 'pg',
  connection: {
    host: 'localhost',
    port: 5432,
    database: 'jebo_test_migrations',
    user: vars.DB_USER || 'jebo',
    password: vars.DB_PASSWORD || 'jebo_secret_change_me'
  }
});

knex.migrate.latest({
  directory: path.join(__dirname, 'migrations')
}).then(async () => {
  const results = await knex.migrate.list();
  console.log('Migraciones aplicadas:');
  results[0].forEach(f => console.log('  -', f.name));
  console.log('Total:', results[0].length);
  await knex.destroy();
}).catch(async (err) => {
  console.error('Error en migración:', err.message);
  await knex.destroy();
  process.exit(1);
});
