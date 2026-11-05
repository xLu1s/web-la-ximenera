-- Sugerencias de la carta de comida: los mismos platos que ya destacan las fotos de la web.
-- No añade platos. Idempotente: reaplica la marca sobre carta_key.

update public.menu_items
set recommended = true
where carta_key in ('f-tartar-atun', 'c-curry', 'p-solomillo');
