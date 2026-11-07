const fs = require('fs');
const path = require('path');

exports.up = async function up(knex) {
  const sqlPath = path.join(__dirname, 'sql', '001_baseline.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await knex.raw(sql);
};

exports.down = async function down(knex) {
  await knex.raw(`
    DROP SCHEMA IF EXISTS public CASCADE;
    CREATE SCHEMA public;
    GRANT ALL ON SCHEMA public TO public;
  `);
};
