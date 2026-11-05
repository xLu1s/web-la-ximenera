import type { APIRoute } from 'astro';

export const prerender = false;

const FALLBACK = 'https://la-ximenera.vercel.app';

/** Páginas HTML públicas. /carta redirige a /#carta; /admin y la cancelación con token no se listan. */
const PATHS = ['/', '/aviso-legal', '/privacidad', '/cookies'] as const;

const esc = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const GET: APIRoute = ({ site }) => {
  const origin = (site ?? new URL(FALLBACK)).origin;
  const urls = PATHS.map((path) => {
    const es = `${origin}${path}`;
    const en = `${origin}${path}?lang=en`;
    return [
      '  <url>',
      `    <loc>${esc(es)}</loc>`,
      `    <xhtml:link rel="alternate" hreflang="es" href="${esc(es)}" />`,
      `    <xhtml:link rel="alternate" hreflang="en" href="${esc(en)}" />`,
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${esc(es)}" />`,
      '  </url>',
    ].join('\n');
  }).join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;
  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
