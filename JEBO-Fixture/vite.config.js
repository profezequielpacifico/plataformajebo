import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const destino = env.VITE_API_PROXY_TARGET;

  return {
    plugins: [react()],
    server: {
      port: 15174,
      proxy: destino
        ? { '/api': { target: destino, changeOrigin: true, rewrite: (ruta) => ruta.replace(/^\/api/, '') } }
        : undefined
    },
    preview: { port: 15174 },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test-setup.js']
    }
  };
});
