-- =====================================================================
-- La Ximenera · esquema base (contenido, reservas, ajustes) con RLS estricta
-- Zona horaria del negocio: Europe/Madrid (todas las reglas de fecha/hora la usan).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Administradores: usuarios de Supabase Auth cuyo email figura aquí.
-- ---------------------------------------------------------------------
create table public.admins (
  email text primary key check (email = lower(btrim(email)) and position('@' in email) > 1),
  created_at timestamptz not null default now()
);
comment on table public.admins is 'Emails con acceso al panel /admin. Se gestiona solo con SQL (service role / dashboard).';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    join public.admins a on a.email = lower(u.email)
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
  );
$$;

-- ---------------------------------------------------------------------
-- Ajustes generales (fila única)
-- ---------------------------------------------------------------------
create table public.settings (
  id smallint primary key default 1 check (id = 1),
  default_capacity integer not null default 80 check (default_capacity between 0 and 1000),
  max_party_size integer not null default 12 check (max_party_size between 1 and 100),
  slot_minutes integer not null default 15 check (slot_minutes in (5, 10, 15, 20, 30, 60)),
  last_booking_before_close_minutes integer not null default 60
    check (last_booking_before_close_minutes between 0 and 240),
  updated_at timestamptz not null default now()
);
comment on column public.settings.last_booking_before_close_minutes is
  'Última hora de reserva = cierre del servicio menos estos minutos.';
insert into public.settings (id) values (1);

-- ---------------------------------------------------------------------
-- Horario semanal. Un día sin filas = cerrado.
-- weekday ISO: 1 = lunes … 7 = domingo. service: comida (mediodía) | cena (noche).
-- closes admite '24:00' (cierre a medianoche).
-- ---------------------------------------------------------------------
create table public.opening_hours (
  id bigint generated always as identity primary key,
  weekday smallint not null check (weekday between 1 and 7),
  service text not null check (service in ('comida', 'cena')),
  opens time not null,
  closes time not null,
  capacity integer check (capacity between 0 and 1000),
  unique (weekday, service),
  check (closes > opens)
);
comment on column public.opening_hours.capacity is 'Aforo de este servicio; null = aforo general (settings.default_capacity).';

-- ---------------------------------------------------------------------
-- Excepciones por fecha: bloqueo de día/servicio o aforo distinto.
-- service null = todo el día.
-- ---------------------------------------------------------------------
create table public.service_exceptions (
  id bigint generated always as identity primary key,
  day date not null,
  service text check (service in ('comida', 'cena')),
  service_key text generated always as (coalesce(service, '*')) stored,
  closed boolean not null default true,
  capacity integer check (capacity between 0 and 1000),
  note text check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  unique (day, service_key),
  check (closed or capacity is not null)
);

-- ---------------------------------------------------------------------
-- Reservas
-- ---------------------------------------------------------------------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  day date not null,
  service text not null check (service in ('comida', 'cena')),
  booking_time time not null,
  starts_at timestamptz not null,
  party_size integer not null check (party_size between 1 and 100),
  name text not null check (char_length(btrim(name)) between 2 and 100),
  phone text not null check (phone ~ '^\+?[0-9][0-9 ().-]{7,19}$'),
  email text not null check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  notes text check (char_length(notes) <= 500),
  status text not null default 'confirmada' check (status in ('confirmada', 'cancelada')),
  consent_at timestamptz not null,
  privacy_version text not null,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancelled_by text check (cancelled_by in ('cliente', 'restaurante'))
);
create index bookings_day_service_idx on public.bookings (day, service) where status = 'confirmada';
create index bookings_day_idx on public.bookings (day);

-- ---------------------------------------------------------------------
-- Límite de peticiones (anti-spam del formulario público)
-- ---------------------------------------------------------------------
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);

