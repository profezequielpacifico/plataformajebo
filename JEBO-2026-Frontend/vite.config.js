import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4000,
    proxy: {
      '/api': {
        // Local API, or Docker-mapped host port
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:15252',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.{js,jsx}'],
    // `src/app.js` solo monta React en el DOM; los tests renderizan los
    // componentes por separado, asi que contarlo inflaria la cobertura.
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/app.js',
        'src/main.jsx',
        'src/config/constants.js',
        'src/components/icons/**',
        '**/*.test.{js,jsx}',
        '**/node_modules/**'
      ]
    }
  }
});
