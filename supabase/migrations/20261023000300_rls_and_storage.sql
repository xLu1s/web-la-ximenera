-- =====================================================================
-- Seguridad: RLS en todas las tablas + permisos mínimos.
--  · Público (anon): solo lee contenido publicado; NO escribe en ninguna tabla.
--  · Reservas: solo vía public.create_booking, ejecutable únicamente por service_role
--    (la API del servidor, tras honeypot y límite de peticiones).
--  · Admins (authenticated + public.is_admin()): editan contenido y gestionan reservas.
-- =====================================================================

alter table public.admins enable row level security;
alter table public.settings enable row level security;
alter table public.opening_hours enable row level security;
alter table public.service_exceptions enable row level security;
alter table public.bookings enable row level security;
alter table public.rate_limits enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.wines enable row level security;
alter table public.special_menus enable row level security;
alter table public.gallery_items enable row level security;

-- Defensa en profundidad: anon no tiene privilegios de escritura en ninguna tabla.
revoke insert, update, delete, truncate, references, trigger on all tables in schema public from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;
-- Tablas internas: nadie salvo service_role.
revoke all on public.rate_limits from anon, authenticated;
revoke all on public.admins from anon;
revoke insert, update, delete on public.admins from authenticated;
revoke insert on public.bookings from anon, authenticated;
revoke delete on public.bookings from anon, authenticated;
revoke all on public.service_exceptions from anon;
revoke all on public.bookings from anon;

-- Funciones: quitar el EXECUTE por defecto y conceder solo lo necesario.
revoke execute on function public.service_status(date) from public, anon, authenticated;
revoke execute on function public.create_booking(date, time, integer, text, text, text, text, boolean, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.cancel_booking(uuid, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.admin_day_status(date) from public, anon;
revoke execute on function public.admin_cancel_booking(uuid) from public, anon;
grant execute on function public.service_status(date) to service_role;
grant execute on function public.create_booking(date, time, integer, text, text, text, text, boolean, text, timestamptz) to service_role;
grant execute on function public.cancel_booking(uuid, text, timestamptz) to service_role;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;
grant execute on function public.admin_day_status(date) to authenticated, service_role;
grant execute on function public.admin_cancel_booking(uuid) to authenticated, service_role;
grant execute on function public.is_admin() to anon, authenticated, service_role;
grant execute on function public.today_madrid() to anon, authenticated, service_role;

-- Por si en el futuro se crean funciones nuevas: no exponerlas a anon por defecto.
alter default privileges in schema public revoke execute on functions from anon;

-- ---------------------------- Políticas ----------------------------
-- admins: un admin puede ver la lista (solo lectura).
create policy admins_select_admin on public.admins for select to authenticated using (public.is_admin());

-- settings / opening_hours: lectura pública (se muestran en la web); escritura admin.
create policy settings_read on public.settings for select to anon, authenticated using (true);
create policy settings_admin_update on public.settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy hours_read on public.opening_hours for select to anon, authenticated using (true);
create policy hours_admin_all on public.opening_hours for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- service_exceptions: solo admin.
create policy exceptions_admin_all on public.service_exceptions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- bookings: admin lee y actualiza (cancelar). Nadie inserta ni borra vía API.
create policy bookings_admin_select on public.bookings for select to authenticated using (public.is_admin());
create policy bookings_admin_update on public.bookings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Carta
create policy menu_categories_public on public.menu_categories for select to anon, authenticated using (visible);
create policy menu_categories_admin on public.menu_categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy menu_items_public on public.menu_items for select to anon, authenticated using (
  visible and exists (select 1 from public.menu_categories c where c.id = category_id and c.visible)
);
create policy menu_items_admin on public.menu_items for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Vinos
create policy wines_public on public.wines for select to anon, authenticated using (visible);
create policy wines_admin on public.wines for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Menús especiales: el público solo ve los visibles y dentro de su rango de fechas (hora de Madrid).
create policy special_menus_public on public.special_menus for select to anon, authenticated using (
  visible
  and (starts_on is null or starts_on <= public.today_madrid())
  and (ends_on is null or ends_on >= public.today_madrid())
);
create policy special_menus_admin on public.special_menus for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Galería
create policy gallery_public on public.gallery_items for select to anon, authenticated using (visible);
create policy gallery_admin on public.gallery_items for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------- Storage ----------------------------
-- Bucket público "media" (galería e imágenes de menús). Límites aplicados por Storage:
-- 50 MB y solo imágenes JPEG/PNG/WebP/AVIF y vídeos MP4/WebM.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 52428800,
        array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- (Storage necesita SELECT para poder borrar/sobrescribir con la API.)
create policy media_admin_select on storage.objects for select to authenticated
  using (bucket_id = 'media' and public.is_admin());
create policy media_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_admin());
create policy media_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.is_admin()) with check (bucket_id = 'media' and public.is_admin());
create policy media_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_admin());
