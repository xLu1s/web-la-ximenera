/**
 * «Orden» 1, 2, 3…: datos iniciales numerados 1..N, renumeración que conserva el orden
 * y numeración automática (max + 1 dentro de su lista) para lo nuevo.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { anon, pool, resetData } from '../helpers/db';

const q = async <T = Record<string, unknown>>(sql: string, p: unknown[] = []) => (await pool.query(sql, p)).rows as T[];
const seq = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

beforeAll(async () => { await resetData(); });
afterAll(async () => { await resetData(); await pool.end(); });

describe('orden 1..N', () => {
  it('el contenido inicial está numerado 1, 2, 3… en cada lista', async () => {
    const cats = await q<{ sort_order: number }>('select sort_order from public.menu_categories order by sort_order');
    expect(cats.map((r) => r.sort_order)).toEqual(seq(5));
    const items = await q<{ category_id: number; orders: number[] }>(
      'select category_id, array_agg(sort_order order by sort_order) as orders from public.menu_items group by 1');
    for (const r of items) expect(r.orders).toEqual(seq(r.orders.length));
    const gal = await q<{ sort_order: number }>('select sort_order from public.gallery_items order by sort_order');
    expect(gal.map((r) => r.sort_order)).toEqual(seq(12));
    expect(await q(`select sort_order from public.special_menus where kind = 'del_dia'`)).toEqual([{ sort_order: 1 }]);
  });

  it('renumerar conserva el orden actual (empates por id) y deja 1..N', async () => {
    const [{ id: cat }] = await q<{ id: number }>(`select id from public.menu_categories where slug = 'frios'`);
    // desordenamos con huecos, invertido y con un empate
    await q(`update public.menu_items set sort_order = 1000 - sort_order * 10 where category_id = $1`, [cat]);
    await q(`update public.menu_items set sort_order = 500 where id in (select id from public.menu_items where category_id = $1 order by id limit 2)`, [cat]);
    const before = await q<{ id: number }>('select id from public.menu_items where category_id = $1 order by sort_order, id', [cat]);
    const catsBefore = await q<{ id: number }>('select id from public.menu_categories order by sort_order, id');
    await q('select public.renumber_sort_orders()');
    const after = await q<{ id: number; sort_order: number }>('select id, sort_order from public.menu_items where category_id = $1 order by sort_order', [cat]);
    expect(after.map((r) => r.id)).toEqual(before.map((r) => r.id));
    expect(after.map((r) => r.sort_order)).toEqual(seq(before.length));
    expect((await q<{ id: number }>('select id from public.menu_categories order by sort_order')).map((r) => r.id)).toEqual(catsBefore.map((r) => r.id));
  });

  it('lo nuevo sin orden (o con 0) va al final de SU lista; un número explícito se respeta', async () => {
    const [{ id: cat, n }] = await q<{ id: number; n: number }>(
      `select c.id, count(i.id)::int as n from public.menu_categories c join public.menu_items i on i.category_id = c.id where c.slug = 'brasas' group by c.id`);
    const [a] = await q<{ sort_order: number }>(`insert into public.menu_items (category_id, name) values ($1, 'Auto 1') returning sort_order`, [cat]);
    expect(a.sort_order).toBe(n + 1);
    const [b] = await q<{ sort_order: number }>(`insert into public.menu_items (category_id, name, sort_order) values ($1, 'Auto 2', 0) returning sort_order`, [cat]);
    expect(b.sort_order).toBe(n + 2);
    const [c] = await q<{ sort_order: number }>(`insert into public.menu_items (category_id, name, sort_order) values ($1, 'Manual', 3) returning sort_order`, [cat]);
    expect(c.sort_order).toBe(3);
    // poner 0 al editar no lo mueve
    const [d] = await q<{ sort_order: number }>(`update public.menu_items set sort_order = 0 where name = 'Auto 1' returning sort_order`);
    expect(d.sort_order).toBe(n + 1);
    // vinos: por tipo
    const w = await q<{ sort_order: number }>(`insert into public.wines (name, wine_type) values ('T1', 'tinto'), ('T2', 'tinto'), ('B1', 'blanco') returning sort_order`);
    expect(w.map((r) => r.sort_order)).toEqual([1, 2, 1]);
    // menús especiales: por tipo (el del día no cuenta)
    const [s] = await q<{ sort_order: number }>(`insert into public.special_menus (kind, title) values ('especial', 'X') returning sort_order`);
    expect(s.sort_order).toBe(1);
    const [g] = await q<{ sort_order: number }>(`insert into public.gallery_items (media_type, static_path, caption) values ('image', '/galeria/x.webp', 'x') returning sort_order`);
    expect(g.sort_order).toBe(13);
    const [cc] = await q<{ sort_order: number }>(`insert into public.menu_categories (slug, tab, title) values ('nueva', 'Nueva', 'Nueva') returning sort_order`);
    expect(cc.sort_order).toBe(6);
  });

  it('la renumeración no la puede lanzar el público', async () => {
    const { error } = await anon().rpc('renumber_sort_orders');
    expect(error).not.toBeNull();
  });
});
