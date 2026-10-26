export const prerender = false;
import type { APIRoute } from 'astro';
import { qrPng } from '../lib/qr';

export const GET: APIRoute = async () => {
  const png = await qrPng();
  return new Response(new Uint8Array(png), {
    headers: {
      'content-type': 'image/png',
      'content-disposition': 'inline; filename="la-ximenera-qr.png"',
      'cache-control': 'public, max-age=86400',
    },
  });
};
