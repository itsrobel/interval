import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { defineConfig, type Plugin } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'

// Custom plugin to add COOP/COEP headers for WebContainer cross-origin isolation
const coopCoepHeadersPlugin = (): Plugin => ({
  name: 'coop-coep-headers',
  configureServer(server) {
    server.middlewares.use((_, res, next) => {
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
      next()
    })
  },
})

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    coopCoepHeadersPlugin(),
    tailwindcss(),
    tsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tanstackStart(),
    viteReact(),
  ],
})
