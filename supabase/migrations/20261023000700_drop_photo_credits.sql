-- Sin créditos de foto: la web y el panel ya no muestran ni guardan el crédito.
-- La columna se conserva (sin uso) para no romper nada; se vacía su contenido.
update public.gallery_items set credit = null where credit is not null;
comment on column public.gallery_items.credit is 'Sin uso desde oct-2026 (créditos de foto retirados de la web).';
