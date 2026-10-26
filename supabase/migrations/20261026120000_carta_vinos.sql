-- Carta física (oct 2026): D.O., secciones de vino, recomendados y platos de la carta impresa.
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

-- Carta física oct 2026. Idempotente. No borra reservas, usuarios, galería, horarios ni menús especiales.
-- Reaplica precios, alérgenos y vinos con carta_key. Los platos antiguos de frios/calientes/principal/postres
-- sin carta_key se retiran para que la carta pública coincida con la carta impresa.

insert into public.denominaciones (slug, name, sort_order, visible) values
  ('do-alicante', 'DO Alicante', 1, true),
  ('do-valencia', 'DO Valencia', 2, true),
  ('do-utiel-requena', 'DO Utiel-Requena', 3, true),
  ('do-ribera-del-duero', 'DO Ribera del Duero', 4, true),
  ('doca-rioja', 'DOCa Rioja', 5, true),
  ('do-jumilla', 'DO Jumilla', 6, true),
  ('do-toro', 'DO Toro', 7, true),
  ('do-rueda', 'DO Rueda', 8, true),
  ('do-rias-baixas', 'DO Rías Baixas', 9, true),
  ('do-valdeorras', 'DO Valdeorras', 10, true),
  ('do-bierzo', 'DO Bierzo', 11, true),
  ('do-cava', 'DO Cava', 12, true),
  ('champagne', 'Champagne', 13, true),
  ('do-lanzarote', 'DO Lanzarote', 14, true),
  ('do-ribeira-sacra', 'DO Ribeira Sacra', 15, true),
  ('doc-priorat', 'DOC Priorat', 16, true),
  ('do-montsant', 'DO Montsant', 17, true),
  ('pago-chozas-carrascal', 'Pago Chozas Carrascal', 18, true),
  ('vino-de-espana', 'Vino de España', 19, true),
  ('vt-castilla-y-leon', 'VT Castilla y León', 20, true),
  ('amarone-della-valpolicella', 'Amarone della Valpolicella', 21, true),
  ('vino-de-pago-el-terrerazo', 'Vino de Pago El Terrerazo', 22, true)
on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order, visible = excluded.visible;

update public.menu_categories set slug = 'principal'
  where slug = 'brasas' and not exists (select 1 from public.menu_categories where slug = 'principal');

insert into public.menu_categories (slug, tab, title, subtitle, intro, notes, sort_order, visible)
values ('frios', 'Fríos', 'Fríos', 'Para compartir', null, '{}'::text[], 1, true)
on conflict (slug) do update set tab = excluded.tab, title = excluded.title, subtitle = excluded.subtitle,
  intro = excluded.intro, notes = excluded.notes, sort_order = excluded.sort_order, visible = excluded.visible;
insert into public.menu_categories (slug, tab, title, subtitle, intro, notes, sort_order, visible)
values ('calientes', 'Calientes', 'Calientes', 'Para compartir', null, '{}'::text[], 2, true)
on conflict (slug) do update set tab = excluded.tab, title = excluded.title, subtitle = excluded.subtitle,
  intro = excluded.intro, notes = excluded.notes, sort_order = excluded.sort_order, visible = excluded.visible;
insert into public.menu_categories (slug, tab, title, subtitle, intro, notes, sort_order, visible)
values ('principal', 'Principal', 'Principal', null, null, '{}'::text[], 3, true)
on conflict (slug) do update set tab = excluded.tab, title = excluded.title, subtitle = excluded.subtitle,
  intro = excluded.intro, notes = excluded.notes, sort_order = excluded.sort_order, visible = excluded.visible;
insert into public.menu_categories (slug, tab, title, subtitle, intro, notes, sort_order, visible)
values ('postres', 'Postre', 'Postre', null, null, '{}'::text[], 4, true)
on conflict (slug) do update set tab = excluded.tab, title = excluded.title, subtitle = excluded.subtitle,
  intro = excluded.intro, notes = excluded.notes, sort_order = excluded.sort_order, visible = excluded.visible;

