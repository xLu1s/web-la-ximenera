-- «Orden» en el panel: 1, 2, 3… (antes 10, 20, 30).
-- 1) Renumera cada lista a 1..N conservando el orden actual (empates: por nombre/fecha/id, estable).
-- 2) Los elementos nuevos sin orden (o con orden < 1) van al final de su lista: max + 1.

create or replace function public.renumber_sort_orders() returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.menu_categories t set sort_order = r.n
    from (select id, row_number() over (order by sort_order, id) as n from public.menu_categories) r
    where t.id = r.id and t.sort_order <> r.n;
  update public.menu_items t set sort_order = r.n
    from (select id, row_number() over (partition by category_id order by sort_order, id) as n from public.menu_items) r
    where t.id = r.id and t.sort_order <> r.n;
  update public.wines t set sort_order = r.n
    from (select id, row_number() over (partition by wine_type order by sort_order, name, id) as n from public.wines) r
    where t.id = r.id and t.sort_order <> r.n;
  update public.special_menus t set sort_order = r.n
    from (select id, row_number() over (partition by kind order by sort_order, starts_on nulls first, id) as n from public.special_menus) r
    where t.id = r.id and t.sort_order <> r.n;
  update public.gallery_items t set sort_order = r.n
    from (select id, row_number() over (order by sort_order, id) as n from public.gallery_items) r
    where t.id = r.id and t.sort_order <> r.n;
end $$;
revoke all on function public.renumber_sort_orders() from public, anon, authenticated;
grant execute on function public.renumber_sort_orders() to service_role;

create or replace function public.next_sort_order() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.sort_order is not null and new.sort_order >= 1 then return new; end if;
  if tg_op = 'UPDATE' then new.sort_order := old.sort_order; return new; end if;
  case tg_table_name
    when 'menu_categories' then select coalesce(max(sort_order), 0) + 1 into new.sort_order from public.menu_categories;
    when 'menu_items' then select coalesce(max(sort_order), 0) + 1 into new.sort_order from public.menu_items where category_id = new.category_id;
    when 'wines' then select coalesce(max(sort_order), 0) + 1 into new.sort_order from public.wines where wine_type = new.wine_type;
    when 'special_menus' then select coalesce(max(sort_order), 0) + 1 into new.sort_order from public.special_menus where kind = new.kind;
    when 'gallery_items' then select coalesce(max(sort_order), 0) + 1 into new.sort_order from public.gallery_items;
  end case;
  return new;
end $$;

do $$ declare t text; begin
  foreach t in array array['menu_categories', 'menu_items', 'wines', 'special_menus', 'gallery_items'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_next_sort_order', t);
    execute format('create trigger %I before insert or update of sort_order on public.%I for each row execute function public.next_sort_order()', t || '_next_sort_order', t);
  end loop;
end $$;

select public.renumber_sort_orders();
