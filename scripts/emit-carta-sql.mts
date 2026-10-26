/**
 * Genera el SQL idempotente de la carta física (oct 2026) a partir de src/data/cartaFisica.ts.
 * Escribe:
 *   supabase/seeds/carta_2026.sql          (solo datos; lo reaplica tests/helpers/db.ts)
 *   supabase/migrations/20261026120000_carta_vinos.sql  (esquema + datos)
 *
 * No toca reservas, usuarios, galería, horarios ni menús especiales.
 */
import { writeFileSync } from 'node:fs';
import { denominaciones, menu, vinos } from '../src/data/cartaFisica.ts';

const q = (v: unknown): string => {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(2);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return `'${String(v).replace(/'/g, "''")}'`;
};

const allergens = (a: string[] = []) => (a.length ? `array[${a.map(q).join(', ')}]::text[]` : `'{}'::text[]`);

const lines: string[] = [];
const push = (s = '') => lines.push(s);

push('-- Carta física oct 2026. Idempotente. No borra reservas, usuarios, galería, horarios ni menús especiales.');
push('-- Reaplica precios, alérgenos y vinos con carta_key. Los platos antiguos de frios/calientes/principal/postres');
push('-- sin carta_key se retiran para que la carta pública coincida con la carta impresa.');
push('');

push('insert into public.denominaciones (slug, name, sort_order, visible) values');
push(denominaciones.map((d, i) => `  (${q(d.slug)}, ${q(d.name)}, ${i + 1}, true)`).join(',\n'));
push('on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order, visible = excluded.visible;');
push('');

push(`update public.menu_categories set slug = 'principal'
  where slug = 'brasas' and not exists (select 1 from public.menu_categories where slug = 'principal');`);
push('');

const cats = [
  ['frios', 'Fríos', 'Fríos', 'Para compartir', 1],
  ['calientes', 'Calientes', 'Calientes', 'Para compartir', 2],
  ['principal', 'Principal', 'Principal', null, 3],
  ['postres', 'Postre', 'Postre', null, 4],
] as const;
for (const [slug, tab, title, subtitle, order] of cats) {
  push(`insert into public.menu_categories (slug, tab, title, subtitle, intro, notes, sort_order, visible)
values (${q(slug)}, ${q(tab)}, ${q(title)}, ${q(subtitle)}, null, '{}'::text[], ${order}, true)
on conflict (slug) do update set tab = excluded.tab, title = excluded.title, subtitle = excluded.subtitle,
  intro = excluded.intro, notes = excluded.notes, sort_order = excluded.sort_order, visible = excluded.visible;`);
}
push('');

const keys = menu.flatMap((s) => s.items.map((i) => i.key));
push(`delete from public.menu_items mi
using public.menu_categories c
where mi.category_id = c.id
  and c.slug in ('frios', 'calientes', 'brasas', 'principal', 'postres', 'sugerencias')
  and (mi.carta_key is null or mi.carta_key not in (${keys.map(q).join(', ')}));`);
push('');

for (const section of menu) {
  section.items.forEach((it, idx) => {
    push(`insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, ${q(it.name)}, null, ${q(it.price ?? null)}, ${q(it.half ?? null)}, ${allergens(it.allergens)}, ${idx + 1}, true, ${it.recommended ? 'true' : 'false'}, ${q(it.recommendationNote ?? null)}, ${q(it.key)}
from public.menu_categories c where c.slug = ${q(section.id)}
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;`);
  });
}
push('');
push(`delete from public.menu_categories where slug in ('sugerencias', 'brasas');`);
push('');

vinos.forEach((w, idx) => {
  push(`insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values (${q(w.name)}, ${q(w.type)}, ${q(w.origin ?? null)}, ${q(w.description ?? null)}, ${q(w.price)}, null, ${idx + 1}, true, ${q(w.denominacion)}, ${q(w.section)}, ${w.recommended ? 'true' : 'false'}, ${q(w.note ?? null)}, ${q(w.key)})
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;`);
});
push('');

const data = lines.join('\n');
writeFileSync(new URL('../supabase/seeds/carta_2026.sql', import.meta.url), data);

const schema = `-- Carta física (oct 2026): D.O., secciones de vino, recomendados y platos de la carta impresa.
-- Idempotente en la parte de datos. No borra reservas, usuarios, galería, horarios ni menús especiales.

create table public.denominaciones (
  slug text primary key check (slug ~ '^[a-z0-9-]{1,80}$'),
  name text not null unique check (char_length(name) between 1 and 80),
  sort_order integer not null default 0,
  visible boolean not null default true
);
comment on table public.denominaciones is 'Catálogo de denominaciones de origen para filtrar la carta de vinos.';

alter table public.denominaciones enable row level security;
create policy denominaciones_public on public.denominaciones for select to anon, authenticated using (visible);
create policy denominaciones_admin on public.denominaciones for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
grant select on public.denominaciones to anon, authenticated, service_role;
grant insert, update, delete on public.denominaciones to authenticated, service_role;

alter table public.menu_items
  add column recommended boolean not null default false,
  add column recommendation_note text check (recommendation_note is null or char_length(recommendation_note) <= 200),
  add column carta_key text;
create unique index menu_items_carta_key_uidx on public.menu_items (carta_key);

alter table public.wines
  add column denominacion_origen text check (denominacion_origen is null or char_length(denominacion_origen) <= 80),
  add column section text check (section is null or section in ('joven', 'crianza', 'galeria', 'blanco', 'cava', 'especial')),
  add column recommended boolean not null default false,
  add column recommendation_note text check (recommendation_note is null or char_length(recommendation_note) <= 200),
  add column carta_key text;
create unique index wines_carta_key_uidx on public.wines (carta_key);
comment on column public.wines.denominacion_origen is 'Nombre normalizado de la D.O. (catálogo public.denominaciones.name).';
comment on column public.wines.section is 'Sección de la carta física: joven, crianza, galeria, blanco, cava, especial.';

`;

writeFileSync(new URL('../supabase/migrations/20261026120000_carta_vinos.sql', import.meta.url), schema + data);
console.log(`platos ${menu.reduce((n, s) => n + s.items.length, 0)} · vinos ${vinos.length} · D.O. ${denominaciones.length}`);
