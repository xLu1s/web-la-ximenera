-- Guardar el horario semanal completo en una sola transacción (solo admins).
create or replace function public.admin_set_opening_hours(p_rows jsonb)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows must be an array' using errcode = '22023';
  end if;
  delete from public.opening_hours where true;
  insert into public.opening_hours (weekday, service, opens, closes, capacity)
  select x.weekday, x.service, x.opens, x.closes, x.capacity
  from jsonb_to_recordset(p_rows) as x(weekday smallint, service text, opens time, closes time, capacity integer);
end $$;

revoke execute on function public.admin_set_opening_hours(jsonb) from public, anon;
grant execute on function public.admin_set_opening_hours(jsonb) to authenticated, service_role;
