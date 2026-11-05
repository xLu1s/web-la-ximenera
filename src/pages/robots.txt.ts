import type { APIRoute } from 'astro';

export const prerender = false;

const FALLBACK = 'https://la-ximenera.vercel.app';

/** Rutas públicas que el buscador puede listar. El panel y la API no. */
export const GET: APIRoute = ({ site }) => {
  const origin = (site ?? new URL(FALLBACK)).origin;
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /api/',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
