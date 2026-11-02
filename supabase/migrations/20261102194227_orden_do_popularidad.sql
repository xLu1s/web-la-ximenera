-- Orden del filtro público de D.O.: popularidad de ventas en España.
-- Idempotente. No borra denominaciones ni cambia vinos.

insert into public.denominaciones (slug, name, sort_order, visible) values
  ('doca-rioja', 'DOCa Rioja', 1, true),
  ('do-cava', 'DO Cava', 2, true),
  ('do-rueda', 'DO Rueda', 3, true),
  ('do-ribera-del-duero', 'DO Ribera del Duero', 4, true),
  ('do-rias-baixas', 'DO Rías Baixas', 5, true),
  ('do-toro', 'DO Toro', 6, true),
  ('doc-priorat', 'DOC Priorat', 7, true),
  ('do-bierzo', 'DO Bierzo', 8, true),
  ('do-jumilla', 'DO Jumilla', 9, true),
  ('do-utiel-requena', 'DO Utiel-Requena', 10, true),
  ('do-valencia', 'DO Valencia', 11, true),
  ('do-alicante', 'DO Alicante', 12, true),
  ('do-valdeorras', 'DO Valdeorras', 13, true),
  ('do-ribeira-sacra', 'DO Ribeira Sacra', 14, true),
  ('do-montsant', 'DO Montsant', 15, true),
  ('champagne', 'Champagne', 16, true),
  ('vt-castilla-y-leon', 'VT Castilla y León', 17, true),
  ('pago-chozas-carrascal', 'Pago Chozas Carrascal', 18, true),
  ('vino-de-pago-el-terrerazo', 'Vino de Pago El Terrerazo', 19, true),
  ('do-lanzarote', 'DO Lanzarote', 20, true),
  ('vino-de-espana', 'Vino de España', 21, true),
  ('amarone-della-valpolicella', 'Amarone della Valpolicella', 22, true)
on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order, visible = excluded.visible;
