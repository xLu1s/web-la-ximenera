import { defineMiddleware } from 'astro:middleware';
import { sessionClient } from './lib/supabase';
import { hasSupabase } from './lib/env';

/** Rutas del panel accesibles sin sesión. */
const PUBLIC_ADMIN = new Set(['/admin/login', '/admin/recuperar', '/admin/nueva-clave']);

const page403 = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Sin permiso · La Ximenera</title></head>
<body style="font-family:system-ui,sans-serif;background:#F7F1E6;color:#2B1D14;display:grid;place-items:center;min-height:100vh;margin:0;padding:1rem">
<main style="max-width:460px;text-align:center"><h1>No tienes permiso</h1><p>Tu usuario no está autorizado para usar el panel de La Ximenera.</p>
<form method="post" action="/admin/salir"><button style="padding:.8rem 1.4rem;font-size:1rem;cursor:pointer">Cerrar sesión</button></form></main></body></html>`;

export const onRequest = defineMiddleware(async (ctx, next) => {
  const path = ctx.url.pathname.replace(/\/$/, '') || '/';
  const isAdminPage = path === '/admin' || path.startsWith('/admin/');
  const isAdminApi = path.startsWith('/api/admin/');
  if (!isAdminPage && !isAdminApi) return next();

  if (!hasSupabase()) return new Response('Panel no configurado (faltan variables de Supabase).', { status: 503 });

  const supabase = sessionClient(ctx.request, ctx.cookies);
  ctx.locals.supabase = supabase;
  const { data } = await supabase.auth.getUser();
  ctx.locals.user = data.user ?? null;
  ctx.locals.isAdmin = false;

  const finish = async () => {
    const res = await next();
    res.headers.set('Cache-Control', 'no-store');
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
    res.headers.set('X-Frame-Options', 'DENY');
    return res;
  };

  if (PUBLIC_ADMIN.has(path) || path === '/admin/salir') return finish();

  if (!ctx.locals.user) {
    if (isAdminApi) return new Response(JSON.stringify({ ok: false, message: 'Sesión no iniciada.' }), { status: 401, headers: { 'content-type': 'application/json' } });
    return ctx.redirect(`/admin/login?next=${encodeURIComponent(ctx.url.pathname + ctx.url.search)}`, 303);
  }
  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (isAdmin !== true) {
    if (isAdminApi) return new Response(JSON.stringify({ ok: false, message: 'No tienes permiso.' }), { status: 403, headers: { 'content-type': 'application/json' } });
    return new Response(page403, { status: 403, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
  }
  ctx.locals.isAdmin = true;
  return finish();
});
