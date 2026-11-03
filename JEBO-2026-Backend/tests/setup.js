process.env.NODE_ENV = 'test';
// Secreto SOLO de test. src/config/env.js exige >=32 bytes y rechaza defaults
// conocidos, asi que un valor corto de test haria fallar el require de env.js.
// Este valor nunca debe usarse fuera de la suite: vive en el repositorio.
process.env.JWT_SECRET = 'test-only-secret-no-usar-fuera-de-la-suite-2026';
process.env.DB_NAME = 'jebo_2026_test';
process.env.DB_HOST = process.env.DB_HOST || '127.0.0.1';
process.env.DB_PORT = process.env.DB_PORT || '15432';
process.env.DB_USER = process.env.DB_USER || 'jebo';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'jebo_secret_change_me';
