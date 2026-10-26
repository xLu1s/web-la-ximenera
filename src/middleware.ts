import { defineMiddleware } from 'astro:middleware';
import { sessionClient } from './lib/supabase';
import { hasSupabase } from './lib/env';
import { adminLang, ta, type AdminLang } from './i18n/admin';
import { publicLang } from './i18n/public';

/** Rutas del panel accesibles sin sesión. */
const PUBLIC_ADMIN = new Set(['/admin/login', '/admin/recuperar', '/admin/nueva-clave']);

const YEAR = 60 * 60 * 24 * 365;
const cookieOpts = {
  path: '/',
  maxAge: YEAR,
  sameSite: 'lax' as const,
  httpOnly: false,
  secure: import.meta.env.PROD,
};

function page403(lang: AdminLang) {
  const htmlLang = lang === 'zh' ? 'zh-Hans' : lang;
  return `<!doctype html><html lang="${htmlLang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${ta(lang, 'forbidden.title')} · La Ximenera</title></head>
<body style="font-family:system-ui,sans-serif;background:#F7F1E6;color:#2B1D14;display:grid;place-items:center;min-height:100vh;margin:0;padding:1rem">
<main style="max-width:460px;text-align:center"><h1>${ta(lang, 'forbidden.h1')}</h1><p>${ta(lang, 'forbidden.p')}</p>
<form method="post" action="/admin/salir"><button style="padding:.8rem 1.4rem;font-size:1rem;cursor:pointer">${ta(lang, 'nav.logout')}</button></form></main></body></html>`;
}

export const onRequest = defineMiddleware(async (ctx, next) => {
  const qLang = ctx.url.searchParams.get('lang');
  if (qLang === 'es' || qLang === 'en') ctx.cookies.set('lx_lang', qLang, cookieOpts);
  const storedLang = ctx.cookies.get('lx_lang')?.value;
  ctx.locals.lang = publicLang(qLang === 'es' || qLang === 'en' ? qLang : storedLang);

  const path = ctx.url.pathname.replace(/\/$/, '') || '/';
  const isAdminPage = path === '/admin' || path.startsWith('/admin/');
  const isAdminApi = path.startsWith('/api/admin/');

  const qAdmin = ctx.url.searchParams.get('admin_lang');
  if (qAdmin === 'es' || qAdmin === 'en' || qAdmin === 'zh') {
    ctx.cookies.set('lx_admin_lang', qAdmin, cookieOpts);
    if (isAdminPage && ctx.request.method === 'GET') {
      const nextUrl = new URL(ctx.url);
      nextUrl.searchParams.delete('admin_lang');
      return ctx.redirect(nextUrl.pathname + nextUrl.search, 303);
    }
  }
  const storedAdmin = qAdmin === 'es' || qAdmin === 'en' || qAdmin === 'zh' ? qAdmin : ctx.cookies.get('lx_admin_lang')?.value;
  ctx.locals.adminLang = adminLang(storedAdmin);

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
    return new Response(page403(ctx.locals.adminLang), { status: 403, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
  }
  ctx.locals.isAdmin = true;
  return finish();
});
