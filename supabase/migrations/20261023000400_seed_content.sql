-- =====================================================================
-- Contenido inicial: copia LITERAL de los datos de la web estática (src/data/*.ts).
-- Generado por scripts/generate-seed.mts. No editar a mano.
-- =====================================================================

insert into public.admins (email) values ('luisbalaguer97@gmail.com') on conflict do nothing;

-- Horario (src/data/site.ts). Servicio "comida" = franja de mediodía, "cena" = franja de noche.
insert into public.opening_hours (weekday, service, opens, closes) values (2, 'comida', '13:30', '16:00');
insert into public.opening_hours (weekday, service, opens, closes) values (2, 'cena', '20:30', '23:00');
insert into public.opening_hours (weekday, service, opens, closes) values (3, 'comida', '13:30', '16:00');
insert into public.opening_hours (weekday, service, opens, closes) values (3, 'cena', '20:30', '23:00');
insert into public.opening_hours (weekday, service, opens, closes) values (4, 'comida', '13:30', '16:00');
insert into public.opening_hours (weekday, service, opens, closes) values (4, 'cena', '20:30', '23:00');
insert into public.opening_hours (weekday, service, opens, closes) values (5, 'comida', '13:30', '16:00');
insert into public.opening_hours (weekday, service, opens, closes) values (5, 'cena', '20:30', '23:00');
insert into public.opening_hours (weekday, service, opens, closes) values (6, 'comida', '12:30', '16:30');
insert into public.opening_hours (weekday, service, opens, closes) values (6, 'cena', '20:00', '24:00');
insert into public.opening_hours (weekday, service, opens, closes) values (7, 'comida', '13:00', '16:00');

-- Carta (src/data/menu.ts)
insert into public.menu_categories (slug, tab, title, subtitle, intro, notes, sort_order) values ('frios', 'Fríos', 'Fríos', 'Para compartir', null, '{}'::text[], 10);
insert into public.menu_items (category_id, name, price, half_price, allergens, sort_order) select id, 'Degustación de quesos Europeos con frutas frescas y secas', '16,80 €', '9,80 €', array['lacteos']::text[], 10 from public.menu_categories where slug = 'frios';
insert into public.menu_items (category_id, name, price, half_price, allergens, sort_order) select id, 'Escalibada brasa con anchoas del Norte y aceite negro', '4,80 € /u', null, array['pescado']::text[], 20 from public.menu_categories where slug = 'frios';
insert into public.menu_items (category_id, name, price, half_price, allergens, sort_order) select id, 'Tomate Raf con capellá y virutas de mojama', '12,90 €', null, array['pescado']::text[], 30 from public.menu_categories where slug = 'frios';
insert into public.menu_items (category_id, name, price, half_price, allergens, sort_order) select id, 'Bolas de aguacate rellenas de tartar de Atún y de Salmón', '17,50 €', null, array['pescado']::text[], 40 from public.menu_categories where slug = 'frios';
insert into public.menu_items (category_id, name, price, half_price, allergens, sort_order) select id, 'Carpaccio de tomate rosa con burrata al pesto y rúcula', '13,90 €', null, array['lacteos']::text[], 50 from public.menu_categories where slug = 'frios';
insert into public.menu_items (category_id, name, price, half_price, allergens, sort_order) select id, 'Tartar de Solomillo de vaca acompañado de tostadas', '19,50 €', null, '{}'::text[], 60 from public.menu_categories where slug = 'frios';
insert into public.menu_items (category_id, name, price, half_price, allergens, sort_order) select id, 'Ensalada de queso de cabra caramelizada', '12,50 €', null, array['lacteos']::text[], 70 from public.menu_categories where slug = 'frios';
insert into public.menu_items (category_id, name, price, half_price, allergens, sort_order) select id, 'Pericana Alcoyana', '15,50 €', '9,80 €', array['pescado']::text[], 80 from public.menu_categories where slug = 'frios';
insert into public.menu_items (category_id, name, price, half_price, allergens, sort_order) select id, 'Turrón de Foie con almendras', '18,90 €', null, '{}'::text[], 90 from public.menu_categories where slug = 'frios';
insert into public.menu_items (category_id, name, price, half_price, allergens, sort_order) select id, 'Ostras', '4,20 €/u', null, array['moluscos']::text[], 100 from public.menu_categories where slug = 'frios';
insert into public.menu_items (category_id, name, price, half_price, allergens, sort_order) select id, 'Anchoas del norte sobre una crema de pesto y tomate confitado', '4,50 €', null, array['pescado']::text[], 110 from public.menu_categories where slug = 'frios';
insert into public.menu_items (category_id, name, price, half_price, allergens, sort_order) select id, 'Ceviche de corvina salvaje y gamba roja', '16,50 €', null, array['pescado']::text[], 120 from public.menu_categories where slug = 'frios';
insert into public.menu_items (category_id, name, price, half_price, allergens, sort_order) select id, 'Marisco del día', 'S/M', null, '{}'::text[], 130 from public.menu_categories where slug = 'frios';
insert into public.menu_categories (slug, tab, title, subtitle, intro, notes, sort_order) values ('calientes', 'Calientes', 'Calientes', 'Para compartir', null, '{}'::text[], 20);
insert into public.menu_items (category_id, name, price, half_price, allergens, sort_order) select id, 'Nuetras patatas Bravas', '9,50 €', null, '{}'::text[], 10 from public.menu_categories where slug = 'calientes';
insert into public.menu_items (category_id, name, price, half_price, allergens, sort_order) select id, 'Tacos de Buey marinados y a la brasa', '15,50 €', null, '{}'::text[], 20 from public.menu_categories where slug = 'calientes';
insert into public.menu_items (category_id, name, price, half_price, allergens, sort_order) select id, 'Salteado de gambas con verduras de temporada', '17,50 €', null, array['crustaceos']::text[], 30 from public.menu_categories where slug = 'calientes';
insert into public.menu_items (category_id, name, price, half_price, allergens, sort_order) select id, 'Revuelto de pericana alcoyana', '12,90 €', null, array['pescado']::text[], 40 from public.menu_categories where slug = 'calientes';
insert into public.menu_items (category_id, name, price, half_price, allergens, sort_order) select id, 'Almejas a la marinera', '15,50 €', null, array['moluscos']::text[], 50 from public.menu_categories where slug = 'calientes';
insert into public.menu_items (category_id, name, price, half_price, allergens, sort_order) select id, 'Mejillones a la cerveza', '12,00 €', '8,50 €', array['moluscos']::text[], 60 from public.menu_categories where slug = 'calientes';
insert into public.menu_items (category_id, name, price, half_price, allergens, sort_order) select id, 'Mejillones al vapor', '9,50 €', '6,20 €', array['moluscos']::text[], 70 from public.menu_categories where slug = 'calientes';
insert into public.menu_items (category_id, name, price, half_price, allergens, sort_order) select id, 'Pulpo brasa sobre puré de patata y tomate', '19,50 €', null, array['crustaceos']::text[], 80 from public.menu_categories where slug = 'calientes';
insert into public.menu_items (category_id, name, price, half_price, allergens, sort_order) select id, 'Calamar a la brasa o a la andaluza', '16,50 €', null, array['crustaceos']::text[], 90 from public.menu_categories where slug = 'calientes';
insert into public.menu_items (category_id, name, price, half_price, allergens, sort_order) select id, 'Vieira a la brasa con crema de puerros', '5,90 €/u', null, array['crustaceos']::text[], 100 from public.menu_categories where slug = 'calientes';
insert into public.menu_items (category_id, name, price, half_price, allergens, sort_order) select id, 'Fritura de pescadito de playa', '15,50 €', null, array['pescado']::text[], 110 from public.menu_categories where slug = 'calientes';
insert into public.menu_items (category_id, name, price, half_price, allergens, sort_order) select id, 'Tataki de Atún rojo a la brasa con salsa Tsuyu Moto', '24,50 €', null, array['pescado']::text[], 120 from public.menu_categories where slug = 'calientes';
insert into public.menu_categories (slug, tab, title, subtitle, intro, notes, sort_order) values ('brasas', 'Brasas', 'Nuestras Brasas', null, 'En nuestras Brasas trabajamos con carnes y pescados nacionales acompañados de verduras de temporada y patatas baby.', '{}'::text[], 30);
insert into public.menu_items (category_id, name, price, half_price, allergens, sort_order) select id, 'Solomillo de vaca a la brasa', '24,50 €', null, '{}'::text[], 10 from public.menu_categories where slug = 'brasas';
insert into public.menu_items (category_id, name, price, half_price, allergens, sort_order) select id, 'Entrecotte de ternera trinchado con verduras', '19,50 €', null, '{}'::text[], 20 from public.menu_categories where slug = 'brasas';
insert into public.menu_items (category_id, name, price, half_price, allergens, sort_order) select id, 'Salmón relleno de gambas a la brasa con aceite de cítricos', '16,50 €', null, array['pescado']::text[], 30 from public.menu_categories where slug = 'brasas';
insert into public.menu_items (category_id, name, price, half_price, allergens, sort_order) select id, 'Rodaballo a la Donostiarra estilo tradicional', '19,80 €', null, array['pescado']::text[], 40 from public.menu_categories where slug = 'brasas';
insert into public.menu_items (category_id, name, price, half_price, allergens, sort_order) select id, 'Secreto Ibérico con chimichurri a la brasa', '18,50 €', null, '{}'::text[], 50 from public.menu_categories where slug = 'brasas';
insert into public.menu_items (category_id, name, price, half_price, allergens, sort_order) select id, 'Chuletón de vaca Premium trinchado con guarnición', '100 grs / 5,85 €', null, '{}'::text[], 60 from public.menu_categories where slug = 'brasas';
insert into public.menu_items (category_id, name, price, half_price, allergens, sort_order) select id, 'Bacalao gratinado al perfume de ajo y tomate seco', '15,50 €', null, array['pescado']::text[], 70 from public.menu_categories where slug = 'brasas';
insert into public.menu_items (category_id, name, price, half_price, allergens, sort_order) select id, 'Bacalao ahumado con tomillo, romero y verduras brasa', '17,50 €', null, array['pescado']::text[], 80 from public.menu_categories where slug = 'brasas';
insert into public.menu_items (category_id, name, price, half_price, allergens, sort_order) select id, 'Salsas para acompañar', '1,80 €', null, '{}'::text[], 90 from public.menu_categories where slug = 'brasas';
insert into public.menu_categories (slug, tab, title, subtitle, intro, notes, sort_order) values ('postres', 'Postres', 'Nuestros Postres Caseros', null, null, '{}'::text[], 40);
insert into public.menu_items (category_id, name, price, half_price, allergens, sort_order) select id, 'La Bola de nieve con frutos rojos', '6,50 €', null, array['lacteos']::text[], 10 from public.menu_categories where slug = 'postres';
insert into public.menu_items (category_id, name, price, half_price, allergens, sort_order) select id, 'La Dama blanca', '6,00 €', null, array['lacteos']::text[], 20 from public.menu_categories where slug = 'postres';
insert into public.menu_items (category_id, name, price, half_price, allergens, sort_order) select id, 'Milhojas de crema de manzanas al horno y chocolate', '6,80 €', null, array['lacteos']::text[], 30 from public.menu_categories where slug = 'postres';
insert into public.menu_items (category_id, name, price, half_price, allergens, sort_order) select id, 'La Mousee de nata, tomillo, frutos rojos y sorbete de maracuyá', '6,50 €', null, array['lacteos']::text[], 40 from public.menu_categories where slug = 'postres';
insert into public.menu_items (category_id, name, price, half_price, allergens, sort_order) select id, 'Piña a la brasa con helado de coco y flambeado de ron', '6,50 €', null, array['lacteos']::text[], 50 from public.menu_categories where slug = 'postres';
insert into public.menu_items (category_id, name, price, half_price, allergens, sort_order) select id, 'Browne de chocolate con nueces y helado de nata', '6,80 €', null, array['lacteos']::text[], 60 from public.menu_categories where slug = 'postres';
insert into public.menu_items (category_id, name, price, half_price, allergens, sort_order) select id, 'Fruta de Temporada', null, null, '{}'::text[], 70 from public.menu_categories where slug = 'postres';
insert into public.menu_categories (slug, tab, title, subtitle, intro, notes, sort_order) values ('sugerencias', 'Pan y sugerencias', 'Preguntar por nuestra sugerencia del día', null, null, array['Disponemos de pan y bebidas para celiacos']::text[], 50);
insert into public.menu_items (category_id, name, price, half_price, allergens, sort_order) select id, 'Pan rustico a la brasa acompañado de tomate y all i oli', '2,20 €', null, '{}'::text[], 10 from public.menu_categories where slug = 'sugerencias';

-- Menú del día (src/data/menuDelDia.ts). Precio con la misma normalización que ya aplicaba la web ("16.50€" → "16,50 €").
insert into public.special_menus (kind, title, subtitle, courses, price, price_note, sort_order) values ('del_dia', 'Menú del día', 'Martes a viernes', '[{"title":"Entrantes","items":["Aperitivo de bienvenida.","Pan a la brasa con alliolis y tomate.","Ensalada Mediterránea.","Mejillones a la marinera."]},{"title":"A elegir","items":["Bacalao gratinado.","Tacos de solomillo con guarnición."]},{"title":"Postre a elegir","items":["Fruta del tiempo.","Dama blanca.","+café"]}]'::jsonb, '16,50 €', 'Bebidas no incluidas', 0);

-- Galería (fotos actuales de la web, servidas desde public/galeria/)
insert into public.gallery_items (media_type, static_path, mime_type, caption, credit, is_provisional, sort_order) values ('image', '/galeria/ig-01.webp', 'image/webp', 'Cazuela de mejillones', 'Foto: @laximenera_restaurante', false, 10);
insert into public.gallery_items (media_type, static_path, mime_type, caption, credit, is_provisional, sort_order) values ('image', '/galeria/ig-02.webp', 'image/webp', 'Plato de pescado crudo con aguacate en la mesa del restaurante', 'Foto: @laximenera_restaurante', false, 20);
insert into public.gallery_items (media_type, static_path, mime_type, caption, credit, is_provisional, sort_order) values ('image', '/galeria/ig-03.webp', 'image/webp', 'Carne a la brasa con verduras', 'Foto: @laximenera_restaurante', false, 30);
insert into public.gallery_items (media_type, static_path, mime_type, caption, credit, is_provisional, sort_order) values ('image', '/galeria/ig-04.webp', 'image/webp', 'Ceviche de gambas con aguacate, boniato y maíz', 'Foto: @laximenera_restaurante', false, 40);
insert into public.gallery_items (media_type, static_path, mime_type, caption, credit, is_provisional, sort_order) values ('image', '/galeria/ig-05.webp', 'image/webp', 'Carne de vaca a la brasa trinchada sobre tabla con verduras', 'Foto: @laximenera_restaurante', false, 50);
insert into public.gallery_items (media_type, static_path, mime_type, caption, credit, is_provisional, sort_order) values ('image', '/galeria/ig-06.webp', 'image/webp', 'Tartar de atún con algas', 'Foto: @laximenera_restaurante', false, 60);
insert into public.gallery_items (media_type, static_path, mime_type, caption, credit, is_provisional, sort_order) values ('image', '/galeria/ig-07.webp', 'image/webp', 'Tartar de carne con yema de huevo', 'Foto: @laximenera_restaurante', false, 70);
insert into public.gallery_items (media_type, static_path, mime_type, caption, credit, is_provisional, sort_order) values ('image', '/galeria/pulpo-brasa.webp', 'image/webp', 'Pulpo a la brasa con pimientos y tostas', 'Foto de cliente · provisional', true, 80);
insert into public.gallery_items (media_type, static_path, mime_type, caption, credit, is_provisional, sort_order) values ('image', '/galeria/tataki-atun.webp', 'image/webp', 'Tataki de atún', 'Foto de cliente · provisional', true, 90);
insert into public.gallery_items (media_type, static_path, mime_type, caption, credit, is_provisional, sort_order) values ('image', '/galeria/almejas.webp', 'image/webp', 'Almejas en salsa', 'Foto de cliente · provisional', true, 100);
insert into public.gallery_items (media_type, static_path, mime_type, caption, credit, is_provisional, sort_order) values ('image', '/galeria/tartar.webp', 'image/webp', 'Tartar con algas', 'Foto de cliente · provisional', true, 110);
insert into public.gallery_items (media_type, static_path, mime_type, caption, credit, is_provisional, sort_order) values ('image', '/galeria/postre.webp', 'image/webp', 'Postre con nata y frutos secos', 'Foto de cliente · provisional', true, 120);