delete from public.menu_items mi
using public.menu_categories c
where mi.category_id = c.id
  and c.slug in ('frios', 'calientes', 'brasas', 'principal', 'postres', 'sugerencias')
  and (mi.carta_key is null or mi.carta_key not in ('f-quesos', 'f-embutidos', 'f-jamon', 'f-escalibada', 'f-raf', 'f-carpaccio', 'f-cabra', 'f-pericana', 'f-anchoas', 'f-ceviche', 'f-ostras', 'f-tartar-atun', 'f-tartar-salmon', 'f-tartar-solomillo', 'f-marisco', 'c-bravas', 'c-tacos', 'c-salteado', 'c-revuelto', 'c-bolets', 'c-ajillo', 'c-almejas', 'c-curry', 'c-vapor', 'c-pulpo', 'c-calamar', 'c-vieira', 'c-fritura', 'c-tataki', 'p-solomillo', 'p-entrecot', 'p-presa', 'p-chuleton-premium', 'p-chuleton-rubia', 'p-salmon', 'p-rodaballo', 'p-bacalao-grat', 'p-bacalao-ahum', 'p-corvina', 'p-salsa', 'd-nieve', 'd-dama', 'd-milhojas', 'd-pina', 'd-brownie', 'd-sorbetes', 'd-frutas'));

insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Degustación de quesos Europeos con frutas frescas y secas', null, '18,80 €', '10,80 €', '{}'::text[], 1, true, false, null, 'f-quesos'
from public.menu_categories c where c.slug = 'frios'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Tablas de Embutidos de Alcoyanos', null, '14,80 €', null, '{}'::text[], 2, true, false, null, 'f-embutidos'
from public.menu_categories c where c.slug = 'frios'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Jamón Ibérico 100% Bellota', null, '22,00 €', null, '{}'::text[], 3, true, false, null, 'f-jamon'
from public.menu_categories c where c.slug = 'frios'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Escalibada brasa con anchoas Norte y Aceite Negro', null, '4,90 €/u', null, array['pescado']::text[], 4, true, false, null, 'f-escalibada'
from public.menu_categories c where c.slug = 'frios'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Tomate Raf con capellán y virutas de mojama', null, '14,50 €', null, array['pescado']::text[], 5, true, false, null, 'f-raf'
from public.menu_categories c where c.slug = 'frios'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Carpaccio de tomate rosa con Burrata al Pedro y rúcula', null, '15,50 €', null, array['pescado', 'lacteos']::text[], 6, true, false, null, 'f-carpaccio'
from public.menu_categories c where c.slug = 'frios'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Ensalada de queso Cabra Caramelizada', null, '13,90 €', null, array['lacteos']::text[], 7, true, false, null, 'f-cabra'
from public.menu_categories c where c.slug = 'frios'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Pericana Alcoyana', null, '15,90 €', '9,80 €', array['pescado']::text[], 8, true, false, null, 'f-pericana'
from public.menu_categories c where c.slug = 'frios'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Anchoas del norte sobre una crema de pesto y tomate confitado', null, '4,50 €', null, array['pescado']::text[], 9, true, false, null, 'f-anchoas'
from public.menu_categories c where c.slug = 'frios'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Ceviche de corvina salvaje y gambas rojas', null, '17,50 €', null, array['pescado', 'crustaceos']::text[], 10, true, false, null, 'f-ceviche'
from public.menu_categories c where c.slug = 'frios'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Ostras', null, '4,80 €/u', null, array['moluscos']::text[], 11, true, false, null, 'f-ostras'
from public.menu_categories c where c.slug = 'frios'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Tartar de Atún Rojo sobre Wakame', null, '18,00 €', null, array['pescado']::text[], 12, true, false, null, 'f-tartar-atun'
from public.menu_categories c where c.slug = 'frios'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Tartar de Salmón con Aguacate', null, '16,00 €', null, array['pescado']::text[], 13, true, false, null, 'f-tartar-salmon'
from public.menu_categories c where c.slug = 'frios'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Tartar de Solomillo de Vaca acompañado Brioche', null, '22,00 €', null, '{}'::text[], 14, true, false, null, 'f-tartar-solomillo'
from public.menu_categories c where c.slug = 'frios'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Marisco del día', null, 'S/M', null, array['moluscos']::text[], 15, true, false, null, 'f-marisco'
from public.menu_categories c where c.slug = 'frios'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Nuestras Patatas Bravas', null, '9,50 €', null, '{}'::text[], 1, true, false, null, 'c-bravas'
from public.menu_categories c where c.slug = 'calientes'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Tacos de Buey marinados y a la brasa', null, '17,50 €', null, '{}'::text[], 2, true, false, null, 'c-tacos'
from public.menu_categories c where c.slug = 'calientes'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Salteado de Gambas y longaniza Alcoyana con verduras de temporada', null, '17,50 €', null, array['moluscos', 'crustaceos']::text[], 3, true, false, null, 'c-salteado'
from public.menu_categories c where c.slug = 'calientes'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Revuelto de Pericana Alcoyana', null, '13,90 €', null, array['pescado']::text[], 4, true, false, null, 'c-revuelto'
from public.menu_categories c where c.slug = 'calientes'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Bolets de Xop con huevo frito', null, '16,50 €', null, '{}'::text[], 5, true, false, null, 'c-bolets'
from public.menu_categories c where c.slug = 'calientes'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Gambas al Ajillo', null, '17,50 €', null, array['moluscos', 'crustaceos']::text[], 6, true, false, null, 'c-ajillo'
from public.menu_categories c where c.slug = 'calientes'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Almejas al vino Blanco', null, '16,50 €', null, array['moluscos']::text[], 7, true, false, null, 'c-almejas'
from public.menu_categories c where c.slug = 'calientes'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Mejillones al Curry Thai', null, '13,50 €', '8,50 €', array['moluscos']::text[], 8, true, false, null, 'c-curry'
from public.menu_categories c where c.slug = 'calientes'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Mejillones al Vapor', null, '11,00 €', '7,50 €', array['moluscos']::text[], 9, true, false, null, 'c-vapor'
from public.menu_categories c where c.slug = 'calientes'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Pulpo a la brasa sobre puré de patata y tomate', null, '19,50 €', null, array['moluscos']::text[], 10, true, false, null, 'c-pulpo'
from public.menu_categories c where c.slug = 'calientes'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Calamar a la brasa o a la andaluza', null, '16,50 €', null, array['moluscos']::text[], 11, true, false, null, 'c-calamar'
from public.menu_categories c where c.slug = 'calientes'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Vieira a la brasa con crema de puerros', null, '6,50 €/u', null, array['moluscos']::text[], 12, true, false, null, 'c-vieira'
from public.menu_categories c where c.slug = 'calientes'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Fritura de pescadito de la playa', null, '16,50 €', null, array['pescado']::text[], 13, true, false, null, 'c-fritura'
from public.menu_categories c where c.slug = 'calientes'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Tataki de Atún rojo a la brasa con salsa Tsuyu Moto', null, '24,50 €', null, array['pescado']::text[], 14, true, false, null, 'c-tataki'
from public.menu_categories c where c.slug = 'calientes'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Solomillo de Vaca a la brasa', null, '24,50 €', null, '{}'::text[], 1, true, false, null, 'p-solomillo'
from public.menu_categories c where c.slug = 'principal'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Entrecot de Ternera trinchado con Verduras', null, '22,00 €', null, '{}'::text[], 2, true, false, null, 'p-entrecot'
from public.menu_categories c where c.slug = 'principal'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Presa Ibérica a la brasa', null, '19,50 €', null, '{}'::text[], 3, true, false, null, 'p-presa'
from public.menu_categories c where c.slug = 'principal'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Chuletón de Vaca Premium trinchado con Guarnición', null, '6,25 €/100g', null, '{}'::text[], 4, true, false, null, 'p-chuleton-premium'
from public.menu_categories c where c.slug = 'principal'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Chuletón de vaca Rubia Gallega', null, '9,50 €/100g', null, '{}'::text[], 5, true, false, null, 'p-chuleton-rubia'
from public.menu_categories c where c.slug = 'principal'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Salmón relleno de gambas a la brasa con aceite de cítricos', null, '17,50 €', null, array['pescado', 'crustaceos']::text[], 6, true, false, null, 'p-salmon'
from public.menu_categories c where c.slug = 'principal'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Rodaballo a la donostiarra estilo tradicional', null, '19,80 €', null, array['pescado']::text[], 7, true, false, null, 'p-rodaballo'
from public.menu_categories c where c.slug = 'principal'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Bacalao gratinado al perfume de ajo y tomate seco', null, '17,50 €', null, array['pescado']::text[], 8, true, false, null, 'p-bacalao-grat'
from public.menu_categories c where c.slug = 'principal'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Bacalao Ahumado con tomillo, romero y verduras brasa', null, '18,50 €', null, array['pescado']::text[], 9, true, false, null, 'p-bacalao-ahum'
from public.menu_categories c where c.slug = 'principal'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Corvina Salvaje a la brasa', null, '18,50 €', null, array['pescado']::text[], 10, true, false, null, 'p-corvina'
from public.menu_categories c where c.slug = 'principal'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Salsa para Acompañar', null, '2,50 €', null, '{}'::text[], 11, true, false, null, 'p-salsa'
from public.menu_categories c where c.slug = 'principal'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'La bola de nieve con frutos rojos', null, '6,50 €', null, array['lacteos']::text[], 1, true, false, null, 'd-nieve'
from public.menu_categories c where c.slug = 'postres'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'La Dama blanca', null, '6,00 €', null, array['lacteos']::text[], 2, true, false, null, 'd-dama'
from public.menu_categories c where c.slug = 'postres'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Milhojas de crema de manzana al horno y chocolate', null, '6,80 €', null, array['lacteos']::text[], 3, true, false, null, 'd-milhojas'
from public.menu_categories c where c.slug = 'postres'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Piña a la brasa con helado de coco y flambéado con Ron', null, '7,50 €', null, array['lacteos']::text[], 4, true, false, null, 'd-pina'
from public.menu_categories c where c.slug = 'postres'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Brownie de chocolate con nueces y helado de Nata', null, '7,50 €', null, array['lacteos']::text[], 5, true, false, null, 'd-brownie'
from public.menu_categories c where c.slug = 'postres'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Sinfonía de sorbetes', null, '6,00 €', null, array['lacteos']::text[], 6, true, false, null, 'd-sorbetes'
from public.menu_categories c where c.slug = 'postres'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;
insert into public.menu_items (category_id, name, description, price, half_price, allergens, sort_order, visible, recommended, recommendation_note, carta_key)
select c.id, 'Frutas de temporada', null, 'S/M', null, '{}'::text[], 7, true, false, null, 'd-frutas'
from public.menu_categories c where c.slug = 'postres'
on conflict (carta_key) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  price = excluded.price, half_price = excluded.half_price, allergens = excluded.allergens,
  sort_order = excluded.sort_order, visible = excluded.visible, recommended = excluded.recommended,
  recommendation_note = excluded.recommendation_note;

