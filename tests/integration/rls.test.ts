/**
 * Seguridad (RLS y permisos) con las claves reales del Supabase LOCAL: anon, usuario sin permisos y admin.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { anon, ensureUsers, futureDate, pool, resetData, signedIn, svc, TUE } from '../helpers/db';
import { T } from '../helpers/env';

let a: SupabaseClient, user: SupabaseClient, admin: SupabaseClient;
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

beforeAll(async () => {
  await resetData();
  await ensureUsers();
  a = anon();
  user = await signedIn(T.user.email, T.user.password);
  admin = await signedIn(T.admin.email, T.admin.password);
});
afterAll(async () => { await pool.end(); });

describe('público (clave anon)', () => {
  it('lee la carta publicada (47 platos, sin los ocultos)', async () => {
    const { data, error } = await a.from('menu_items').select('id');
    expect(error).toBeNull();
    expect(data).toHaveLength(47);
    await pool.query(`update public.menu_items set visible = false where name = 'Ostras'`);
    const { data: d2 } = await a.from('menu_items').select('name').eq('name', 'Ostras');
    expect(d2).toHaveLength(0);
    await pool.query(`update public.menu_items set visible = true where name = 'Ostras'`);
  });
  it('no ve platos de una sección oculta', async () => {
    await pool.query(`update public.menu_categories set visible = false where slug = 'postres'`);
    const { data } = await a.from('menu_items').select('name').eq('name', 'La Dama blanca');
    expect(data).toHaveLength(0);
    await pool.query(`update public.menu_categories set visible = true where slug = 'postres'`);
  });
  it('NO puede escribir en ninguna tabla de contenido', async () => {
    const { rows: frios } = await pool.query<{ id: number }>(`select id from public.menu_categories where slug = 'frios'`);
    expect(frios).toHaveLength(1);
    expect((await a.from('menu_items').insert({ category_id: frios[0].id, name: 'Hack' })).error).not.toBeNull();
    expect((await a.from('wines').insert({ name: 'Hack', wine_type: 'tinto' })).error).not.toBeNull();
    expect((await a.from('special_menus').insert({ title: 'Hack' })).error).not.toBeNull();
    expect((await a.from('gallery_items').insert({ media_type: 'image', static_path: '/x.jpg' })).error).not.toBeNull();
    expect((await a.from('settings').update({ default_capacity: 999 }).eq('id', 1)).error).not.toBeNull();
    expect((await a.from('opening_hours').delete().gte('weekday', 1)).error).not.toBeNull();
    expect((await a.from('admins').insert({ email: 'hacker@example.com' })).error).not.toBeNull();
    const { rows } = await pool.query(`select count(*)::int n from public.menu_items where name = 'Hack'`);
    expect(rows[0].n).toBe(0);
    const s = await pool.query('select default_capacity from public.settings');
    expect(s.rows[0].default_capacity).toBe(80);
  });
  it('NO puede leer ni crear reservas directamente, ni llamar a las funciones internas', async () => {
    expect((await a.from('bookings').select('*')).error).not.toBeNull();
    expect((await a.from('bookings').insert({ reference: 'X', day: '2032-01-06', service: 'comida', booking_time: '13:30', starts_at: new Date().toISOString(), party_size: 2, name: 'Ana', phone: '600123123', email: 'a@b.es', consent_at: new Date().toISOString(), privacy_version: 'x' })).error).not.toBeNull();
    const rpc = await a.rpc('create_booking', { p_day: futureDate(30, TUE), p_time: '13:30', p_party_size: 2, p_name: 'Ana', p_phone: '600123123', p_email: 'a@b.es', p_notes: null, p_consent: true });
    expect(rpc.error).not.toBeNull();
    expect((await a.rpc('service_status', { p_day: futureDate(30, TUE) })).error).not.toBeNull();
    expect((await a.rpc('hit_rate_limit', { p_key: 'x', p_max: 1, p_window_seconds: 60 })).error).not.toBeNull();
    expect((await a.rpc('cancel_booking', { p_id: '00000000-0000-4000-8000-000000000000' })).error).not.toBeNull();
    expect((await a.from('service_exceptions').select('*')).error).not.toBeNull();
    expect((await a.from('rate_limits').select('*')).error).not.toBeNull();
    const { rows } = await pool.query(`select count(*)::int n from public.bookings where day = $1`, [futureDate(30, TUE)]);
    expect(rows[0].n).toBe(0);
  });
  it('los menús especiales solo se ven dentro de su rango de fechas (hora de Madrid)', async () => {
    await pool.query(`insert into public.special_menus (title, starts_on, ends_on) values
      ('Activo', public.today_madrid() - 1, public.today_madrid() + 1),
      ('Caducado', public.today_madrid() - 10, public.today_madrid() - 1),
      ('Futuro', public.today_madrid() + 1, public.today_madrid() + 5),
      ('Hoy solo', public.today_madrid(), public.today_madrid()),
      ('Oculto', null, null)`);
    await pool.query(`update public.special_menus set visible = false where title = 'Oculto'`);
    const { data } = await a.from('special_menus').select('title').eq('kind', 'especial').order('title');
    expect(data!.map((x) => x.title)).toEqual(['Activo', 'Hoy solo']);
  });
  it('vinos y galería: solo visibles', async () => {
    await pool.query(`insert into public.wines (name, wine_type, visible) values ('Visible', 'tinto', true), ('Oculto', 'blanco', false)`);
    const { data } = await a.from('wines').select('name');
    const names = data!.map((x) => x.name);
    expect(names).toContain('Visible');
    expect(names).not.toContain('Oculto');
    const hidden = await pool.query<{ id: number }>(
      `update public.gallery_items set visible = false where static_path = '/galeria/ig-01.webp' returning id`,
    );
    expect(hidden.rowCount).toBe(1);
    const { data: g } = await a.from('gallery_items').select('id');
    expect(g).toHaveLength(11);
    expect(g!.some((row) => row.id === hidden.rows[0].id)).toBe(false);
    await pool.query(`update public.gallery_items set visible = true where static_path = '/galeria/ig-01.webp'`);
  });
  it('NO puede subir archivos a Storage', async () => {
    const { error } = await a.storage.from('media').upload(`galeria/anon-${Date.now()}.png`, png, { contentType: 'image/png' });
    expect(error).not.toBeNull();
  });
});

describe('usuario autenticado que NO es admin', () => {
  it('no puede editar contenido ni ver reservas', async () => {
    expect((await user.from('wines').insert({ name: 'Hack', wine_type: 'tinto' })).error).not.toBeNull();
    const { rows: dish } = await pool.query<{ id: number; price: string }>(
      `select id, price from public.menu_items where carta_key = 'f-ostras'`,
    );
    expect(dish).toHaveLength(1);
    const upd = await user.from('menu_items').update({ price: '0 €' }).eq('id', dish[0].id).select();
    expect(upd.data ?? []).toHaveLength(0);
    const { rows } = await pool.query<{ price: string }>(
      `select price from public.menu_items where carta_key = 'f-ostras'`,
    );
    expect(rows[0].price).toBe(dish[0].price);
    expect(rows[0].price).not.toBe('0 €');
    const b = await user.from('bookings').select('*');
    expect(b.data ?? []).toHaveLength(0);
    expect((await user.rpc('admin_day_status', { p_day: futureDate(0, TUE) })).error?.message).toMatch(/forbidden/);
    expect((await user.rpc('admin_cancel_booking', { p_id: '00000000-0000-4000-8000-000000000000' })).error?.message).toMatch(/forbidden/);
    expect((await user.rpc('admin_set_opening_hours', { p_rows: [] })).error?.message).toMatch(/forbidden/);
    expect((await user.rpc('is_admin')).data).toBe(false);
    expect((await user.storage.from('media').upload(`galeria/user-${Date.now()}.png`, png, { contentType: 'image/png' })).error).not.toBeNull();
  });
  it('no puede hacerse admin a sí mismo', async () => {
    expect((await user.from('admins').insert({ email: T.user.email })).error).not.toBeNull();
    expect((await user.rpc('is_admin')).data).toBe(false);
  });
});

describe('admin', () => {
  it('is_admin() verdadero', async () => {
    expect((await admin.rpc('is_admin')).data).toBe(true);
  });
  it('CRUD de vinos, carta y menús especiales', async () => {
    const w = await admin.from('wines').insert({ name: 'Admin Tinto', wine_type: 'tinto', price_bottle: 18.5 }).select().single();
    expect(w.error).toBeNull();
    expect((await admin.from('wines').update({ price_glass: 3.5 }).eq('id', w.data!.id).select().single()).data?.price_glass).toBe(3.5);
    expect((await admin.from('wines').delete().eq('id', w.data!.id)).error).toBeNull();
    const { rows: frios } = await pool.query<{ id: number }>(`select id from public.menu_categories where slug = 'frios'`);
    expect(frios).toHaveLength(1);
    const it = await admin.from('menu_items').insert({ category_id: frios[0].id, name: 'Plato admin', price: '10 €', allergens: ['gluten'] }).select().single();
    expect(it.error).toBeNull();
    expect((await admin.from('menu_items').insert({ category_id: frios[0].id, name: 'Mal', allergens: ['veneno'] })).error).not.toBeNull();
    expect((await admin.from('menu_items').delete().eq('id', it.data!.id)).error).toBeNull();
    const m = await admin.from('special_menus').insert({ title: 'Navidad', starts_on: '2032-12-20', ends_on: '2032-12-01' });
    expect(m.error).not.toBeNull(); // fin anterior al inicio
  });
  it('ve reservas, estado del día y puede cancelar', async () => {
    const day = futureDate(31, TUE);
    const r = await svc().rpc('create_booking', { p_day: day, p_time: '13:30', p_party_size: 3, p_name: 'Ana', p_phone: '600123123', p_email: 'a@b.es', p_notes: null, p_consent: true });
    expect(r.data.ok).toBe(true);
    const st = await admin.rpc('admin_day_status', { p_day: day });
    expect(st.data.find((s: { service: string }) => s.service === 'comida')).toMatchObject({ booked: 3, capacity: 80 });
    expect((await admin.from('bookings').select('*').eq('day', day)).data).toHaveLength(1);
    const c = await admin.rpc('admin_cancel_booking', { p_id: r.data.id });
    expect(c.data).toMatchObject({ ok: true });
    expect((await admin.rpc('admin_day_status', { p_day: day })).data[0].booked).toBe(0);
  });
  it('sube y borra archivos en Storage; el bucket rechaza tipos no permitidos', async () => {
    const path = `galeria/admin-${Date.now()}.png`;
    expect((await admin.storage.from('media').upload(path, png, { contentType: 'image/png' })).error).toBeNull();
    const rm = await admin.storage.from('media').remove([path]);
    expect(rm.error).toBeNull();
    expect(rm.data).toHaveLength(1); // realmente borrado
    const bad = await admin.storage.from('media').upload(`galeria/x-${Date.now()}.txt`, Buffer.from('hola'), { contentType: 'text/plain' });
    expect(bad.error).not.toBeNull();
  });
});
