-- Extras are catalog ingredients the household adds to a week by hand (wine,
-- dish soap, paper towels) that no recipe asked for. They live in plan_items
-- like any other row so checked/share/RLS behavior comes for free; save_plan
-- never deletes rows, so they survive regenerating the week.
alter table public.plan_items add column extra boolean not null default false;

-- The shared list ships extras too, flagged so the page can render them.
create or replace function public.shared_plan(p_token uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'plan_id', p.id,
    'week_start', p.week_start,
    'budget_cents', p.budget_cents,
    'lang', coalesce(pr.lang, 'en'),
    'units', coalesce(pr.units, 'imperial'),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'ingredient_id', i.ingredient_id,
        'checked', i.checked,
        'have', i.have,
        'have_qty', i.have_qty,
        'extra', i.extra))
      from public.plan_items i
      where i.plan_id = p.id
        and (i.extra or exists (
          select 1 from public.plan_meals pm
          join public.recipe_ingredients ri on ri.recipe_slug = pm.recipe_slug
          where pm.plan_id = p.id and ri.ingredient_id = i.ingredient_id and not pm.leftover
        ))), '[]'::jsonb),
    'meals', coalesce((
      select jsonb_agg(jsonb_build_object(
        'day', m.day, 'slot', m.slot, 'slug', m.recipe_slug, 'servings', m.servings,
        'leftover', m.leftover))
      from public.plan_meals m where m.plan_id = p.id), '[]'::jsonb)
  )
  from public.plan_shares s
  join public.plans p on p.id = s.plan_id
  left join public.profiles pr on pr.id = p.user_id
  where s.token = p_token and public.share_accessible(p.id);
$$;

-- A shared shopper can tick extras the same way they tick cart lines.
create or replace function public.check_shared_item(p_token uuid, p_ingredient_id text, p_checked boolean)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_plan uuid;
begin
  select s.plan_id into v_plan
  from public.plan_shares s
  where s.token = p_token and public.share_accessible(s.plan_id);
  if v_plan is null then
    raise exception 'invalid share link';
  end if;
  if not public.share_editable(v_plan) then
    raise exception 'list is locked';
  end if;
  if not exists (
    select 1
    from public.plan_meals m
    join public.recipe_ingredients ri on ri.recipe_slug = m.recipe_slug
    where m.plan_id = v_plan and ri.ingredient_id = p_ingredient_id and not m.leftover
  ) and not exists (
    select 1 from public.plan_items x
    where x.plan_id = v_plan and x.ingredient_id = p_ingredient_id and x.extra
  ) then
    raise exception 'ingredient not on this list';
  end if;
  insert into public.plan_items (plan_id, ingredient_id, checked)
  values (v_plan, p_ingredient_id, p_checked)
  on conflict (plan_id, ingredient_id) do update set checked = excluded.checked;
end;
$$;
