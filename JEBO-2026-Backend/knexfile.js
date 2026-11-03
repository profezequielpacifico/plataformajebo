require('dotenv').config();

const connection = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'jebo_2026',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
};

module.exports = {
  development: {
    client: 'pg',
    connection,
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations'
    }
  },
  production: {
    client: 'pg',
    connection,
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations'
    },
    pool: { min: 2, max: 20 }
  }
};
