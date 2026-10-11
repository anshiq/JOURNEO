import type { IncomingMessage, ServerResponse } from 'node:http'
import { fileURLToPath } from 'node:url'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { defineConfig } from 'vitest/config'

const src = (path: string) => fileURLToPath(new URL(`./src/${path}`, import.meta.url))
const apiTarget = process.env.VITE_API_PROXY ?? 'http://localhost:8000'

function playerRoutes(): Plugin {
  const rewrite = (req: IncomingMessage, _res: ServerResponse, next: () => void) => {
    if (req.url && /^\/(d\/[^/?#]+|play)(\?|$|#)/.test(req.url)) {
      const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
      req.url = `/play.html${query}`
    }
    next()
  }
  return {
    name: 'journeo-player-routes',
    configureServer: server => {
      server.middlewares.use(rewrite)
    },
    configurePreviewServer: server => {
      server.middlewares.use(rewrite)
    },
  }
}

const proxy = {
  '/api': apiTarget,
  '/c/': { target: apiTarget, rewrite: (path: string) => path.replace(/^\/c\//, '/api/v1/public/page/') },
}

export default defineConfig({
  plugins: [
    playerRoutes(),
    react(),
    babel({ presets: [reactCompilerPreset()], include: [/src\/(editor|experience)\/.*\.[jt]sx?$/] }),
    tailwindcss(),
    vanillaExtractPlugin(),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/@fontsource-variable/*/files/*-latin-wght-normal.woff2',
          dest: 'fonts',
          rename: { stripBase: true },
        },
        {
          src: 'node_modules/@fontsource/{lato,poppins}/files/*-latin-{400,700}-normal.woff2',
          dest: 'fonts',
          rename: { stripBase: true },
        },
      ],
    }),
  ],
  resolve: {
    alias: {
      '@shared': src('shared'),
      '@journey': src('journey'),
      '@experience': src('experience'),
      '@editor': src('editor'),
      '@player': src('player'),
    },
  },
  server: { port: 5173, proxy, fs: { allow: ['..'] } },
  preview: { port: 4173, proxy },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: { input: { editor: 'index.html', player: 'play.html' } },
  },
  worker: { format: 'es' },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
  },
})
