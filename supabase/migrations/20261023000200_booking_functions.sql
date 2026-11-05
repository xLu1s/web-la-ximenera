-- =====================================================================
-- Reservas: estado de servicios, creación atómica (sin overbooking), cancelación,
-- límite de peticiones. Todas en Europe/Madrid.
-- =====================================================================

-- Estado de cada servicio de una fecha: horario, aforo efectivo, ocupación y bloqueo.
create or replace function public.service_status(p_day date)
returns table (
  service text,
  opens time,
  closes time,
  last_booking time,
  capacity integer,
  booked integer,
  is_closed boolean,
  closed_note text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    h.service,
    h.opens,
    h.closes,
    case when s.last_booking_before_close_minutes = 0 then h.closes
         else (h.closes - make_interval(mins => s.last_booking_before_close_minutes))::time end as last_booking,
    coalesce(case when not es.closed then es.capacity end,
             case when not ed.closed then ed.capacity end,
             h.capacity,
             s.default_capacity) as capacity,
    coalesce((
      select sum(b.party_size)
      from public.bookings b
      where b.day = p_day and b.service = h.service and b.status = 'confirmada'
    ), 0)::integer as booked,
    coalesce(ed.closed, false) or coalesce(es.closed, false) as is_closed,
    coalesce(case when es.closed then es.note end, case when ed.closed then ed.note end) as closed_note
  from public.opening_hours h
  cross join public.settings s
  left join public.service_exceptions ed on ed.day = p_day and ed.service is null
  left join public.service_exceptions es on es.day = p_day and es.service = h.service
  where s.id = 1
    and h.weekday = extract(isodow from p_day)::smallint
  order by h.opens;
$$;

-- Versión para el panel (comprueba que quien llama es admin).
create or replace function public.admin_day_status(p_day date)
returns table (
  service text, opens time, closes time, last_booking time,
  capacity integer, booked integer, is_closed boolean, closed_note text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query select * from public.service_status(p_day);
end $$;

-- ---------------------------------------------------------------------
-- Crear reserva. Devuelve jsonb { ok, error?, … }.
-- Concurrencia: bloqueo transaccional por (fecha, servicio) ANTES de contar plazas,
-- de modo que dos peticiones simultáneas no pueden superar el aforo.
-- p_now solo existe para pruebas; la API nunca lo envía.
-- ---------------------------------------------------------------------
create or replace function public.create_booking(
  p_day date,
  p_time time,
  p_party_size integer,
  p_name text,
  p_phone text,
  p_email text,
  p_notes text,
  p_consent boolean,
  p_privacy_version text default 'v1',
  p_now timestamptz default now()
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_settings public.settings;
  v_status record;
  v_any_service boolean;
  v_service text;
  v_capacity integer;
  v_booked integer;
  v_local_now timestamp := p_now at time zone 'Europe/Madrid';
  v_starts timestamptz;
  v_ref text;
  v_id uuid;
  v_name text := btrim(coalesce(p_name, ''));
  v_phone text := btrim(coalesce(p_phone, ''));
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i integer;
begin
  select * into v_settings from public.settings where id = 1;

  if p_consent is not true then
    return jsonb_build_object('ok', false, 'error', 'consent_required');
  end if;
  if p_party_size is null or p_party_size < 1 then
    return jsonb_build_object('ok', false, 'error', 'party_too_small');
  end if;
  if p_party_size > v_settings.max_party_size then
    return jsonb_build_object('ok', false, 'error', 'party_too_large', 'max', v_settings.max_party_size);
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 100 then
    return jsonb_build_object('ok', false, 'error', 'invalid_name');
  end if;
  if v_phone !~ '^\+?[0-9][0-9 ().-]{7,19}$' or char_length(regexp_replace(v_phone, '[^0-9]', '', 'g')) < 9 then
    return jsonb_build_object('ok', false, 'error', 'invalid_phone');
  end if;
  if char_length(v_email) > 254 or v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return jsonb_build_object('ok', false, 'error', 'invalid_email');
  end if;
  if v_notes is not null and char_length(v_notes) > 500 then
    return jsonb_build_object('ok', false, 'error', 'notes_too_long');
  end if;
  if p_day is null or p_time is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_datetime');
  end if;
  if (p_day + p_time) <= v_local_now then
    return jsonb_build_object('ok', false, 'error', 'past');
  end if;

  -- ¿Qué servicio contiene la hora pedida?
  select exists (select 1 from public.service_status(p_day)) into v_any_service;
  if not v_any_service then
    return jsonb_build_object('ok', false, 'error', 'closed_day');
  end if;

  select st.service into v_service
  from public.service_status(p_day) st
  where p_time >= st.opens and p_time <= st.last_booking
  order by st.opens
  limit 1;

  if v_service is null then
    return jsonb_build_object('ok', false, 'error', 'outside_hours');
  end if;

  -- Bloqueo por fecha+servicio: serializa solo las reservas que compiten por las mismas plazas.
  perform pg_advisory_xact_lock(hashtextextended('booking:' || p_day::text || ':' || v_service, 0));

  -- Releer estado DESPUÉS del bloqueo (nueva instantánea en READ COMMITTED).
  select * into v_status from public.service_status(p_day) st where st.service = v_service;

  if v_status.is_closed then
    return jsonb_build_object('ok', false, 'error', 'blocked', 'service', v_service);
  end if;
  if (extract(epoch from (p_time - v_status.opens))::integer % (v_settings.slot_minutes * 60)) <> 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_slot', 'slot_minutes', v_settings.slot_minutes);
  end if;

  v_capacity := v_status.capacity;
  v_booked := v_status.booked;
  if v_booked + p_party_size > v_capacity then
    return jsonb_build_object('ok', false, 'error', 'full', 'service', v_service,
                              'remaining', greatest(v_capacity - v_booked, 0));
  end if;

  v_starts := (p_day + p_time) at time zone 'Europe/Madrid';

  for attempt in 1..8 loop
    v_ref := 'LX-';
    for i in 1..6 loop
      v_ref := v_ref || substr(v_alphabet, 1 + floor(random() * char_length(v_alphabet))::integer, 1);
    end loop;
    begin
      insert into public.bookings (reference, day, service, booking_time, starts_at, party_size,
                                   name, phone, email, notes, consent_at, privacy_version)
      values (v_ref, p_day, v_service, p_time, v_starts, p_party_size,
              v_name, v_phone, v_email, v_notes, p_now, coalesce(p_privacy_version, 'v1'))
      returning id into v_id;
      exit;
    exception when unique_violation then
      v_id := null;
    end;
  end loop;

  if v_id is null then
    raise exception 'could not generate booking reference';
  end if;

  return jsonb_build_object(
    'ok', true,
    'id', v_id,
    'reference', v_ref,
    'day', p_day,
    'time', to_char(p_time, 'HH24:MI'),
    'service', v_service,
    'party_size', p_party_size,
    'starts_at', v_starts,
    'remaining', v_capacity - v_booked - p_party_size
  );
end $$;

-- ---------------------------------------------------------------------
-- Cancelar reserva (cliente con enlace firmado, o restaurante).
-- ---------------------------------------------------------------------
create or replace function public.cancel_booking(
  p_id uuid,
  p_by text default 'cliente',
  p_now timestamptz default now()
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  b public.bookings;
begin
  if p_by not in ('cliente', 'restaurante') then
    raise exception 'invalid canceller';
  end if;
  select * into b from public.bookings where id = p_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if b.status = 'cancelada' then
    return jsonb_build_object('ok', false, 'error', 'already_cancelled', 'reference', b.reference);
  end if;
  if p_by = 'cliente' and b.starts_at <= p_now then
    return jsonb_build_object('ok', false, 'error', 'past', 'reference', b.reference);
  end if;
  update public.bookings
     set status = 'cancelada', cancelled_at = p_now, cancelled_by = p_by
   where id = p_id;
  return jsonb_build_object('ok', true, 'reference', b.reference, 'day', b.day,
                            'time', to_char(b.booking_time, 'HH24:MI'), 'service', b.service,
                            'party_size', b.party_size, 'email', b.email, 'name', b.name);
end $$;

-- Cancelación desde el panel: solo admins.
create or replace function public.admin_cancel_booking(p_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return public.cancel_booking(p_id, 'restaurante');
end $$;

-- ---------------------------------------------------------------------
-- Límite de peticiones por clave (ventana fija). true = permitido.
-- ---------------------------------------------------------------------
create or replace function public.hit_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  insert into public.rate_limits as r (key, window_start, hits)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning hits into v_hits;
  if random() < 0.02 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;
  return v_hits <= p_max;
end $$;
