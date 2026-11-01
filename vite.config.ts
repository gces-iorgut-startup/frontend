import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')

  // Alvo do proxy do servidor de desenvolvimento (`npm run dev`).
  // Em dev local o app chama caminhos relativos (`/api/...`) e o Vite
  // encaminha para a API. Configurável via VITE_DEV_API_PROXY; o padrão
  // aponta para a porta publicada pelo docker-compose do backend.
  const devApiProxyTarget = env.VITE_DEV_API_PROXY ?? 'http://localhost:3001'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: devApiProxyTarget,
          changeOrigin: true,
          // O backend registra as rotas sem o prefixo `/api`.
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      css: false,
      testTimeout: 15000,
    },
  }
})