-- ---------------------------------------------------------------------
-- Carta
-- ---------------------------------------------------------------------
create table public.menu_categories (
  id bigint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9-]{1,40}$'),
  tab text not null check (char_length(tab) between 1 and 40),
  title text not null check (char_length(title) between 1 and 120),
  subtitle text check (char_length(subtitle) <= 120),
  intro text check (char_length(intro) <= 600),
  notes text[] not null default '{}',
  sort_order integer not null default 0,
  visible boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.menu_items (
  id bigint generated always as identity primary key,
  category_id bigint not null references public.menu_categories (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  description text check (char_length(description) <= 600),
  price text check (char_length(price) <= 40),
  half_price text check (char_length(half_price) <= 40),
  allergens text[] not null default '{}' check (allergens <@ array[
    'gluten', 'crustaceos', 'huevos', 'pescado', 'cacahuetes', 'soja', 'lacteos',
    'frutos_cascara', 'apio', 'mostaza', 'sesamo', 'sulfitos', 'altramuces', 'moluscos'
  ]::text[]),
  sort_order integer not null default 0,
  visible boolean not null default true,
  updated_at timestamptz not null default now()
);
create index menu_items_category_idx on public.menu_items (category_id, sort_order);

-- ---------------------------------------------------------------------
-- Carta de vinos
-- ---------------------------------------------------------------------
create table public.wines (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 160),
  wine_type text not null check (wine_type in ('tinto', 'blanco', 'rosado', 'espumoso', 'generoso', 'dulce', 'otro')),
  origin text check (char_length(origin) <= 160),
  description text check (char_length(description) <= 400),
  price_bottle numeric(8, 2) check (price_bottle >= 0),
  price_glass numeric(8, 2) check (price_glass >= 0),
  sort_order integer not null default 0,
  visible boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Menús especiales (y menú del día)
-- courses: [{ "title": "Entrantes", "items": ["…", "…"] }, …]
-- ---------------------------------------------------------------------
create table public.special_menus (
  id bigint generated always as identity primary key,
  kind text not null default 'especial' check (kind in ('especial', 'del_dia')),
  title text not null check (char_length(title) between 1 and 160),
  subtitle text check (char_length(subtitle) <= 160),
  description text check (char_length(description) <= 1500),
  courses jsonb not null default '[]'::jsonb check (jsonb_typeof(courses) = 'array'),
  price text check (char_length(price) <= 60),
  price_note text check (char_length(price_note) <= 160),
  image_path text check (char_length(image_path) <= 300),
  starts_on date,
  ends_on date,
  visible boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

-- Fecha de hoy en Madrid (para la visibilidad por rango de fechas).
create or replace function public.today_madrid()
returns date
language sql
stable
set search_path = ''
as $$ select (now() at time zone 'Europe/Madrid')::date $$;

-- ---------------------------------------------------------------------
-- Galería (fotos y vídeos)
-- storage_path: objeto en el bucket "media"; static_path: archivo incluido en la web (semilla).
-- ---------------------------------------------------------------------
create table public.gallery_items (
  id bigint generated always as identity primary key,
  media_type text not null check (media_type in ('image', 'video')),
  storage_path text check (char_length(storage_path) <= 300),
  static_path text check (char_length(static_path) <= 300),
  mime_type text,
  size_bytes bigint check (size_bytes >= 0),
  caption text not null default '' check (char_length(caption) <= 300),
  credit text check (char_length(credit) <= 160),
  is_provisional boolean not null default false,
  sort_order integer not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  check (storage_path is not null or static_path is not null)
);

-- ---------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;

create trigger settings_touch before update on public.settings for each row execute function public.touch_updated_at();
create trigger menu_categories_touch before update on public.menu_categories for each row execute function public.touch_updated_at();
create trigger menu_items_touch before update on public.menu_items for each row execute function public.touch_updated_at();
create trigger wines_touch before update on public.wines for each row execute function public.touch_updated_at();
create trigger special_menus_touch before update on public.special_menus for each row execute function public.touch_updated_at();
