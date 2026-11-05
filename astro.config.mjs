// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import node from '@astrojs/node';

// Producción: Vercel (funciones serverless para /api y /admin; el resto se prerenderiza).
// Tests/local de producción: ASTRO_ADAPTER=node genera un servidor Node standalone equivalente.
const useNode = process.env.ASTRO_ADAPTER === 'node';

export default defineConfig({
  // Base '/' (dominio propio en Vercel). Se elimina el base '/web-la-ximenera' de GitHub Pages.
  site: process.env.PUBLIC_SITE_URL || 'http://localhost:4321',
  output: 'static',
  adapter: useNode ? node({ mode: 'standalone' }) : vercel(),
  security: { checkOrigin: true },
  server: { port: 4321 },
});
