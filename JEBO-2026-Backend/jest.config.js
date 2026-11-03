module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  setupFiles: ['<rootDir>/tests/setup.js'],
  collectCoverageFrom: ['src/**/*.js'],
  // Solo constants queda fuera: es data literal sin logica que testear.
  // src/config NO se excluye del reporte a proposito: upload.js y env.js tienen
  // logica real y tests, y si el reporte los omite Sonar los cuenta como 0%
  // cubierto. src/app.js es el bootstrap del server, no se ejercita en la suite.
  coveragePathIgnorePatterns: ['src/app.js', 'src/constants/'],
  coverageDirectory: 'coverage',
  verbose: true
};
