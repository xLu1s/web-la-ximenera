import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import type { AstroCookies } from 'astro';
import { env } from './env';

/** Cliente anónimo (solo lectura de contenido publicado, sujeto a RLS). */
export function anonClient(): SupabaseClient {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Cliente con service role. SOLO en el servidor (reservas, cancelaciones, subidas firmadas). */
export function serviceClient(): SupabaseClient {
  if (!env.supabaseServiceRoleKey) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY');
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Cliente con la sesión del usuario (cookies). Las escrituras del panel pasan por RLS. */
export function sessionClient(request: Request, cookies: AstroCookies): SupabaseClient {
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get('Cookie') ?? '').map((c) => ({ name: c.name, value: c.value ?? '' }));
      },
      setAll(list) {
        for (const { name, value, options } of list) {
          cookies.set(name, value, { ...options, path: options?.path ?? '/', sameSite: 'lax', httpOnly: true, secure: new URL(request.url).protocol === 'https:' });
        }
      },
    },
  });
}

export function mediaPublicUrl(path: string): string {
  return `${env.supabaseUrl}/storage/v1/object/public/media/${path.split('/').map(encodeURIComponent).join('/')}`;
}
