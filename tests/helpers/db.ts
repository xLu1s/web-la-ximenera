import pg from 'pg';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { T } from './env';

export const pool = new pg.Pool({ connectionString: T.dbUrl, max: 40 });

export const svc = () => createClient(T.supabaseUrl, T.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
export const anon = () => createClient(T.supabaseUrl, T.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

export async function signedIn(email: string, password: string) {
  const c = createClient(T.supabaseUrl, T.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return c;
}

/** Deja la base de datos local como recién sembrada (contenido + reservas). SOLO entorno local de pruebas. */
export async function resetData() {
  if (!/127\.0\.0\.1|localhost/.test(T.dbUrl)) throw new Error('resetData solo puede usarse contra la base de datos LOCAL');
  const seed = readFileSync(new URL('../../supabase/migrations/20261023000400_seed_content.sql', import.meta.url), 'utf8');
  const c = await pool.connect();
  try {
    await c.query('begin');
    await c.query(`truncate public.bookings, public.service_exceptions, public.rate_limits, public.menu_items, public.menu_categories,
      public.wines, public.denominaciones, public.special_menus, public.gallery_items, public.opening_hours restart identity cascade`);
    await c.query(`update public.settings set default_capacity = 80, max_party_size = 12, slot_minutes = 15, last_booking_before_close_minutes = 60 where id = 1`);
    await c.query(seed);
    const carta = readFileSync(new URL('../../supabase/seeds/carta_2026.sql', import.meta.url), 'utf8');
    await c.query(carta);
    await c.query('commit');
  } catch (e) {
    await c.query('rollback');
    throw e;
  } finally {
    c.release();
  }
  // Archivos subidos en pruebas anteriores.
  const s = svc().storage.from('media');
  for (const folder of ['galeria', 'menus']) {
    const { data } = await s.list(folder, { limit: 1000 });
    if (data?.length) await s.remove(data.map((o) => `${folder}/${o.name}`));
  }
}

/** Crea (o recrea) los usuarios de prueba: un admin y un usuario normal sin permisos. */
export async function ensureUsers() {
  const admin = svc().auth.admin;
  const { data } = await admin.listUsers({ perPage: 1000 });
  for (const u of [T.admin, T.user]) {
    const existing = data.users.find((x) => x.email === u.email);
    if (existing) await admin.updateUserById(existing.id, { password: u.password, email_confirm: true });
    else {
      const { error } = await admin.createUser({ email: u.email, password: u.password, email_confirm: true });
      if (error) throw error;
    }
  }
  await pool.query(`insert into public.admins (email) values ($1) on conflict do nothing`, [T.admin.email]);
  await pool.query(`delete from public.admins where email = $1`, [T.user.email]);
}

/**
 * Fecha futura de prueba con el día de la semana ISO pedido (1 = lunes … 7 = domingo).
 * Cada prueba usa un "slot" distinto para no compartir aforo. Rango: a partir de 2032.
 */
export function futureDate(slot: number, isoWeekday: number): string {
  const base = Date.UTC(2032, 0, 5); // lunes 5 de enero de 2032
  const d = new Date(base + (slot * 7 + (isoWeekday - 1)) * 86400000);
  return d.toISOString().slice(0, 10);
}

export const TUE = 2, SAT = 6, SUN = 7, MON = 1;

export interface BookArgs { day: string; time: string; party?: number; name?: string; phone?: string; email?: string; notes?: string | null; consent?: boolean; now?: string }

/** Llama a public.create_booking directamente (como service_role, igual que la API). */
export async function book(a: BookArgs, client: pg.Pool | pg.PoolClient = pool) {
  const { rows } = await client.query(
    `select public.create_booking($1::date, $2::time, $3::int, $4, $5, $6, $7, $8, 'test', coalesce($9::timestamptz, now())) as r`,
    [a.day, a.time, a.party ?? 2, a.name ?? 'Ana Pérez', a.phone ?? '600123123', a.email ?? 'ana@example.com', a.notes ?? null, a.consent ?? true, a.now ?? null],
  );
  return rows[0].r as { ok: boolean; error?: string; reference?: string; id?: string; service?: string; remaining?: number; starts_at?: string; max?: number };
}

export async function booked(day: string, service: string): Promise<number> {
  const { rows } = await pool.query(`select coalesce(sum(party_size),0)::int n from public.bookings where day = $1 and service = $2 and status = 'confirmada'`, [day, service]);
  return rows[0].n;
}