delete from public.menu_categories where slug in ('sugerencias', 'brasas');

insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Gurgu, jove de trellat', 'tinto', 'Gorga', 'Monastrell, tempranillo y otras. 6 meses de barrica', 16.50, null, 1, true, 'DO Alicante', 'joven', false, null, 'w-gurgu')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Pepe Mendoza', 'tinto', 'Llíber', 'Monastrell, Alicante Bouschet, Syrah. 2 meses en barrica de 500 l', 21, null, 2, true, 'DO Alicante', 'joven', false, null, 'w-pepe')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Lynus Infante', 'tinto', 'Quintanilla de Abajo', 'Tempranillo. Producción muy limitada, 4 meses de barrica', 17.50, null, 3, true, 'DO Ribera del Duero', 'joven', true, 'El joven que te recomendamos descubrir', 'w-lynus')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Les Alcusses', 'tinto', null, 'Monastrell y otras. 8 meses de barrica', 18.50, null, 4, true, 'DO Valencia', 'joven', false, null, 'w-alcusses')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Pasión de Bobal', 'tinto', null, 'Bobal. 6 meses de barrica', 17.50, null, 5, true, 'DO Utiel-Requena', 'joven', false, null, 'w-bobal')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Rafa Cambra II', 'tinto', null, '30% Monastrell, 35% Cabernet Sauvignon, 35% Cabernet Franc. 8 meses de barrica', 19.50, null, 6, true, 'DO Valencia', 'joven', false, null, 'w-cambra')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Luis XIV', 'tinto', 'Arcos i Roncare', 'Monastrell. 4 meses en ánforas de barro', 17.50, null, 7, true, 'DO Alicante', 'joven', true, 'La recomendación de la tierra', 'w-luisxiv')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Finca Resalso', 'tinto', null, 'Tempranillo. 4 meses de barrica', 19, null, 8, true, 'DO Ribera del Duero', 'joven', false, null, 'w-resalso')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Anma', 'tinto', 'St. Antoni de Requena', 'Garnacha y syrah. 14 meses en foudres de 6000 l', 19.50, null, 9, true, 'DO Utiel-Requena', 'crianza', false, null, 'w-anma')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Los Cantos de Torremilanos', 'tinto', 'Aranda de Duero', 'Tempranillo. 18 meses de barrica', 21, null, 10, true, 'DO Ribera del Duero', 'crianza', false, null, 'w-torremilanos')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Emilio Moro', 'tinto', 'Pesquera de Duero', 'Tempranillo. 12 meses de barrica', 34, null, 11, true, 'DO Ribera del Duero', 'crianza', false, null, 'w-emilio')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('El Convento de San Francisco', 'tinto', null, 'Tempranillo. 12 meses de barrica', 32, null, 12, true, 'DO Ribera del Duero', 'crianza', false, null, 'w-convento')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Matarromera', 'tinto', null, 'Tempranillo, crianza. 18 meses de barrica', 30, null, 13, true, 'DO Ribera del Duero', 'crianza', false, null, 'w-matarromera')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Viuda Negra', 'tinto', 'Laguardia, Rioja Alavesa', 'Tempranillo, vino de pueblo. 12 meses de barrica. Javier San Pedro', 17.50, null, 14, true, 'DOCa Rioja', 'crianza', true, 'El crianza que te recomendamos descubrir', 'w-viuda')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Lindes de Remelluri', 'tinto', null, 'Tempranillo. 14 meses de barrica', 29, null, 15, true, 'DOCa Rioja', 'crianza', false, null, 'w-lindes')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Ramón Bilbao Edición Limitada', 'tinto', null, 'Tempranillo, crianza. 15 meses de barrica', 19.50, null, 16, true, 'DOCa Rioja', 'crianza', false, null, 'w-ramon-crianza')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Valdeiana', 'tinto', null, 'Tempranillo y Mazuelo. 12 meses de barrica', 28, null, 17, true, 'DOCa Rioja', 'crianza', false, null, 'w-valdeiana')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Azpilicueta', 'tinto', null, 'Tempranillo. 12 meses de barrica', 19, null, 18, true, 'DOCa Rioja', 'crianza', false, null, 'w-azpilicueta')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Pago de los Capellanes', 'tinto', null, 'Tempranillo, crianza. 12 meses de barrica', 39, null, 19, true, 'DO Ribera del Duero', 'crianza', false, null, 'w-capellanes')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Prado Rey Valdelayegua', 'tinto', null, 'Tempranillo y un poco de Merlot, crianza. 12 meses de barrica', 23, null, 20, true, 'DO Ribera del Duero', 'crianza', false, null, 'w-prado')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Las ocho', 'tinto', null, 'Tempranillo, Cabernet, Bobal y otras, crianza. 12 meses de barrica', 25, null, 21, true, 'Pago Chozas Carrascal', 'crianza', false, null, 'w-ocho')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Clio', 'tinto', null, 'Monastrell y Cabernet. Crianza 12 meses', 69, null, 22, true, 'DO Jumilla', 'galeria', false, null, 'w-clio')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Finca Terrerazo', 'tinto', null, 'Bobal. Crianza', 48, null, 23, true, 'Vino de Pago El Terrerazo', 'galeria', false, null, 'w-terrerazo')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Torre Albéniz', 'tinto', 'Aranda de Duero', '95% Tempranillo, 5% variedades autóctonas. Reserva, 25 a 30 meses', 42, null, 24, true, 'DO Ribera del Duero', 'galeria', false, null, 'w-albeniz')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Pintia', 'tinto', 'San Román de Hornija', 'Tempranillo y otras. Crianza', 88, null, 25, true, 'DO Toro', 'galeria', false, null, 'w-pintia')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('I Cepa', 'tinto', null, 'Tempranillo. Crianza 12 meses', 55, null, 26, true, 'DO Ribera del Duero', 'galeria', false, null, 'w-icepa')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Cabernet Franc de Chozas Carrascal', 'tinto', null, 'Cabernet Franc. Crianza', 51, null, 27, true, 'Pago Chozas Carrascal', 'galeria', false, null, 'w-cabernet-cc')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Finca la Mina', 'tinto', null, 'Tempranillo. Reserva', 39, null, 28, true, null, 'galeria', false, null, 'w-mina')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('El Veneno', 'tinto', null, 'Monastrell. Crianza 12 meses', 39, null, 29, true, 'DO Alicante', 'galeria', false, null, 'w-veneno')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Clos de L''Om', 'blanco', null, 'Malvasía 100%', 21, null, 30, true, 'DO Valencia', 'blanco', false, null, 'w-clos')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Las Tres', 'blanco', null, 'Chardonnay, Sauvignon blanc y Macabeu', 27, null, 31, true, 'Pago Chozas Carrascal', 'blanco', false, null, 'w-lastres')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Anahí', 'blanco', 'Laguardia', 'Malvasía, Sauvignon blanc y Tempranillo blanc. Semidulce', 15.50, null, 32, true, 'DOCa Rioja', 'blanco', false, null, 'w-anahi')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Pregón', 'blanco', null, 'Verdejo 100%', 14, null, 33, true, 'DO Rueda', 'blanco', false, null, 'w-pregon')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Ramón Bilbao', 'blanco', null, 'Verdejo', 15.50, null, 34, true, 'DO Rueda', 'blanco', false, null, 'w-ramon-blanco')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('La Val', 'blanco', null, 'Albariño', 16.50, null, 35, true, 'DO Rías Baixas', 'blanco', false, null, 'w-laval')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Pazo de Pegullal', 'blanco', null, 'Albariño. Crianza en lías', 21, null, 36, true, 'DO Rías Baixas', 'blanco', false, null, 'w-pegullal')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Godeval', 'blanco', null, 'Godello 100%', 19.50, null, 37, true, 'DO Valdeorras', 'blanco', false, null, 'w-godeval')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Viernes', 'blanco', null, 'Godello 100%', 15.50, null, 38, true, 'DO Bierzo', 'blanco', false, null, 'w-viernes')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Roxanne', 'espumoso', 'Requena', 'Chardonnay y Macabeu', 18, null, 39, true, 'DO Cava', 'cava', false, null, 'w-roxanne')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Gramona Imperial', 'espumoso', null, '50% Xarel·lo, 30% Macabeu, 15% Chardonnay, 5% Parellada', 31, null, 40, true, 'DO Cava', 'cava', false, null, 'w-gramona')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Laietà', 'espumoso', null, 'Xarel·lo, Macabeu, Chardonnay y Pinot Noir', 38, null, 41, true, 'DO Cava', 'cava', false, null, 'w-laieta')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Mirgin', 'espumoso', null, 'Xarel·lo, Macabeu y Parellada', 22, null, 42, true, 'DO Cava', 'cava', false, null, 'w-mirgin')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Moët & Chandon', 'espumoso', null, 'Pinot Noir, Pinot Meunier y Chardonnay', 79, null, 43, true, 'Champagne', 'cava', false, null, 'w-moet')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Bollinger Rosé', 'espumoso', null, 'Pinot Noir, Chardonnay y Pinot Meunier', 125, null, 44, true, 'Champagne', 'cava', false, null, 'w-bollinger')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Moët & Chandon Rosé', 'espumoso', null, 'Pinot Noir, Pinot Meunier y Chardonnay', 90, null, 45, true, 'Champagne', 'cava', false, null, 'w-moet-rose')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('El Grifo Malvasía Seco', 'blanco', 'El Grifo', 'Malvasía seco', 30, null, 46, true, 'DO Lanzarote', 'especial', false, null, 'w-grifo')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Raventós i Blanc', 'espumoso', 'Raventós i Blanc', 'Espumoso tradicional', 30, null, 47, true, null, 'especial', false, null, 'w-raventos')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Pol Roger Brut Reserve Champagne', 'espumoso', 'Pol Roger', 'Brut Reserve', 80, null, 48, true, 'Champagne', 'especial', false, null, 'w-polroger')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Billecart-Salmon Brut Reserve', 'espumoso', 'Billecart-Salmon', 'Brut Reserve', 90, null, 49, true, 'Champagne', 'especial', false, null, 'w-billecart')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Gago Tinto', 'tinto', 'Telmo Rodríguez', null, 26, null, 50, true, 'DO Toro', 'especial', false, null, 'w-gago')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('La Montesa', 'tinto', 'Palacios Remondo', null, 26, null, 51, true, 'DOCa Rioja', 'especial', false, null, 'w-montesa')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Pétalos del Bierzo', 'tinto', 'Descendientes de J. Palacios', null, 27, null, 52, true, 'DO Bierzo', 'especial', false, null, 'w-petalos')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Ultreia Saint Jacques (Raúl Pérez)', 'tinto', 'Raúl Pérez', null, 28, null, 53, true, 'DO Ribeira Sacra', 'especial', false, null, 'w-ultreia')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Algueira Patrimonio', 'tinto', 'Algueira', null, 28, null, 54, true, 'DO Ribeira Sacra', 'especial', false, null, 'w-algueira')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Vi de Vila Porrera', 'tinto', 'Vall Llach', null, 30, null, 55, true, 'DOC Priorat', 'especial', false, null, 'w-porrera')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Dido ''La Universal''', 'tinto', 'Venus La Universal', null, 30, null, 56, true, 'DO Montsant', 'especial', false, null, 'w-dido')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Casa Sosegada', 'tinto', 'Rafael Cambra', null, 30, null, 57, true, 'DO Valencia', 'especial', false, null, 'w-sosegada')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Cantine di Ora Amarone della Valpolicella', 'tinto', 'Cantine di Ora', null, 34, null, 58, true, 'Amarone della Valpolicella', 'especial', false, null, 'w-amarone')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Almirez tinto', 'tinto', 'Teso La Monja', null, 35, null, 59, true, 'DO Toro', 'especial', false, null, 'w-almirez')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Pepe Mendoza Giró de Abargues', 'tinto', 'Pepe Mendoza', null, 36, null, 60, true, 'DO Alicante', 'especial', false, null, 'w-giro')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Predicador', 'tinto', 'Contador', null, 40, null, 61, true, 'DOCa Rioja', 'especial', false, null, 'w-predicador')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Camins del Priorat', 'tinto', 'Álvaro Palacios', null, 40, null, 62, true, 'DOC Priorat', 'especial', false, null, 'w-camins')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('El Sequé', 'tinto', 'Bodegas y Viñedos El Sequé', null, 40, null, 63, true, 'DO Alicante', 'especial', false, null, 'w-seque')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Viñas de Gain', 'tinto', 'Artadi', null, 42, null, 64, true, 'Vino de España', 'especial', false, null, 'w-gain')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Abadía Retuerta Selección Especial', 'tinto', 'Abadía Retuerta', null, 45, null, 65, true, 'VT Castilla y León', 'especial', false, null, 'w-abadia')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Mauro Tinto', 'tinto', 'Bodegas Mauro', null, 49, null, 66, true, 'VT Castilla y León', 'especial', false, null, 'w-mauro')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Hacienda Monasterio Crianza', 'tinto', 'Hacienda Monasterio', null, 50, null, 67, true, 'DO Ribera del Duero', 'especial', false, null, 'w-monasterio')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Álvaro Palacios Les Terrasses', 'tinto', 'Álvaro Palacios', null, 60, null, 68, true, 'DOC Priorat', 'especial', false, null, 'w-terrasses')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('El Puntido', 'tinto', 'Viñedos de Páganos', null, 70, null, 69, true, 'DOCa Rioja', 'especial', false, null, 'w-puntido')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Macán Tinto Clásico', 'tinto', 'Rothschild & Vega Sicilia', null, 70, null, 70, true, 'DOCa Rioja', 'especial', false, null, 'w-macan')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
insert into public.wines (name, wine_type, origin, description, price_bottle, price_glass, sort_order, visible, denominacion_origen, section, recommended, recommendation_note, carta_key)
values ('Valsotillo Gran Reserva', 'tinto', 'Bodegas Ismael Arroyo', null, 80, null, 71, true, 'DO Ribera del Duero', 'especial', false, null, 'w-valsotillo')
on conflict (carta_key) do update set
  name = excluded.name, wine_type = excluded.wine_type, origin = excluded.origin, description = excluded.description,
  price_bottle = excluded.price_bottle, price_glass = excluded.price_glass, sort_order = excluded.sort_order,
  visible = excluded.visible, denominacion_origen = excluded.denominacion_origen, section = excluded.section,
  recommended = excluded.recommended, recommendation_note = excluded.recommendation_note;
