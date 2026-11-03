const knexLib = require('knex');
const env = require('./env');

const knex = knexLib({
  client: 'pg',
  connection: {
    host: env.db.host,
    port: env.db.port,
    database: env.db.name,
    user: env.db.user,
    password: env.db.password
  },
  pool: { min: 2, max: 20 },
  acquireConnectionTimeout: 2000
});

knex.paginate = async function (query, filters = {}) {
  const page = Math.max(parseInt(filters.page, 10) || 1, 1);
  const limit = Math.min(parseInt(filters.limit, 10) || 10, 100);
  const offset = (page - 1) * limit;

  const [{ count }] = await query.clone().clearSelect().clear('order').clear('group').count('* as count');
  const data = await query.offset(offset).limit(limit);

  return { data, total: parseInt(count, 10), page, limit };
};

module.exports = knex;
